import mongoose from 'mongoose';

const proposalSchema = new mongoose.Schema({
  taskId: { type: mongoose.Schema.Types.ObjectId, ref: 'Task', required: true },
  teamId: { type: mongoose.Schema.Types.ObjectId, ref: 'Team', required: true },
  idea: { type: String, default: '' },
  plan: { type: String, default: '' },
  deadline: { type: String, default: '' },
  prototypeUrl: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected'], default: 'pending' },
}, { timestamps: true });

proposalSchema.index({ taskId: 1 });
proposalSchema.index({ teamId: 1 });
proposalSchema.index({ status: 1 });

export default mongoose.model('Proposal', proposalSchema);
