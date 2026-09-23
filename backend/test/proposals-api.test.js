import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { once } from 'node:events';
import pg from 'pg';
import { createApp } from '../src/app.js';
import { cardFields } from '../src/services/tasks.js';

test('Proposal flow on PostgreSQL', async t => {
  const schema = `proposals_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  let db, server, has_schema = false;
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    has_schema = true;
    db = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema},public` });
    const directory = new URL('../db/migrations/', import.meta.url);
    for (const file of (await readdir(directory)).filter(f => f.endsWith('.sql')).sort()) {
      await db.query(await readFile(new URL(file, directory), 'utf8'));
    }
    server = createApp({ db, demoAuthEnabled: true }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const owner = randomUUID(), stranger = randomUUID(), student = randomUUID(), other_student = randomUUID();
    const no_team = randomUUID(), team = randomUUID(), other_team = randomUUID(), task = randomUUID(), draft = randomUUID();
    await db.query(`INSERT INTO users(id,name,role) VALUES ($1,'Owner','business'),($2,'Stranger','business'),
      ($3,'Student','student'),($4,'Other student','student'),($5,'No team','student')`, [owner, stranger, student, other_student, no_team]);
    await db.query("INSERT INTO teams(id,name) VALUES ($1,'One'),($2,'Two')", [team, other_team]);
    await db.query('INSERT INTO team_members(team_id,user_id) VALUES ($1,$2),($3,$4)', [team, student, other_team, other_student]);
    await db.query("INSERT INTO tasks(id,owner_id,original_description) VALUES ($1,$3,'Published'),($2,$3,'Draft')", [task, draft, owner]);
    const card = Object.fromEntries(cardFields.map(key => [key, key === 'title' ? 'Task' : '']));
    const { rows: [revision] } = await db.query('INSERT INTO task_revisions(task_id,confirmed_by,card) VALUES ($1,$2,$3) RETURNING id', [task, owner, card]);
    await db.query('UPDATE tasks SET published_revision_id=$2,published_at=now() WHERE id=$1', [task, revision.id]);
    const request = async (path, user = student, method = 'GET', body) => {
      const response = await fetch(`${base}${path}`, { method,
        headers: { 'Content-Type': 'application/json', ...(user ? { 'X-User-Id': user } : {}) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      });
      return { status: response.status, body: await response.json() };
    };
    const fields = { idea: "Idea with ' quotes", plan: 'Plan', timeline: '3 weeks', prototype_url: 'https://example.com/prototype' };
    const create = (id = task, user = student, body = fields) => request(`/tasks/${id}/proposals`, user, 'POST', body);
    const decide = (id, status, user = owner) => request(`/proposals/${id}/status`, user, 'PATCH', { status });
    let first, second;
    await t.test('student creates pending proposal for published zero-score task', async () => {
      const result = await create();
      assert.equal(result.status, 201);
      first = result.body.proposal;
      assert.equal(first.status, 'pending');
      assert.equal(first.team_id, team);
      assert.equal(first.idea, fields.idea);
      assert.equal(first.decided_by, null);
      assert.equal(first.decided_at, null);
      const { rows: [saved] } = await db.query('SELECT * FROM proposals WHERE id=$1', [first.id]);
      assert.equal(saved.status, 'pending');
    });
    await t.test('owner sees all proposals, including repeated proposals from one team', async () => {
      second = (await create(task, other_student)).body.proposal;
      assert.equal((await create()).status, 201);
      const result = await request(`/tasks/${task}/proposals`, owner);
      assert.equal(result.status, 200);
      assert.equal(result.body.proposals.length, 3);
      assert.ok(result.body.proposals.every(p => p.status === 'pending' && p.team_name));
      assert.deepEqual((await request(`/tasks/${draft}/proposals`, owner)).body.proposals, []);
    });
    await t.test('only owner business may list or decide, student cannot manage tasks', async () => {
      for (const user of [stranger, student]) {
        assert.equal((await request(`/tasks/${task}/proposals`, user)).status, 403);
        for (const status of ['accepted', 'rejected']) assert.equal((await decide(first.id, status, user)).status, 403);
      }
      assert.equal((await request(`/tasks/${task}`, student)).status, 403);
      assert.equal((await create(task, owner)).status, 403);
      assert.equal((await create(task, null)).status, 401);
    });
    await t.test('accepted, rejected and multiple accepted remain independent', async () => {
      const accepted = await decide(first.id, 'accepted');
      assert.equal(accepted.status, 200);
      assert.equal(accepted.body.proposal.status, 'accepted');
      assert.equal(accepted.body.proposal.decided_by, owner);
      assert.ok(accepted.body.proposal.decided_at);
      const rejected = await decide(second.id, 'rejected');
      assert.equal(rejected.status, 200);
      assert.equal(rejected.body.proposal.status, 'rejected');
      assert.equal((await decide(second.id, 'accepted')).status, 200);
      const proposals = (await request(`/tasks/${task}/proposals`, owner)).body.proposals;
      assert.equal(proposals.filter(p => p.status === 'accepted').length, 2);
      assert.equal(proposals.filter(p => p.status === 'pending').length, 1);
    });
    await t.test('invalid status, UUID and nonexistent resources', async () => {
      for (const status of ['pending', 'invalid', null, 1]) assert.equal((await decide(first.id, status)).status, 400);
      assert.equal((await decide(randomUUID(), 'accepted')).status, 404);
      assert.equal((await decide('bad', 'accepted')).status, 400);
      assert.equal((await create(randomUUID())).status, 404);
      assert.equal((await request(`/tasks/${randomUUID()}/proposals`, owner)).status, 404);
      assert.equal((await create('bad')).status, 400);
      assert.equal((await create(draft)).status, 409);
    });
    await t.test('fields and team membership cannot be forged', async () => {
      for (const body of [null, [], {}, { ...fields, idea: ' ' }, { ...fields, timeline: 2 },
        { ...fields, prototype_url: 'javascript:alert(1)' }, { ...fields, prototype_url: 'https://a b' },
        { ...fields, plan: '\0' }, { ...fields, idea: 'a'.repeat(10001) },
        { ...fields, status: 'accepted' }, { ...fields, decided_by: owner }]) {
        assert.equal((await create(task, student, body)).status, 400);
      }
      assert.equal((await create(task, student, { ...fields, team_id: other_team })).status, 403);
      assert.equal((await create(task, no_team)).status, 403);
      assert.equal((await create(task, student, { ...fields, prototype_url: '' })).body.proposal.prototype_url, null);
    });
    await t.test('context uses demo user and membership; multiple teams require selection', async () => {
      const context = (await request(`/tasks/${task}/proposals/context`)).body;
      assert.equal(context.user.id, student);
      assert.deepEqual(context.teams, [{ id: team, name: 'One' }]);
      assert.equal(context.is_owner, false);
      assert.equal((await request(`/tasks/${task}/proposals/context`, owner)).body.is_owner, true);
      assert.equal((await request(`/tasks/${task}/proposals/context`, stranger)).body.is_owner, false);
      await db.query('INSERT INTO team_members(team_id,user_id) VALUES ($1,$2)', [other_team, student]);
      assert.equal((await create()).status, 400);
      assert.equal((await create(task, student, { ...fields, team_id: other_team })).status, 201);
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (db) await db.end();
    try {
      if (has_schema) await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    } finally { await admin.end(); }
  }
});
