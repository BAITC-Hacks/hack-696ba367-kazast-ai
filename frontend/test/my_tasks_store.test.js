import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from 'vuex';
import { create_my_tasks_module } from '../src/store/modules/my_tasks.js';
const make=request=>createStore({state:{tasks:{user_id:'owner'},proposals:{role:'business'}},modules:{my_tasks:create_my_tasks_module(request)}});
test('my tasks uses business identity and server pagination',async()=>{
  const store=make(async(path,options)=>{
    assert.equal(path,'/tasks/mine?page=2&status=draft');assert.equal(options.user_id,'owner');
    return {items:[{id:'task'}],page:2,total:13,total_pages:2};
  });
  await store.dispatch('my_tasks/load',{page:2,status:'draft'});
  assert.equal(store.state.my_tasks.items[0].id,'task');assert.equal(store.state.my_tasks.page,2);assert.equal(store.state.my_tasks.is_loading,false);
});
test('new request and reset discard stale private responses',async()=>{
  const pending=[];const store=make(()=>new Promise(resolve=>pending.push(resolve)));
  const first=store.dispatch('my_tasks/load'),second=store.dispatch('my_tasks/load');
  pending[1]({items:[{id:'new'}]});await second;
  pending[0]({items:[{id:'old'}]});await first;
  assert.equal(store.state.my_tasks.items[0].id,'new');
  const third=store.dispatch('my_tasks/load');store.commit('my_tasks/reset');
  pending[2]({items:[{id:'private'}]});await third;assert.deepEqual(store.state.my_tasks.items,[]);
});
test('students cannot request business list and failures can be retried',async()=>{
  let calls=0;const store=make(async()=>{calls++;throw {message:'Failed'};});
  store.state.proposals.role='student';await store.dispatch('my_tasks/load');assert.equal(calls,0);
  store.state.proposals.role='business';await store.dispatch('my_tasks/load');
  assert.equal(store.state.my_tasks.error.message,'Failed');assert.equal(store.state.my_tasks.is_loading,false);
});
