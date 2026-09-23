import assert from 'node:assert/strict';
import { test } from 'node:test';
import mongoose from 'mongoose';
import connectDB from '../src/config/db.js';

test('connectDB requires an environment URI before calling the driver', async (t) => {
  const previous = process.env.MONGODB_URI;
  t.after(() => {
    if (previous === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previous;
  });
  delete process.env.MONGODB_URI;
  const connect = t.mock.method(mongoose, 'connect', async () => {});
  await assert.rejects(connectDB(), /MONGODB_URI is required/);
  assert.equal(connect.mock.callCount(), 0);
});

test('connectDB forwards the environment value and hides raw driver errors', async (t) => {
  const previous = process.env.MONGODB_URI;
  t.after(() => {
    if (previous === undefined) delete process.env.MONGODB_URI;
    else process.env.MONGODB_URI = previous;
  });
  // Opaque test value; no real URI or credentials are used.
  process.env.MONGODB_URI = 'test-environment-value';
  const connect = t.mock.method(mongoose, 'connect', async (uri, options) => {
    assert.equal(uri, process.env.MONGODB_URI);
    assert.equal(options.serverSelectionTimeoutMS, 5000);
    return mongoose;
  });
  t.mock.method(console, 'log', () => {});
  assert.equal(await connectDB(), mongoose.connection);
  connect.mock.mockImplementation(async () => {
    throw new Error('Sensitive driver details');
  });
  await assert.rejects(connectDB(), (error) => {
    assert.match(error.message, /MongoDB connection failed/);
    assert.doesNotMatch(error.message, /Sensitive|test-environment-value/);
    assert.equal(error.cause, undefined);
    return true;
  });
});
