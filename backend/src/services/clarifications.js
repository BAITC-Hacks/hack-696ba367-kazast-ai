import { ApiError, cardFields, ownedTask, checkVersion, transaction, representation, latestConfirmation, validateUuid } from './tasks.js';
import { latestClarification } from './clarification-state.js';
import { createClarificationAi, validateAiResult } from './clarification-ai.js';

const inputTask = task => Object.fromEntries(['original_description',...cardFields].map(f=>[f,task[f]]));
const response = async (client,task) => ({...representation(task,await latestConfirmation(client,task.id)),clarification:await latestClarification(client,task.id)});
const bump = async (client,id) => (await client.query('UPDATE tasks SET updated_at=now() WHERE id=$1 RETURNING *',[id])).rows[0];
export function validateClarificationBody(body,kind) {
  const allowed=kind==='questions'?['expected_version']:['expected_version','session_id',...(kind==='answers'?['answers']:[])];
  if(!body || Array.isArray(body) || typeof body!=='object' || Object.keys(body).some(k=>!allowed.includes(k)) || !Number.isSafeInteger(body.expected_version) || body.expected_version<1) throw new ApiError(400,'VALIDATION_ERROR','Передайте expected_version и допустимые поля операции.');
  if(kind!=='questions') validateUuid(body.session_id);
  if(kind==='answers' && (!Array.isArray(body.answers) || body.answers.length<1 || body.answers.length>8 || new Set(body.answers.map(a=>a?.id)).size!==body.answers.length || body.answers.some(a=>!a || Object.keys(a).sort().join(',')!=='answer,id' || typeof a.id!=='string' || typeof a.answer!=='string' || a.answer.length>10000 || a.answer.includes('\0')))) throw new ApiError(400,'VALIDATION_ERROR','Передайте 1–8 ответов с уникальными id и текстом до 10000 символов.');
}
async function currentSession(client,task,body) {
  const session=await latestClarification(client,task.id);
  if(!session || session.id!==body.session_id || session.task_version!==task.version) throw new ApiError(409,'CLARIFICATION_STALE','Карточка изменилась. Сохраните её и получите новые вопросы. Предыдущие ответы остаются в истории.');
  return session;
}
export function clarificationService(db,ai=createClarificationAi()) {
  // No database lock is held during an external model request. Recheck the version before writing.
  const snapshot=(id,user,body,needsSession=false)=>transaction(db,async client=>{
    const task=await ownedTask(client,id,user);checkVersion(task,body.expected_version);
    return {task,session:needsSession?await currentSession(client,task,body):null};
  });
  return {
    async questions(id,user,body) {
      const {task}=await snapshot(id,user,body);
      const result=validateAiResult('questions',await ai.generate('questions',{task:inputTask(task)}));
      return transaction(db,async client=>{
        const current=await ownedTask(client,id,user);checkVersion(current,body.expected_version);
        const updated=await bump(client,id);
        const {rows:[session]}=await client.query('INSERT INTO clarification_sessions(task_id,task_version,mode,created_at) VALUES ($1,$2,$3,clock_timestamp()) RETURNING id',[id,updated.version,ai.mode]);
        for(const [i,q] of result.questions.entries()) await client.query('INSERT INTO clarification_questions(task_id,session_id,position,field,question) VALUES ($1,$2,$3,$4,$5)',[id,session.id,i+1,q.field,q.question]);
        return response(client,updated);
      });
    },
    answers(id,user,body) {
      return transaction(db,async client=>{
        const task=await ownedTask(client,id,user);checkVersion(task,body.expected_version);
        const session=await currentSession(client,task,body);
        for(const a of body.answers) {
          const question=session.questions.find(q=>q.id===a.id);
          if(!question) throw new ApiError(400,'VALIDATION_ERROR','Ответ относится к другому набору вопросов.');
          const limit={title:300,industry:200,contact:1000}[question.field] || 10000;
          if(a.answer.length>limit) throw new ApiError(400,'VALIDATION_ERROR',`Ответ для поля ${question.field}: максимум ${limit} символов.`);
          await client.query('UPDATE clarification_questions SET answer=$2 WHERE id=$1',[a.id,a.answer.trim()]);
        }
        const updated=await bump(client,id);
        await client.query('UPDATE clarification_sessions SET task_version=$2,suggested_card=NULL WHERE id=$1',[session.id,updated.version]);
        return response(client,updated);
      });
    },
    async card(id,user,body) {
      const {task,session}=await snapshot(id,user,body,true);
      if(!session.questions.some(q=>q.answer?.trim())) throw new ApiError(400,'ANSWERS_REQUIRED','Сначала сохраните хотя бы один ответ. Неизвестные сведения можно оставить пустыми.');
      const {card}=validateAiResult('card',await ai.generate('card',{task:inputTask(task),questions:session.questions.map(({field,question,answer})=>({field,question,answer}))}));
      return transaction(db,async client=>{
        const current=await ownedTask(client,id,user);checkVersion(current,body.expected_version);
        await currentSession(client,current,body);
        const updated=await bump(client,id);
        await client.query('UPDATE clarification_sessions SET suggested_card=$2,task_version=$3,mode=$4 WHERE id=$1',[session.id,card,updated.version,ai.mode]);
        return response(client,updated);
      });
    },
  };
}
