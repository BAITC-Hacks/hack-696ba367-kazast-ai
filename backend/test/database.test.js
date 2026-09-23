import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { pool } from '../src/db/pool.js';

test('PostgreSQL: confirmation, catalog, decisions and progress', async () => {
  assert.ok(process.env.DATABASE_URL, 'Set DATABASE_URL to a migrated test database');
  const db = await pool.connect();
  const rejects = async (sql, params, pattern) => {
    await db.query('SAVEPOINT expected_error');
    await assert.rejects(db.query(sql, params), pattern);
    await db.query('ROLLBACK TO SAVEPOINT expected_error');
    await db.query('RELEASE SAVEPOINT expected_error');
  };
  try {
    await db.query('BEGIN');
    const owner = randomUUID(), stranger = randomUUID(), task = randomUUID(), otherTask = randomUUID();
    const team1 = randomUUID(), team2 = randomUUID(), revision = randomUUID();
    await db.query("INSERT INTO users(id,name,role) VALUES ($1,'Owner','business'),($2,'Other','business')", [owner,stranger]);
    await db.query("INSERT INTO teams(id,name) VALUES ($1,'One'),($2,'Two')", [team1,team2]);
    await db.query("INSERT INTO tasks(id,owner_id,original_description) VALUES ($1,$3,'Description'),($2,$3,'Other')", [task,otherTask,owner]);
    const proposalSql = "INSERT INTO proposals(task_id,team_id,idea,plan,timeline) VALUES ($1,$2,'Idea','Plan','Week') RETURNING id";
    await rejects(proposalSql, [task,team1], /published task/);
    const emptyCard = Object.fromEntries(['title','industry','context','need','users_description','data_materials','constraints_description','expected_result','success_criteria','contact','interaction_format','feedback_process'].map(k => [k,'']));
    emptyCard.title = 'Low readiness';
    const addRevision = 'INSERT INTO task_revisions(id,task_id,confirmed_by,card) VALUES ($1,$2,$3,$4)';
    await rejects(addRevision,[revision,task,stranger,emptyCard],/task owner/);
    await rejects(addRevision,[revision,task,owner,{title:'Missing fields'}],/must be a string/);
    await db.query(addRevision,[revision,task,owner,emptyCard]);
    await rejects('UPDATE task_revisions SET card=$2 WHERE id=$1',[revision,emptyCard],/immutable/);
    await rejects('UPDATE tasks SET published_revision_id=$2,published_at=now() WHERE id=$1',[otherTask,revision],/foreign key/);
    await db.query('UPDATE tasks SET published_revision_id=$2,published_at=now() WHERE id=$1',[task,revision]);
    let { rows: [catalog] } = await db.query('SELECT * FROM task_catalog WHERE id=$1',[task]);
    assert.equal(catalog.score,0);
    assert.equal(catalog.readiness_level,'draft');
    assert.equal(catalog.missing.length,7);
    // A zero-score public task accepts proposals, including multiple accepted teams.
    const { rows: [p1] } = await db.query(proposalSql,[task,team1]);
    const { rows: [p2] } = await db.query(proposalSql,[task,team2]);
    await rejects("UPDATE proposals SET status='accepted',decided_by=$2,decided_at=now() WHERE id=$1",[p1.id,stranger],/task owner/);
    await db.query("UPDATE proposals SET status='accepted',decided_by=$2,decided_at=now() WHERE task_id=$1",[task,owner]);
    const { rows: [accepted] } = await db.query("SELECT count(*)::int AS count FROM proposals WHERE task_id=$1 AND status='accepted'",[task]);
    assert.equal(accepted.count,2);
    await db.query("UPDATE tasks SET title='Unconfirmed edit',expected_result='Result' WHERE id=$1",[task]);
    ({ rows: [catalog] } = await db.query('SELECT * FROM task_catalog WHERE id=$1',[task]));
    assert.equal(catalog.card.title,'Low readiness');
    assert.equal(catalog.score,0);
    const fullCard = Object.fromEntries(Object.keys(emptyCard).map(k => [k,'Confirmed information']));
    const next = randomUUID();
    await db.query(addRevision,[next,task,owner,fullCard]);
    await db.query('UPDATE tasks SET published_revision_id=$2 WHERE id=$1',[task,next]);
    ({ rows: [catalog] } = await db.query('SELECT * FROM task_catalog WHERE id=$1',[task]));
    assert.equal(catalog.score,100);
    assert.equal(catalog.readiness_level,'priority');
    assert.equal(catalog.missing.length,0);
    const milestoneSql = "INSERT INTO progress_milestones(proposal_id,title,evidence,points,confirmed_by,confirmed_at) VALUES ($1,'Prototype','Demo link',10,$2,now())";
    await rejects(milestoneSql,[p1.id,stranger],/confirmation by task owner/);
    await db.query(milestoneSql,[p1.id,owner]);
    const { rows: [progress] } = await db.query('SELECT points FROM team_progress WHERE team_id=$1',[team1]);
    assert.equal(Number(progress.points),10);
    await db.query("UPDATE proposals SET status='rejected',decided_by=$2,decided_at=now() WHERE id=$1",[p2.id,owner]);
    await rejects(milestoneSql,[p2.id,owner],/accepted proposal/);
    // Verify rubric thresholds and trimming, independently of catalog state.
    for (const [card, score] of [[emptyCard,0],[{...emptyCard,context:'x',need:'x'},20],[{...fullCard,contact:'   '},90],[fullCard,100]]) {
      const { rows: [r] } = await db.query('SELECT readiness_score($1::jsonb) AS score',[card]);
      assert.equal(r.score,score);
    }
  } finally {
    await db.query('ROLLBACK');
    db.release();
    await pool.end();
  }
});
