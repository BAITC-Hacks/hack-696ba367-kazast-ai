export async function latestClarification(db, taskId) {
  const {rows:[session]}=await db.query('SELECT * FROM clarification_sessions WHERE task_id=$1 ORDER BY created_at DESC,id DESC LIMIT 1',[taskId]);
  if(!session) return null;
  const {rows:questions}=await db.query('SELECT id,position,field,question,answer FROM clarification_questions WHERE session_id=$1 ORDER BY position',[session.id]);
  return {...session,questions};
}
