import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

// Load backend/.env independently of the working directory. Existing env wins.
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)), quiet: true });

export async function connectDB() {
  const uri = process.env.MONGODB_URI;
  if (!uri?.trim()) {
    throw new Error('MONGODB_URI is required. Set it in the environment or backend/.env.');
  }

  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
    console.log('MongoDB connected successfully.');
    return mongoose.connection;
  } catch {
    // Driver errors can contain the URI: never log or propagate raw errors.
    throw new Error('MongoDB connection failed. Check MONGODB_URI, credentials, network access and MongoDB availability.');
  }
}

export default connectDB;
