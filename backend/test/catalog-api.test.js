import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { once } from 'node:events';
import pg from 'pg';
import { createApp } from '../src/app.js';
import { cardFields } from '../src/services/tasks.js';

test('Public catalog pagination on PostgreSQL', async t => {
  const schema = `catalog_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  let db, server;
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    db = new pg.Pool({ connectionString: process.env.DATABASE_URL, options: `-c search_path=${schema},public` });
    const directory = new URL('../db/migrations/', import.meta.url);
    for (const file of (await readdir(directory)).filter(f => f.endsWith('.sql')).sort()) {
      await db.query(await readFile(new URL(file, directory), 'utf8'));
    }
    server = createApp({ db, demoAuthEnabled: false }).listen(0,'127.0.0.1');
    await once(server,'listening');
    const base = `http://127.0.0.1:${server.address().port}/api/tasks`;
    const get = async (query = '') => {
      const response = await fetch(`${base}${query}`);
      return { status:response.status, body:await response.json() };
    };
    await t.test('empty public catalog works without identity', async () => {
      const {status,body} = await get();
      assert.equal(status,200);
      assert.deepEqual(body.items,[]);
      assert.equal(body.total,0);
      assert.equal(body.total_pages,0);
      assert.equal(body.page,1);
      assert.equal(body.page_size,12);
    });
    const owner = randomUUID();
    await db.query("INSERT INTO users(id,name,role) VALUES ($1,'Owner','business')",[owner]);
    let firstTask;
    for (let i = 0; i < 26; i++) {
      const id = randomUUID();
      if (!i) firstTask = id;
      await db.query("INSERT INTO tasks(id,owner_id,original_description) VALUES ($1,$2,'Private source')",[id,owner]);
      const card = Object.fromEntries(cardFields.map(field => [field,i === 24 ? '' : 'Confirmed content']));
      card.title = `Task ${i}`;
      card.industry = i % 2 ? 'B' : 'A';
      const {rows:[revision]} = await db.query('INSERT INTO task_revisions(task_id,confirmed_by,card) VALUES ($1,$2,$3) RETURNING id',[id,owner,card]);
      // The last confirmed card is deliberately not published.
      if (i < 25) await db.query("UPDATE tasks SET published_revision_id=$2,published_at='2026-01-01' WHERE id=$1",[id,revision.id]);
    }
    await db.query("UPDATE tasks SET title='UNCONFIRMED SECRET',industry='Private theme' WHERE id=$1",[firstTask]);
    await t.test('25 published tasks yield 12/12/1 cards with stable order and no duplicates', async () => {
      const pages = [];
      for (let page = 1; page <= 3; page++) {
        const {status,body} = await get(`?page=${page}`);
        assert.equal(status,200);
        assert.equal(body.total,25);
        assert.equal(body.total_pages,3);
        assert.equal(body.items.length,page === 3 ? 1 : 12);
        pages.push(body);
      }
      const cards = pages.flatMap(page => page.items);
      assert.equal(new Set(cards.map(card => card.id)).size,25);
      assert.equal(cards.at(-1).score,0);
      assert.equal(cards.at(-1).readiness_level,'draft');
      const ids = cards.slice(0,24).map(card => card.id);
      assert.deepEqual(ids,[...ids].sort());
      assert.deepEqual((await get('?page=1')).body.items,pages[0].items);
      assert.ok(!JSON.stringify(cards).includes('UNCONFIRMED SECRET'));
      assert.ok(!JSON.stringify(cards).includes('Private source'));
      assert.deepEqual(pages[0].industries,['A','B']);
      assert.equal((await get('?page=999')).body.page,3);
    });
    await t.test('public detail exposes only published snapshots', async () => {
      const detail = await get(`/${firstTask}/published`);
      assert.equal(detail.status,200);
      assert.equal(detail.body.task.card.title,'Task 0');
      assert.equal(detail.body.task.score,100);
      assert.ok(!JSON.stringify(detail.body).includes('UNCONFIRMED SECRET'));
      const {rows:[draft]} = await db.query('SELECT id FROM tasks WHERE published_revision_id IS NULL');
      assert.equal((await get(`/${draft.id}/published`)).status,404);
      assert.equal((await get(`/${randomUUID()}/published`)).status,404);
      assert.equal((await get('/bad/published')).status,400);
    });
    await t.test('filters apply before count and pagination, including zero-rated tasks', async () => {
      const industry = (await get('?industry=A')).body;
      assert.equal(industry.total,13);
      assert.equal(industry.total_pages,2);
      assert.ok(industry.items.every(card => card.industry === 'A'));
      const draft = (await get('?industry=A&readiness_level=draft')).body;
      assert.equal(draft.total,1);
      assert.equal(draft.items[0].score,0);
      assert.equal((await get('?industry=Unknown')).body.total,0);
      assert.equal((await get('?industry=A&readiness_level=priority')).body.total,12);
      assert.equal((await get('?industry=%27%20OR%201%3D1--')).body.total,0);
    });
    await t.test('query validation rejects malformed pages and filters', async () => {
      for (const query of ['?page=0','?page=-1','?page=1.5','?page=abc','?page=1000001','?page=1&page=2','?page_size=100','?readiness_level=bad','?industry=A&industry=B']) {
        assert.equal((await get(query)).status,400,query);
      }
    });
  } finally {
    if (server) await new Promise(resolve => server.close(resolve));
    if (db) await db.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  }
});
