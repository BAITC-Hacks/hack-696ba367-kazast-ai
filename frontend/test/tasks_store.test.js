import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from 'vuex';
import { create_tasks_module } from '../src/store/modules/tasks.js';
import { empty_draft } from '../src/domain/task_fields.js';

const result = (overrides = {}) => ({ task: { ...empty_draft(), id: 'task-1', original_description: 'Заявки', version: 1, ...overrides }, confirmation: null, has_unconfirmed_changes: true });
const make_store = request => createStore({ strict: true, modules: { tasks: create_tasks_module(request) } });

test('create, save and confirm use store state and server versions', async () => {
  const calls = [];
  const store = make_store(async (path, options) => {
    calls.push({path, options});
    if (path.endsWith('/confirm')) return { ...result({ title: 'Заявки', version: 2 }), confirmation: { score: 0 }, has_unconfirmed_changes: false };
    return result(options.method === 'PATCH' ? { title: options.body.title, version: 2 } : {});
  });
  store.commit('tasks/set_field', { key: 'original_description', value: 'Заявки' });
  await store.dispatch('tasks/save_task');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(store.getters['tasks/is_dirty'], false);
  store.commit('tasks/set_field', { key: 'title', value: 'Заявки' });
  assert.equal(store.getters['tasks/can_confirm'], false);
  await store.dispatch('tasks/save_task');
  assert.equal(calls[1].options.body.expected_version, 1);
  assert.equal(store.getters['tasks/can_confirm'], true);
  await store.dispatch('tasks/confirm_task');
  assert.deepEqual(calls[2].options.body, { expected_version: 2 });
  assert.equal(store.state.tasks.confirmation.score, 0);
  assert.equal(store.getters['tasks/can_confirm'], false);
});

test('conflicts preserve text and block blind retries', async () => {
  let requests = 0;
  const store = make_store(async () => { requests++; throw {code:'VERSION_CONFLICT',message:'Conflict'}; });
  store.commit('tasks/receive_task', result());
  store.commit('tasks/set_field', {key:'title',value:'Мой текст'});
  await store.dispatch('tasks/save_task');
  assert.equal(store.state.tasks.draft.title,'Мой текст');
  assert.equal(store.state.tasks.task.version,1);
  assert.equal(store.getters['tasks/is_busy'],false);
  await store.dispatch('tasks/save_task');
  assert.equal(requests,1);
});

test('late responses cannot replace another task', async () => {
  const pending = [];
  const store = make_store(() => new Promise(resolve => pending.push(resolve)));
  const first = store.dispatch('tasks/load_task','old');
  const second = store.dispatch('tasks/load_task','new');
  pending[1](result({id:'new'}));
  await second;
  pending[0](result({id:'old'}));
  await first;
  assert.equal(store.state.tasks.task.id,'new');
});

test('network failure keeps editable draft and releases pending state', async () => {
  const store = make_store(async () => { throw {code:'NETWORK_ERROR',message:'Offline'}; });
  store.commit('tasks/set_field',{key:'original_description',value:'Не потерять'});
  await store.dispatch('tasks/save_task');
  assert.equal(store.state.tasks.draft.original_description,'Не потерять');
  assert.equal(store.getters['tasks/is_busy'],false);
  assert.equal(store.state.tasks.error.code,'NETWORK_ERROR');
});

test('publication uses confirmed version, updates store and prevents repeated requests', async () => {
  let calls = 0;
  const store = make_store(async (path, options) => {
    calls++;
    assert.equal(path,'/tasks/task-1/publish');
    assert.deepEqual(options.body,{expected_version:2});
    return { ...result({title:'Card',version:3,published_revision_id:'revision-1'}),confirmation:{id:'revision-1',score:0},has_unconfirmed_changes:false };
  });
  store.commit('tasks/receive_task',{...result({title:'Card',version:2}),confirmation:{id:'revision-1',score:0},has_unconfirmed_changes:false});
  assert.equal(store.getters['tasks/can_publish'],true);
  await store.dispatch('tasks/publish_task');
  assert.equal(store.state.tasks.task.version,3);
  assert.equal(store.getters['tasks/is_published'],true);
  assert.equal(store.getters['tasks/is_publication_current'],true);
  assert.equal(store.getters['tasks/can_publish'],false);
  await store.dispatch('tasks/publish_task');
  assert.equal(calls,1);
});

test('publication blocks unsaved or unconfirmed edits and permits confirmed update', async () => {
  const store = make_store(async () => { throw new Error('Should not request'); });
  store.commit('tasks/receive_task',result({title:'Card'}));
  assert.equal(store.getters['tasks/can_publish'],false);
  store.commit('tasks/receive_task',{...result({title:'Card',published_revision_id:'old'}),confirmation:{id:'new'},has_unconfirmed_changes:false});
  assert.equal(store.getters['tasks/can_publish'],true);
  store.commit('tasks/set_field',{key:'title',value:'Unsaved'});
  assert.equal(store.getters['tasks/can_publish'],false);
  await store.dispatch('tasks/publish_task');
  assert.equal(store.state.tasks.error,null);
});

test('publication conflict preserves previous published version and requires reload', async () => {
  const store = make_store(async () => { throw {code:'VERSION_CONFLICT',message:'Reload'}; });
  store.commit('tasks/receive_task',{...result({title:'Card',published_revision_id:'old'}),confirmation:{id:'new'},has_unconfirmed_changes:false});
  await store.dispatch('tasks/publish_task');
  assert.equal(store.state.tasks.task.published_revision_id,'old');
  assert.equal(store.state.tasks.draft.title,'Card');
  assert.equal(store.getters['tasks/can_publish'],false);
  assert.equal(store.getters['tasks/is_busy'],false);
});
