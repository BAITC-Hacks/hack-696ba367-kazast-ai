import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import Task from '../src/models/Task.js';
import Team from '../src/models/Team.js';
import Proposal from '../src/models/Proposal.js';
import Progress from '../src/models/Progress.js';

test('empty task remains an unconfirmed unpublished draft', async () => {
  const task = new Task();
  await task.validate();
  assert.equal(task.originalDraft, '');
  assert.equal(task.score, 0);
  assert.equal(task.readinessLevel, 'draft');
  assert.equal(task.confirmed, false);
  assert.equal(task.published, false);
  assert.deepEqual(Object.values(task.confirmedFields.toObject()), Array(10).fill(false));
  assert.deepEqual(Object.values(task.scoreBreakdown.toObject()), Array(7).fill(0));
  assert.equal(task.fieldAnalysis.contextNeed.status, 'missing');
});

test('questions allow three and more; external analysis survives validation', async () => {
  for (const length of [3, 12]) {
    const task = new Task({
      clarificationQuestions: Array.from({ length }, () => ({
        targetField: 'data', question: 'Какие данные доступны?', answer: 'Таблица',
      })),
      fieldAnalysis: { data: { status: 'partial', reason: 'Нужны примеры' } },
      score: 90,
      readinessLevel: 'working',
    });
    await task.validate();
    assert.equal(task.clarificationQuestions.length, length);
    assert.equal(task.fieldAnalysis.data.reason, 'Нужны примеры');
    assert.equal(task.score, 90);
    assert.equal(task.readinessLevel, 'working'); // No automatic calculation.
    assert.equal(task.confirmed, false);
  }
});

test('score and every breakdown component enforce both bounds', async () => {
  const limits = { score: 100, 'scoreBreakdown.contextNeed': 20,
    'scoreBreakdown.data': 20, 'scoreBreakdown.expectedResult': 15,
    'scoreBreakdown.successCriteria': 15, 'scoreBreakdown.constraints': 10,
    'scoreBreakdown.users': 10, 'scoreBreakdown.businessConnection': 10 };
  for (const [path, max] of Object.entries(limits)) {
    for (const value of [0, max]) {
      const task = new Task();
      task.set(path, value);
      await task.validate();
    }
    for (const value of [-1, max + 1]) {
      const task = new Task();
      task.set(path, value);
      await assert.rejects(task.validate(), (error) => Boolean(error.errors[path]));
    }
  }
});

test('invalid readiness, analysis and proposal statuses fail', async () => {
  await assert.rejects(new Task({ readinessLevel: 'invalid' }).validate());
  await assert.rejects(new Task({ fieldAnalysis: { users: { status: 'invalid' } } }).validate());
  await assert.rejects(new Proposal({
    taskId: new mongoose.Types.ObjectId(), teamId: new mongoose.Types.ObjectId(), status: 'invalid',
  }).validate());
});

test('team, proposal and progress validate required fields and references', async () => {
  for (const Model of [Team, Proposal, Progress]) {
    await assert.rejects(new Model().validate());
  }
  const team = new Team({ name: 'Команда' });
  await team.validate();
  assert.equal(team.points, 0);
  const refs = { taskId: new mongoose.Types.ObjectId(), teamId: team._id };
  for (const Model of [Proposal, Progress]) {
    for (const missing of ['taskId', 'teamId']) {
      const input = { ...refs, stage: 'Прототип' };
      delete input[missing];
      await assert.rejects(new Model(input).validate());
    }
    await assert.rejects(new Model({ ...refs, taskId: 'invalid', stage: 'Прототип' }).validate());
  }
  const proposal = new Proposal(refs);
  await proposal.validate();
  assert.equal(proposal.status, 'pending');
  await assert.rejects(new Progress(refs).validate());
  const progress = new Progress({ ...refs, stage: 'Прототип' });
  await progress.validate();
  assert.equal(progress.confirmed, false);
  assert.equal(progress.confirmedAt, null);
  assert.equal(progress.pointsAwarded, 0);
});

test('multiple accepted proposals are valid and have no unique selection index', async () => {
  const taskId = new mongoose.Types.ObjectId();
  for (let i = 0; i < 3; i += 1) {
    await new Proposal({ taskId, teamId: new mongoose.Types.ObjectId(), status: 'accepted' }).validate();
  }
  assert.equal(Proposal.schema.indexes().some(([, options]) => options.unique), false);
  for (const Model of [Task, Team, Proposal, Progress]) {
    assert.equal(Model.schema.options.timestamps, true);
  }
});
