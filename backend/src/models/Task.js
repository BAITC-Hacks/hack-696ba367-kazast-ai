import mongoose from 'mongoose';

const { Schema } = mongoose;
const text = () => ({ type: String, default: '' });
const flag = () => ({ type: Boolean, default: false });
const points = (max) => ({ type: Number, default: 0, min: 0, max });
const analysis = () => ({
  status: { type: String, enum: ['missing', 'partial', 'complete'], default: 'missing' },
  reason: text(),
});

const questionSchema = new Schema({
  targetField: text(),
  question: text(),
  answer: text(),
}, { _id: false });

const recommendationSchema = new Schema({
  field: text(),
  missingPoints: { type: Number, default: 0 },
  message: text(),
}, { _id: false });

const taskSchema = new Schema({
  originalDraft: text(),
  title: text(),
  industry: text(),
  topic: text(),
  context: text(),
  need: text(),
  users: text(),
  data: text(),
  constraints: text(),
  expectedResult: text(),
  successCriteria: text(),
  contact: text(),
  consultationFormat: text(),
  feedbackProcess: text(),
  fieldAnalysis: {
    contextNeed: analysis(),
    data: analysis(),
    expectedResult: analysis(),
    successCriteria: analysis(),
    constraints: analysis(),
    users: analysis(),
    businessConnection: analysis(),
  },
  clarificationQuestions: { type: [questionSchema], default: [] },
  confirmedFields: {
    context: flag(),
    need: flag(),
    users: flag(),
    data: flag(),
    constraints: flag(),
    expectedResult: flag(),
    successCriteria: flag(),
    contact: flag(),
    consultationFormat: flag(),
    feedbackProcess: flag(),
  },
  confirmed: flag(),
  score: points(100),
  scoreBreakdown: {
    contextNeed: points(20),
    data: points(20),
    expectedResult: points(15),
    successCriteria: points(15),
    constraints: points(10),
    users: points(10),
    businessConnection: points(10),
  },
  readinessLevel: {
    type: String,
    enum: ['draft', 'working', 'ready', 'priority'],
    default: 'draft',
  },
  missingFields: { type: [String], default: [] },
  recommendations: { type: [recommendationSchema], default: [] },
  published: flag(),
}, { timestamps: true });

taskSchema.index({ published: 1 });
taskSchema.index({ score: 1 });
taskSchema.index({ topic: 1 });
taskSchema.index({ readinessLevel: 1 });

export default mongoose.model('Task', taskSchema);
