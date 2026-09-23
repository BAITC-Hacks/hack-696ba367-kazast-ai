import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from 'vuex';
import { create_published_task_module } from '../src/store/modules/published_task.js';

test('detail ignores late responses after changing task', async () => {
  const pending = [];
  const store = createStore({modules:{published_task:create_published_task_module(path => new Promise(resolve => pending.push({path,resolve})))}});
  const first = store.dispatch('published_task/load_task','first');
  const second = store.dispatch('published_task/load_task','second');
  assert.equal(pending[1].path,'/tasks/second/published');
  pending[1].resolve({task:{id:'second'}}); await second;
  pending[0].resolve({task:{id:'first'}}); await first;
  assert.equal(store.state.published_task.task.id,'second');
  assert.equal(store.state.published_task.is_loading,false);
});

test('unavailable detail clears previous task and reports error', async () => {
  const store = createStore({modules:{published_task:create_published_task_module(async () => {throw {status:404,message:'Not found'};})}});
  store.commit('published_task/receive_task',{id:'old'});
  await store.dispatch('published_task/load_task','missing');
  assert.equal(store.state.published_task.task,null);
  assert.equal(store.state.published_task.error.status,404);
  assert.equal(store.state.published_task.is_loading,false);
});
