import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { once } from 'node:events';
import pg from 'pg';
import { createApp } from '../src/app.js';
import { cardFields } from '../src/services/tasks.js';

test('Tasks API on isolated PostgreSQL schema', async t => {
  assert.ok(process.env.DATABASE_URL, 'DATABASE_URL is required');
  const schema = `api_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  let db, server;
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    db = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema},public` });
    const directory = new URL('../db/migrations/', import.meta.url);
    for (const file of (await readdir(directory)).filter(f => f.endsWith('.sql')).sort()) {
      await db.query(await readFile(new URL(file, directory), 'utf8'));
    }
    const owner = randomUUID(), other = randomUUID(), student = randomUUID();
    await db.query("INSERT INTO users(id,name,role) VALUES ($1,'Owner','business'),($2,'Other','business'),($3,'Student','student')", [owner,other,student]);
    server = createApp({ db, demoAuthEnabled: true }).listen(0, '127.0.0.1');
    await once(server, 'listening');
    const base = `http://127.0.0.1:${server.address().port}/api`;
    const request = async (method, path, body, user = owner) => {
      const response = await fetch(`${base}${path}`, { method,
        headers: { 'Content-Type': 'application/json', ...(user ? { 'X-User-Id': user } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      return { status: response.status, data: await response.json(), location: response.headers.get('location') };
    };
    let taskId, revisionId;
    await t.test('demo identity and role are required', async () => {
      for (const [user, status] of [[null,401],['bad',401],[randomUUID(),401],[student,403]]) {
        assert.equal((await request('POST','/tasks',{ original_description: 'Test' },user)).status,status);
      }
    });
    await t.test('validation rejects malformed and server-controlled fields', async () => {
      for (const body of [null, [], {}, {original_description:'  '}, {original_description:5},
        {original_description:'Test',owner_id:other}, {original_description:'Test',score:100},
        {original_description:'Test',title:'x'.repeat(301)}, {original_description:'\0'},
        JSON.parse('{"original_description":"Test","__proto__":"invalid"}')]) {
        assert.equal((await request('POST','/tasks',body)).status,400);
      }
      const malformed = await fetch(`${base}/tasks`, {method:'POST',headers:{'Content-Type':'application/json','X-User-Id':owner},body:'{'});
      assert.equal(malformed.status,400);
      assert.equal((await malformed.json()).error.code,'INVALID_JSON');
      const oversized = await request('POST','/tasks',{original_description:'x'.repeat(270000)});
      assert.equal(oversized.status,413);
    });
    await t.test('create, read and ownership checks', async () => {
      const result = await request('POST','/tasks',{original_description:'  Нужен учёт заявок.  '});
      assert.equal(result.status,201);
      taskId = result.data.task.id;
      assert.equal(result.location,`/api/tasks/${taskId}`);
      assert.equal(result.data.task.owner_id,owner);
      assert.equal(result.data.task.original_description,'Нужен учёт заявок.');
      assert.equal(result.data.task.version,1);
      assert.equal(result.data.confirmation,null);
      assert.equal(result.data.has_unconfirmed_changes,true);
      assert.equal((await request('GET',`/tasks/${taskId}`)).status,200);
      assert.equal((await request('GET','/tasks/bad')).status,400);
      assert.equal((await request('GET',`/tasks/${randomUUID()}`)).status,404);
      for (const [method,suffix,body] of [['GET','',undefined],['PATCH','',{expected_version:1,title:'No'}],['POST','/confirm',{expected_version:1}]]) {
        assert.equal((await request(method,`/tasks/${taskId}${suffix}`,body,other)).status,403);
      }
      assert.equal((await request('POST',`/tasks/${taskId}/confirm`,{expected_version:1})).status,400);
    });
    await t.test('partial edits preserve omitted fields; stale edits fail', async () => {
      assert.equal((await request('PATCH',`/tasks/${taskId}`,{title:'Missing version'})).status,400);
      assert.equal((await request('PATCH',`/tasks/${taskId}`,{expected_version:1})).status,400);
      const edited = await request('PATCH',`/tasks/${taskId}`,{expected_version:1,title:' Учёт заявок ',context:'Сейчас вручную',need:'Ускорить обработку'});
      assert.equal(edited.status,200);
      assert.equal(edited.data.task.version,2);
      assert.equal(edited.data.task.original_description,'Нужен учёт заявок.');
      assert.equal(edited.data.confirmation,null);
      const stale = await request('PATCH',`/tasks/${taskId}`,{expected_version:1,title:'Stale'});
      assert.equal(stale.status,409);
      assert.equal(stale.data.error.details.current_version,2);
      assert.equal((await request('POST',`/tasks/${taskId}/confirm`,{expected_version:1})).status,409);
    });
    await t.test('confirmation snapshots stored fields and calculates rating without publishing', async () => {
      assert.equal((await request('POST',`/tasks/${taskId}/confirm`,{expected_version:2,score:100})).status,400);
      const result = await request('POST',`/tasks/${taskId}/confirm`,{expected_version:2});
      assert.equal(result.status,201);
      revisionId = result.data.confirmation.id;
      assert.equal(result.data.confirmation.score,20);
      assert.equal(result.data.confirmation.breakdown.context_and_need,20);
      assert.equal(result.data.confirmation.readiness_level,'draft');
      assert.ok(result.data.confirmation.missing.includes('success_criteria'));
      assert.equal(result.data.has_unconfirmed_changes,false);
      assert.equal(result.data.task.published_revision_id,null);
      const repeat = await request('POST',`/tasks/${taskId}/confirm`,{expected_version:2});
      assert.equal(repeat.status,200);
      assert.equal(repeat.data.confirmation.id,revisionId);
      assert.equal((await db.query('SELECT * FROM task_catalog WHERE id=$1',[taskId])).rowCount,0);
    });
    await t.test('edits and confirmation do not replace the published snapshot', async () => {
      const publication = await request('POST',`/tasks/${taskId}/publish`,{expected_version:2});
      assert.equal(publication.status,200);
      assert.equal(publication.data.task.published_revision_id,revisionId);
      const full = Object.fromEntries(cardFields.map(key => [key,'Подтверждённые сведения']));
      const edited = await request('PATCH',`/tasks/${taskId}`,{expected_version:3,...full});
      assert.equal(edited.status,200);
      assert.equal(edited.data.has_unconfirmed_changes,true);
      assert.equal(edited.data.confirmation.score,20);
      const results = await Promise.all([1,2].map(() => request('POST',`/tasks/${taskId}/confirm`,{expected_version:4})));
      assert.deepEqual(results.map(r => r.status).sort(),[200,201]);
      assert.equal(results[0].data.confirmation.id,results[1].data.confirmation.id);
      assert.equal(results[0].data.confirmation.score,100);
      assert.equal(results[0].data.confirmation.readiness_level,'priority');
      assert.equal(results[0].data.has_unconfirmed_changes,false);
      const {rows:[published]} = await db.query('SELECT * FROM task_catalog WHERE id=$1',[taskId]);
      assert.equal(published.score,20);
      assert.equal(published.revision_id,revisionId);
      assert.equal((await db.query('SELECT * FROM task_revisions WHERE task_id=$1',[taskId])).rowCount,2);
    });
    await t.test('concurrent edits cannot silently overwrite each other', async () => {
      const results = await Promise.all(['First','Second'].map(title => request('PATCH',`/tasks/${taskId}`,{expected_version:4,title})));
      assert.deepEqual(results.map(r => r.status).sort(),[200,409]);
      const current = await request('GET',`/tasks/${taskId}`);
      assert.equal(current.data.task.version,5);
    });
    await t.test('a title-only card can be confirmed with zero readiness', async () => {
      const created = await request('POST','/tasks',{original_description:'Начальная идея',title:'Идея'});
      const confirmed = await request('POST',`/tasks/${created.data.task.id}/confirm`,{expected_version:1});
      assert.equal(confirmed.status,201);
      assert.equal(confirmed.data.confirmation.score,0);
      assert.equal(confirmed.data.confirmation.missing.length,7);
    });
    await t.test('publication requires owner, current version and confirmation; updates remain explicit', async () => {
      const created = await request('POST','/tasks',{original_description:'Publication test',title:'Initial card'});
      const id = created.data.task.id;
      const publish = (body, user = owner) => request('POST',`/tasks/${id}/publish`,body,user);
      assert.equal((await publish({expected_version:1},null)).status,401);
      assert.equal((await publish({expected_version:1},student)).status,403);
      assert.equal((await publish({expected_version:1},other)).status,403);
      for (const body of [{}, {expected_version:0}, {expected_version:'1'}, {expected_version:1,published_revision_id:revisionId}, {expected_version:1,title:'Injected'}]) {
        assert.equal((await publish(body)).status,400);
      }
      assert.equal((await publish({expected_version:1})).data.error.code,'CONFIRMATION_REQUIRED');
      assert.equal((await request('POST',`/tasks/${randomUUID()}/publish`,{expected_version:1})).status,404);
      assert.equal((await request('POST','/tasks/bad/publish',{expected_version:1})).status,400);
      await request('POST',`/tasks/${id}/confirm`,{expected_version:1});
      const concurrent = await Promise.all([publish({expected_version:1}),publish({expected_version:1})]);
      assert.deepEqual(concurrent.map(r => r.status).sort(),[200,409]);
      const published = concurrent.find(r => r.status === 200).data;
      assert.equal(published.task.version,2);
      assert.equal(published.confirmation.score,0);
      const first_revision = published.task.published_revision_id;
      const repeated = await publish({expected_version:2});
      assert.equal(repeated.status,200);
      assert.equal(repeated.data.task.version,2);
      assert.equal(repeated.data.task.published_at,published.task.published_at);
      let public_card = await request('GET',`/tasks/${id}/published`,undefined,null);
      assert.equal(public_card.status,200);
      assert.equal(public_card.data.task.card.title,'Initial card');
      const edited = await request('PATCH',`/tasks/${id}`,{expected_version:2,title:'Updated card',context:'Manual work',need:'Automation'});
      assert.equal(edited.data.task.version,3);
      assert.equal((await publish({expected_version:2})).data.error.code,'VERSION_CONFLICT');
      assert.equal((await publish({expected_version:3})).data.error.code,'UNCONFIRMED_CHANGES');
      await request('POST',`/tasks/${id}/confirm`,{expected_version:3});
      public_card = await request('GET',`/tasks/${id}/published`,undefined,null);
      assert.equal(public_card.data.task.card.title,'Initial card');
      const updated = await publish({expected_version:3});
      assert.equal(updated.status,200);
      assert.equal(updated.data.task.version,4);
      assert.notEqual(updated.data.task.published_revision_id,first_revision);
      public_card = await request('GET',`/tasks/${id}/published`,undefined,null);
      assert.equal(public_card.data.task.card.title,'Updated card');
      assert.equal(public_card.data.task.score,20);
      const catalog = await request('GET','/tasks',undefined,null);
      assert.equal(catalog.data.items.find(task => task.id === id).score,20);
      const {rows:[old_revision]} = await db.query('SELECT card FROM task_revisions WHERE id=$1',[first_revision]);
      assert.equal(old_revision.card.title,'Initial card');
    });
    await t.test('demo access is disabled unless explicitly enabled', async () => {
      const closed = createApp({db,demoAuthEnabled:false}).listen(0,'127.0.0.1');
      await once(closed,'listening');
      try {
        const response = await fetch(`http://127.0.0.1:${closed.address().port}/api/tasks/${taskId}`,{headers:{'X-User-Id':owner}});
        assert.equal(response.status,503);
        assert.equal((await response.json()).error.code,'AUTH_NOT_CONFIGURED');
      } finally { await new Promise(resolve => closed.close(resolve)); }
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (db) await db.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  }
});
