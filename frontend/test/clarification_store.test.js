import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from 'vuex';
import { create_tasks_module } from '../src/store/modules/tasks.js';
import { empty_draft } from '../src/domain/task_fields.js';
const base=()=>({task:{...empty_draft(),id:'task',version:2,original_description:'Description'},confirmation:null,has_unconfirmed_changes:true,clarification:{id:'session',task_version:2,questions:[{id:'q',field:'title',answer:''}],suggested_card:null}});
const make=request=>{const s=createStore({modules:{tasks:create_tasks_module(request)}});s.commit('tasks/receive_task',base());return s;};
test('answers survive errors and use current identity and version',async()=>{
  const store=make(async(path,options)=>{
    assert.equal(path,'/tasks/task/clarification/answers');assert.equal(options.method,'PATCH');
    assert.equal(options.body.expected_version,2);assert.equal(options.body.answers[0].answer,'Answer');
    throw {code:'NETWORK_ERROR',message:'Failed'};
  });
  store.commit('tasks/set_answer',{id:'q',value:'Answer'});
  await store.dispatch('tasks/clarify','answers');assert.equal(store.state.tasks.answers.q,'Answer');assert.equal(store.getters['tasks/is_busy'],false);
});
test('suggestion requires explicit apply and becomes unsaved editable text',async()=>{
  const result=base();result.clarification.suggested_card={title:'Suggested'};
  const store=make(async()=>result);
  await store.dispatch('tasks/clarify','card');assert.equal(store.state.tasks.draft.title,'');
  await store.dispatch('tasks/apply_suggestion');assert.equal(store.state.tasks.draft.title,'Suggested');assert.equal(store.getters['tasks/is_dirty'],true);assert.equal(store.state.tasks.confirmation,null);
});
test('late AI result cannot replace another task and dirty input blocks generation',async()=>{
  let resolve,calls=0;const store=make(()=>{calls++;return new Promise(r=>resolve=r);});
  store.commit('tasks/set_field',{key:'title',value:'Unsaved'});await store.dispatch('tasks/clarify','questions');assert.equal(calls,0);
  store.commit('tasks/receive_task',base());const pending=store.dispatch('tasks/clarify','questions');store.commit('tasks/reset');
  resolve(base());await pending;assert.equal(store.state.tasks.task,null);
});
