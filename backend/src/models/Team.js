import mongoose from 'mongoose';

const teamSchema = new mongoose.Schema({
  name: { type: String, required: true },
  interests: { type: [String], default: [] },
  skills: { type: [String], default: [] },
  technologies: { type: [String], default: [] },
  points: { type: Number, default: 0 },
}, { timestamps: true });

export default mongoose.model('Team', teamSchema);
