import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { once } from 'node:events';
import pg from 'pg';
import { createApp } from '../src/app.js';
import { cardFields } from '../src/services/tasks.js';

test('Business task list: access, pagination and snapshot state', async () => {
  const schema = `mine_test_${randomUUID().replaceAll('-', '')}`;
  const admin = new pg.Pool({connectionString:process.env.DATABASE_URL});
  let db,server;
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    db=new pg.Pool({connectionString:process.env.DATABASE_URL,options:`-c search_path=${schema},public`});
    const dir=new URL('../db/migrations/',import.meta.url);
    for(const file of (await readdir(dir)).filter(f=>f.endsWith('.sql')).sort()) await db.query(await readFile(new URL(file,dir),'utf8'));
    const owner=randomUUID(),other=randomUUID(),student=randomUUID();
    for(const [id,role] of [[owner,'business'],[other,'business'],[student,'student']]) await db.query('INSERT INTO users(id,name,role) VALUES ($1,$2,$3)',[id,role,role]);
    server=createApp({db,demoAuthEnabled:true}).listen(0,'127.0.0.1');
    await once(server,'listening');
    const get=async(query='',user=owner)=>{
      const res=await fetch(`http://127.0.0.1:${server.address().port}/api/tasks/mine${query}`,{headers:user?{'X-User-Id':user}:{}});
      return {status:res.status,body:await res.json()};
    };
    assert.equal((await get('',null)).status,401);
    assert.equal((await get('',student)).status,403);
    assert.equal((await get()).body.total,0);
    let published;
    for(let i=0;i<14;i++) {
      const {rows:[task]}=await db.query("INSERT INTO tasks(owner_id,original_description,title) VALUES ($1,'Source',$2) RETURNING *",[i===13?other:owner,`Task ${i}`]);
      if(i===0){
        published=task.id;
        const card=Object.fromEntries(cardFields.map(field=>[field,task[field]]));
        const {rows:[revision]}=await db.query('INSERT INTO task_revisions(task_id,confirmed_by,card) VALUES ($1,$2,$3) RETURNING id',[task.id,owner,card]);
        await db.query('UPDATE tasks SET published_revision_id=$2,published_at=now() WHERE id=$1',[task.id,revision.id]);
      }
    }
    const first=(await get()).body,second=(await get('?page=2')).body;
    assert.equal(first.total,13);assert.equal(first.items.length,12);assert.equal(first.total_pages,2);
    assert.equal(second.items.length,1);assert.equal(new Set([...first.items,...second.items].map(t=>t.id)).size,13);
    assert.equal((await get('?page=999')).body.page,2);
    assert.equal((await get('?status=draft')).body.total,12);
    assert.equal((await get('',other)).body.total,1);
    let item=(await get('?status=published')).body.items[0];
    assert.equal(item.id,published);assert.equal(item.has_unconfirmed_changes,false);assert.equal(item.has_unpublished_changes,false);
    assert.equal(item.published_score,0);
    await db.query("UPDATE tasks SET title='Changed' WHERE id=$1",[published]);
    const {rows:[team]}=await db.query("INSERT INTO teams(name) VALUES ('Team') RETURNING id");
    await db.query("INSERT INTO proposals(task_id,team_id,idea,plan,timeline) VALUES ($1,$2,'Idea','Plan','Week')",[published,team.id]);
    item=(await get('?status=published')).body.items[0];
    assert.equal(item.has_unconfirmed_changes,true);assert.equal(item.has_unpublished_changes,true);
    assert.equal(item.proposals_count,1);assert.equal(item.pending_proposals_count,1);
    for(const q of ['?page=0','?page=1.5','?page=1&page=2','?status=bad','?owner_id=x','?status=draft&status=published']) assert.equal((await get(q)).status,400,q);
  } finally {
    if(server) await new Promise(resolve=>server.close(resolve));
    if(db) await db.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);await admin.end();
  }
});
