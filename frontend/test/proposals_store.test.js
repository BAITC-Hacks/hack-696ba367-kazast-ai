import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from 'vuex';
import { create_proposals_module } from '../src/store/modules/proposals.js';
const make = request => createStore({state:{tasks:{user_id:'owner'}},modules:{proposals:create_proposals_module(request)}});

test('submission selects student identity, preserves failures and clears successful draft',async()=>{
  let fail=true;
  const store=make(async(path,options)=>{
    assert.equal(options.user_id,'00000000-0000-4000-8000-020000000001');
    if(fail) throw {code:'VALIDATION_ERROR',message:'Invalid'};
    return {proposal:{id:'p',team_id:'t',task_id:'task',status:'pending'}};
  });
  store.commit('proposals/set_role','student');
  for(const [key,value] of Object.entries({team_id:'t',idea:'Idea',plan:'Plan',timeline:'Week'})) store.commit('proposals/set_field',{task_id:'task',key,value});
  await store.dispatch('proposals/submit','task');
  assert.equal(store.state.proposals.drafts.task.idea,'Idea');
  fail=false; await store.dispatch('proposals/submit','task');
  assert.equal(store.state.proposals.drafts.task.idea,'');
  assert.equal(store.state.proposals.items[0].status,'pending');
});

test('role switch discards old responses',async()=>{
  let resolve;
  const store=make(()=>new Promise(done=>resolve=done));
  const loading=store.dispatch('proposals/load',{task_id:'task',mode:'task'});
  store.commit('proposals/set_role','student');
  resolve({items:[{id:'private'}]}); await loading;
  assert.deepEqual(store.state.proposals.items,[]);
});

test('decision updates only selected proposal and retains team metadata',async()=>{
  const store=make(async(path,options)=>{
    assert.equal(options.user_id,'owner');
    return {proposal:{id:'p',status:'accepted'}};
  });
  store.commit('proposals/receive',{teams:[],items:[{id:'p',team_name:'Team',status:'pending'},{id:'q',status:'pending'}]});
  await store.dispatch('proposals/decide',{id:'p',status:'accepted'});
  assert.equal(store.state.proposals.items[0].team_name,'Team');
  assert.equal(store.state.proposals.items[0].status,'accepted');
  assert.equal(store.state.proposals.items[1].status,'pending');
});
