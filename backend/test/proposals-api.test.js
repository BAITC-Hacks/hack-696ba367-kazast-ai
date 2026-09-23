import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { once } from 'node:events';
import pg from 'pg';
import { createApp } from '../src/app.js';

test('Proposals and manual selection API', async t => {
  assert.ok(process.env.DATABASE_URL);
  const schema = `proposal_test_${randomUUID().replaceAll('-','')}`;
  const admin = new pg.Pool({connectionString:process.env.DATABASE_URL});
  let db,server;
  try {
    await admin.query(`CREATE SCHEMA ${schema}`);
    db = new pg.Pool({connectionString:process.env.DATABASE_URL,options:`-c search_path=${schema},public`});
    const dir = new URL('../db/migrations/',import.meta.url);
    for (const file of (await readdir(dir)).filter(f => f.endsWith('.sql')).sort()) await db.query(await readFile(new URL(file,dir),'utf8'));
    const owner=randomUUID(), other=randomUUID(), student=randomUUID(), teammate=randomUUID(), stranger=randomUUID();
    const team=randomUUID(), team2=randomUUID();
    await db.query("INSERT INTO users(id,name,role) VALUES ($1,'Owner','business'),($2,'Other','business'),($3,'Student','student'),($4,'Teammate','student'),($5,'Stranger','student')",[owner,other,student,teammate,stranger]);
    await db.query("INSERT INTO teams(id,name) VALUES ($1,'Team'),($2,'Second')",[team,team2]);
    await db.query('INSERT INTO team_members(team_id,user_id) VALUES ($1,$3),($1,$4),($2,$5)',[team,team2,student,teammate,stranger]);
    server=createApp({db,demoAuthEnabled:true}).listen(0,'127.0.0.1');
    await once(server,'listening');
    const base=`http://127.0.0.1:${server.address().port}/api`;
    const request=async (method,path,body,user=student) => {
      const res=await fetch(base+path,{method,headers:{'Content-Type':'application/json',...(user?{'X-User-Id':user}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
      return {status:res.status,data:await res.json()};
    };
    const created=await request('POST','/tasks',{original_description:'Test task',title:'Published test'},owner);
    const task=created.data.task.id;
    const draft=(await request('POST','/tasks',{original_description:'Private'},owner)).data.task.id;
    await request('POST',`/tasks/${task}/confirm`,{expected_version:1},owner);
    await request('POST',`/tasks/${task}/publish`,{expected_version:1},owner);
    const payload={team_id:team,idea:' Идея ',plan:'План работ',timeline:'Две недели',prototype_url:'https://example.com/prototype'};
    let proposal;
    await t.test('membership and published state checked on submission',async()=>{
      assert.equal((await request('POST',`/tasks/${task}/proposals`,payload,null)).status,401);
      assert.equal((await request('POST',`/tasks/${task}/proposals`,payload,owner)).status,403);
      assert.equal((await request('POST',`/tasks/${task}/proposals`,payload,stranger)).status,403);
      assert.equal((await request('POST',`/tasks/${draft}/proposals`,payload)).data.error.code,'TASK_NOT_PUBLISHED');
      assert.equal((await request('POST',`/tasks/${randomUUID()}/proposals`,payload)).status,404);
      assert.equal((await request('POST','/tasks/bad/proposals',payload)).status,400);
    });
    await t.test('validation prevents spoofed decisions and invalid links',async()=>{
      for (const body of [null,[],{}, {...payload,idea:' '},{...payload,plan:7},{...payload,timeline:'x'.repeat(1001)},
        {...payload,status:'accepted'},{...payload,decided_by:owner},{...payload,team_id:'bad'},
        {...payload,prototype_url:'javascript:alert(1)'},{...payload,prototype_url:'https://user:pass@example.com'},
        {...payload,prototype_url:5}]) assert.equal((await request('POST',`/tasks/${task}/proposals`,body)).status,400);
    });
    await t.test('student submits and team members see their proposals only',async()=>{
      const res=await request('POST',`/tasks/${task}/proposals`,payload);
      assert.equal(res.status,201);
      proposal=res.data.proposal;
      assert.equal(proposal.idea,'Идея');
      assert.equal(proposal.status,'pending');
      assert.equal(proposal.decided_by,null);
      const mine=await request('GET','/proposals/mine');
      assert.equal(mine.data.items.length,1);
      assert.equal(mine.data.items[0].task_title,'Published test');
      assert.equal((await request('GET','/proposals/mine',undefined,teammate)).data.items.length,1);
      assert.equal((await request('GET','/proposals/mine',undefined,stranger)).data.items.length,0);
      const teams=await request('GET','/teams/mine');
      assert.equal(teams.data.items.length,1);
      assert.equal(teams.data.items[0].id,team);
      assert.equal((await request('GET','/teams/mine',undefined,owner)).status,403);
    });
    await t.test('only owner can inspect or decide; multiple teams can be selected',async()=>{
      assert.equal((await request('GET',`/tasks/${task}/proposals`)).status,403);
      assert.equal((await request('GET',`/tasks/${task}/proposals`,undefined,other)).status,403);
      const list=await request('GET',`/tasks/${task}/proposals`,undefined,owner);
      assert.equal(list.data.items[0].team_name,'Team');
      const path=`/proposals/${proposal.id}/status`;
      assert.equal((await request('PATCH',path,{status:'accepted'})).status,403);
      assert.equal((await request('PATCH',path,{status:'accepted'},other)).status,403);
      assert.equal((await request('PATCH',path,{status:'pending'},owner)).status,400);
      assert.equal((await request('PATCH',path,{status:'accepted',decided_by:other},owner)).status,400);
      assert.equal((await request('PATCH',`/proposals/${randomUUID()}/status`,{status:'accepted'},owner)).status,404);
      const accepted=await request('PATCH',path,{status:'accepted'},owner);
      assert.equal(accepted.status,200);
      assert.equal(accepted.data.proposal.decided_by,owner);
      const repeat=await request('PATCH',path,{status:'accepted'},owner);
      assert.equal(repeat.data.proposal.decided_at,accepted.data.proposal.decided_at);
      assert.equal((await request('PATCH',path,{status:'rejected'},owner)).status,409);
      const second=await request('POST',`/tasks/${task}/proposals`,{...payload,team_id:team2,prototype_url:null},stranger);
      assert.equal(second.status,201);
      assert.equal((await request('PATCH',`/proposals/${second.data.proposal.id}/status`,{status:'accepted'},owner)).status,200);
      const final=await request('GET',`/tasks/${task}/proposals`,undefined,owner);
      assert.equal(final.data.items.filter(p=>p.status==='accepted').length,2);
    });
    await t.test('repeated proposals allowed and competing decisions do not overwrite',async()=>{
      const another=await request('POST',`/tasks/${task}/proposals`,{...payload,prototype_url:''});
      assert.equal(another.status,201);
      const id=another.data.proposal.id;
      const results=await Promise.all(['accepted','rejected'].map(status=>request('PATCH',`/proposals/${id}/status`,{status},owner)));
      assert.deepEqual(results.map(r=>r.status).sort(),[200,409]);
      const reject=await request('POST',`/tasks/${task}/proposals`,{...payload,prototype_url:undefined});
      const rejected=await request('PATCH',`/proposals/${reject.data.proposal.id}/status`,{status:'rejected'},owner);
      assert.equal(rejected.data.proposal.status,'rejected');
      assert.equal((await request('GET','/proposals/mine')).data.items.length,3);
    });
  } finally {
    if(server) await new Promise(resolve=>server.close(resolve));
    if(db) await db.end();
    await admin.query(`DROP SCHEMA IF EXISTS ${schema} CASCADE`);
    await admin.end();
  }
});
