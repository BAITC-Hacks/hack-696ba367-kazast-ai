import mongoose from 'mongoose';
import connectDB from '../config/db.js';
import Task from '../models/Task.js';
import Team from '../models/Team.js';
import Proposal from '../models/Proposal.js';
import Progress from '../models/Progress.js';

import { tasks, teams, proposals, progress } from './data.js';

async function insertIfMissing(Model, id, fields) {
  const document = new Model({ _id: id, ...fields });
  await document.validate();
  const now = new Date();
  await Model.updateOne(
    { _id: id },
    { $setOnInsert: { ...document.toObject(), createdAt: now, updatedAt: now } },
    { upsert: true, runValidators: true, timestamps: false },
  );
}

try {
  await connectDB();
  for (const [Model, records] of [[Task, tasks], [Team, teams], [Proposal, proposals], [Progress, progress]]) {
    for (const { _id, ...fields } of records) {
      await insertIfMissing(Model, _id, fields);
    }
  }
  console.log('Demo data is ready. Existing documents were preserved.');
} catch {
  console.error('Seed failed. Check MONGODB_URI, MongoDB availability and write permissions.');
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
