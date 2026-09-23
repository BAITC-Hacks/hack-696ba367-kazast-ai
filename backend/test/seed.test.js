import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import Task from '../src/models/Task.js';
import Team from '../src/models/Team.js';
import Proposal from '../src/models/Proposal.js';
import Progress from '../src/models/Progress.js';
import { tasks, teams, proposals, progress } from '../src/seed/data.js';

test('seed has sufficient records, unique IDs and valid documents without connecting', async () => {
  assert.equal(mongoose.connection.readyState, 0);
  for (const [Model, records, minimum] of [[Task, tasks, 5], [Team, teams, 5],
    [Proposal, proposals, 5], [Progress, progress, 2]]) {
    assert.ok(records.length >= minimum);
    assert.equal(new Set(records.map((record) => String(record._id))).size, records.length);
    for (const record of records) await new Model(record).validate();
  }
});

test('seed scores, readiness, questions and confirmed evidence agree', () => {
  const groups = { contextNeed: ['context', 'need'], data: ['data'], expectedResult: ['expectedResult'],
    successCriteria: ['successCriteria'], constraints: ['constraints'], users: ['users'],
    businessConnection: ['contact', 'consultationFormat', 'feedbackProcess'] };
  for (const task of tasks) {
    assert.equal(Object.values(task.scoreBreakdown).reduce((sum, value) => sum + value, 0), task.score);
    const level = task.score < 40 ? 'draft' : task.score < 70 ? 'working' : task.score < 90 ? 'ready' : 'priority';
    assert.equal(task.readinessLevel, level);
    assert.ok(task.clarificationQuestions.length >= 3);
    for (const question of task.clarificationQuestions) {
      assert.ok(question.question);
      assert.equal(question.answer, task[question.targetField]);
    }
    for (const [criterion, fields] of Object.entries(groups)) {
      if (task.scoreBreakdown[criterion] > 0) {
        for (const field of fields) {
          assert.ok(task[field]);
          assert.equal(task.confirmedFields[field], true);
        }
      }
    }
  }
  assert.deepEqual(new Set(tasks.map((task) => task.readinessLevel)), new Set(['draft', 'working', 'ready', 'priority']));
});

test('incomplete seed tasks preserve gaps; priority is complete and confirmed', () => {
  for (const task of tasks.filter((item) => item.score < 100)) {
    assert.ok(Object.values(task.fieldAnalysis).some(({ status }) => ['missing', 'partial'].includes(status)));
    assert.ok(task.missingFields.length);
    assert.ok(task.recommendations.length);
    for (const field of task.missingFields) {
      assert.equal(task[field], '');
      assert.equal(task.confirmedFields[field], false);
    }
    assert.equal(task.recommendations.reduce((sum, item) => sum + item.missingPoints, 0), 100 - task.score);
  }
  const priority = tasks.find((task) => task.score === 100);
  assert.ok(priority);
  assert.equal(priority.confirmed, true);
  assert.deepEqual(priority.missingFields, []);
  assert.deepEqual(priority.recommendations, []);
  assert.ok(Object.values(priority.confirmedFields).every(Boolean));
  assert.ok(Object.values(priority.fieldAnalysis).every(({ status }) => status === 'complete'));
});

test('seed references resolve and several manually accepted proposals share a task', () => {
  for (const record of [...proposals, ...progress]) {
    assert.ok(record.taskId instanceof mongoose.Types.ObjectId);
    assert.ok(record.teamId instanceof mongoose.Types.ObjectId);
    assert.ok(tasks.some((task) => task._id.equals(record.taskId)));
    assert.ok(teams.some((team) => team._id.equals(record.teamId)));
  }
  assert.deepEqual(new Set(proposals.map((item) => item.status)), new Set(['pending', 'accepted', 'rejected']));
  assert.ok(tasks.some((task) => proposals.filter((item) => item.taskId.equals(task._id) && item.status === 'accepted').length >= 2));
  for (const Model of [Proposal, Progress]) {
    assert.equal(Model.schema.path('taskId').options.ref, 'Task');
    assert.equal(Model.schema.path('teamId').options.ref, 'Team');
  }
});

test('seed progress belongs to accepted teams and accounts for team points', () => {
  for (const entry of progress) {
    assert.ok(proposals.some((item) => item.taskId.equals(entry.taskId) && item.teamId.equals(entry.teamId) && item.status === 'accepted'));
    if (entry.confirmed) assert.ok(entry.confirmedAt instanceof Date);
    else {
      assert.equal(entry.confirmedAt, null);
      assert.equal(entry.pointsAwarded, 0);
    }
  }
  for (const team of teams) {
    assert.equal(team.points, progress.filter((entry) => entry.confirmed && entry.teamId.equals(team._id))
      .reduce((sum, entry) => sum + entry.pointsAwarded, 0));
  }
});

test('catalog queries retain publication, topic, readiness and score sort without a score threshold', async () => {
  for (const filter of [{ published: true }, { published: true, topic: 'Аналитика' },
    { published: true, readinessLevel: 'draft' },
    { published: true, topic: 'Аналитика', readinessLevel: 'ready' }]) {
    const query = Task.find(filter).sort({ score: -1 });
    assert.deepEqual(query.cast(Task), filter);
    assert.deepEqual(query.getFilter(), filter);
    assert.deepEqual(query.getOptions().sort, { score: -1 });
  }
  const draft = new Task(tasks.find((item) => item.score < 40 && item.published));
  await draft.validate();
  assert.equal(draft.published, true);
  const empty = new Task({ published: true });
  await empty.validate();
  assert.equal(empty.score, 0);
  assert.equal(empty.published, true);
});

test('requested indexes are simple and nonunique', () => {
  for (const [Model, fields] of [[Task, ['published', 'score', 'topic', 'readinessLevel']],
    [Proposal, ['taskId', 'teamId', 'status']], [Progress, ['taskId', 'teamId']]]) {
    const indexes = Model.schema.indexes();
    assert.equal(indexes.length, fields.length);
    for (const field of fields) assert.ok(indexes.some(([keys]) => keys[field] === 1 && Object.keys(keys).length === 1));
    for (const [, options] of indexes) assert.ok(!options.unique);
  }
});
