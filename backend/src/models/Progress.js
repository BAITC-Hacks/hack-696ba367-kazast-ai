import mongoose from 'mongoose';

const progressSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  stage: { type: String, required: true },
  confirmed: { type: Boolean, default: false },
  pointsAwarded: { type: Number, default: 0 },
  confirmedAt: { type: Date, default: null },
}, { timestamps: true });

progressSchema.index({ taskId: 1 });
progressSchema.index({ teamId: 1 });

export default mongoose.model('Progress', progressSchema);
