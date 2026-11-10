import mongoose from 'mongoose';

const ProgressSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  done: { type: mongoose.Schema.Types.Mixed, default: {} }, // stores the "done" object
  tasks: { type: Array, default: [] }, // stores daily tasks {id, text, done, timestamp, completedAt}
  activityHistory: { type: Array, default: [] }, // stores dates of activity ['YYYY-MM-DD']
  lastActiveDate: { type: String, default: "" }, // for streak calculation YYYY-MM-DD
  completions: { type: Array, default: [] }, // stores completed tasks history: [{ id, taskId, text, date, timestamp, type }]
}, { minimize: false, timestamps: true });

const Progress = mongoose.model('Progress', ProgressSchema);

export default Progress;
