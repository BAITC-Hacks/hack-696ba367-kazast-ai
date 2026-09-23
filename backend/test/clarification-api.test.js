import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile,readdir } from 'node:fs/promises';
import { once } from 'node:events';
import pg from 'pg';
import { createApp } from '../src/app.js';
import { createClarificationAi, validateAiResult } from '../src/services/clarification-ai.js';

test('AI adapter rejects malformed, refused and incomplete outputs without fallback',async()=>{
  for(const output of [null,{}, {questions:[]},{questions:[{field:'title',question:'a'},{field:'title',question:'b'},{field:'need',question:'c'}]},{card:{title:'Invented'}}]) {
    assert.throws(()=>validateAiResult(output?.card?'card':'questions',output),e=>e.code==='AI_INVALID_RESPONSE');
  }
  for(const response of [{status:'incomplete',output_text:'{}'},{status:'completed',output_text:'not json'},{status:'completed',output_text:''}]) {
    const ai=createClarificationAi({mode:'openai',client:{responses:{create:async()=>response}}});
    await assert.rejects(ai.generate('questions',{task:{}}),e=>e.code==='AI_INVALID_RESPONSE');
  }
  const ai=createClarificationAi({mode:'openai',client:{responses:{create:async()=>{throw new Error('Secret upstream error');}}}});
  await assert.rejects(ai.generate('questions',{task:{}}),e=>e.code==='AI_UNAVAILABLE' && !e.message.includes('Secret'));
});

test('Clarification workflow stores answers, isolates owners and preserves confirmed publications',async()=>{
  const schema=`clarify_${randomUUID().replaceAll('-','')}`,admin=new pg.Pool({connectionString:process.env.DATABASE_URL});
  let db,server;
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    db=new pg.Pool({connectionString:process.env.DATABASE_URL,options:`-c search_path=${schema},public`});
    const dir=new URL('../db/migrations/',import.meta.url);
    for(const f of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort()) await db.query(await readFile(new URL(f,dir),'utf8'));
    const owner=randomUUID(),other=randomUUID(),student=randomUUID();
    await db.query("INSERT INTO users(id,name,role) VALUES ($1,'Owner','business'),($2,'Other','business'),($3,'Student','student')",[owner,other,student]);
    const local=createClarificationAi({mode:'local'});
    let effect=null;
    const ai={mode:'local',generate:async(kind,input)=>{if(effect) await effect();return local.generate(kind,input);}};
    server=createApp({db,demoAuthEnabled:true,clarificationAi:ai}).listen(0,'127.0.0.1');await once(server,'listening');
    const request=async(method,path,body,user=owner)=>{
      const r=await fetch(`http://127.0.0.1:${server.address().port}/api${path}`,{method,headers:{'Content-Type':'application/json',...(user?{'X-User-Id':user}:{})},...(body?{body:JSON.stringify(body)}:{})});
      return {status:r.status,body:await r.json()};
    };
    let state=(await request('POST','/tasks',{original_description:'Синтетический тест: заявки теряются',title:'Заявки'})).body;
    const path=`/tasks/${state.task.id}`,route=kind=>`${path}/clarification/${kind}`;
    const body=()=>({expected_version:state.task.version,session_id:state.clarification?.id});
    for(const [user,status] of [[null,401],[student,403],[other,403]]) assert.equal((await request('POST',route('questions'),{expected_version:1},user)).status,status);
    assert.equal((await request('POST',route('questions'),{expected_version:1,score:100})).status,400);
    let result=await request('POST',route('questions'),{expected_version:1});assert.equal(result.status,200);state=result.body;
    assert.equal(state.clarification.questions.length,8);assert.equal(state.clarification.mode,'local');
    assert.equal((await request('POST',route('card'),body())).status,400);
    const question=state.clarification.questions[0];
    assert.equal((await request('PATCH',route('answers'),{...body(),answers:[{id:randomUUID(),answer:'No'}]})).status,400);
    result=await request('PATCH',route('answers'),{...body(),answers:[{id:question.id,answer:'Торговля'}]});assert.equal(result.status,200);state=result.body;
    assert.equal((await request('GET',path)).body.clarification.questions[0].answer,'Торговля');
    result=await request('POST',route('card'),body());assert.equal(result.status,200);state=result.body;
    assert.equal(state.clarification.suggested_card[question.field],'Торговля');
    assert.equal(state.task[question.field],'');assert.equal(state.confirmation,null);assert.equal(state.task.published_revision_id,null);
    const suggestion=state.clarification.suggested_card;
    state=(await request('PATCH',path,{...suggestion,expected_version:state.task.version})).body;
    assert.equal((await request('POST',route('card'),{expected_version:state.task.version,session_id:result.body.clarification.id})).status,409);
    state=(await request('POST',`${path}/confirm`,{expected_version:state.task.version})).body;
    state=(await request('POST',`${path}/publish`,{expected_version:state.task.version})).body;
    const revision=state.task.published_revision_id;
    state=(await request('POST',route('questions'),{expected_version:state.task.version})).body;
    assert.equal(state.task.published_revision_id,revision);
    assert.equal((await request('GET',`${path}/published`,undefined,null)).body.task.card.title,'Заявки');
    const version=state.task.version;
    effect=()=>db.query("UPDATE tasks SET title='Concurrent edit' WHERE id=$1",[state.task.id]);
    assert.equal((await request('POST',route('questions'),{expected_version:version})).status,409);
    effect=null;
    assert.equal((await db.query('SELECT count(*)::int AS n FROM clarification_sessions')).rows[0].n,2);
    assert.equal((await db.query('SELECT answer FROM clarification_questions WHERE id=$1',[question.id])).rows[0].answer,'Торговля');
  } finally {
    if(server) await new Promise(r=>server.close(r));if(db) await db.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();
  }
});
