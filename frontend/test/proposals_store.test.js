import test from 'node:test';
import assert from 'node:assert/strict';
import { createStore } from 'vuex';
import { create_proposals_module } from '../src/store/modules/proposals.js';

test('proposal actions share demo identity and send PostgreSQL fields through API service', async () => {
  const calls = [];
  const store = createStore({ modules: {
    tasks: { state: () => ({ user_id: 'student-id' }) },
    proposals: create_proposals_module(async (path, options) => {
      calls.push({ path, ...options });
      return { proposal: { id: 'proposal-id', status: options.body?.status || 'pending' }, proposals: [], teams: [] };
    }),
  } });
  const fields = { idea: 'Idea', plan: 'Plan', timeline: 'Week', prototype_url: '', team_id: 'team-id' };
  assert.equal((await store.dispatch('proposals/create_proposal', { task_id: 'task-id', fields })).status, 'pending');
  assert.deepEqual(calls[0], { path: '/tasks/task-id/proposals', method: 'POST', user_id: 'student-id', body: fields });
  await store.dispatch('proposals/load_context', 'task-id');
  assert.equal(calls[1].path, '/tasks/task-id/proposals/context');
  assert.deepEqual(await store.dispatch('proposals/load_proposals', 'task-id'), []);
  assert.equal((await store.dispatch('proposals/decide_proposal', { proposal_id: 'proposal-id', status: 'accepted' })).status, 'accepted');
  assert.deepEqual(calls[3], { path: '/proposals/proposal-id/status', method: 'PATCH', user_id: 'student-id', body: { status: 'accepted' } });
});

test('API failures propagate to proposal pages without fake success', async () => {
  const error = { status: 403, code: 'FORBIDDEN', message: 'Forbidden' };
  const store = createStore({ modules: {
    tasks: { state: () => ({ user_id: 'id' }) },
    proposals: create_proposals_module(async () => { throw error; }),
  } });
  await assert.rejects(store.dispatch('proposals/create_proposal', { task_id: 'id', fields: {} }), value => value === error);
  await assert.rejects(store.dispatch('proposals/decide_proposal', { proposal_id: 'id', status: 'rejected' }), value => value === error);
});
