const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

const InterviewSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job' },
  application: { type: mongoose.Schema.Types.ObjectId, ref: 'Application' },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  type: { type: String, enum: ['ai', 'video'], required: true },
  aiMode: { type: String, enum: ['full', 'assisted'], default: 'full' },
  customQuestions: [{ type: String }],

  // Video interview mode
  interviewMode: { type: String, enum: ['one_to_one', 'panel'], default: 'one_to_one' },
  panelists: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], // additional recruiters for panel

  roomId: { type: String, default: () => uuidv4(), unique: true },

  scheduledAt: { type: Date, required: true },
  duration: { type: Number, default: 30 }, // minutes
  timezone: { type: String, default: 'Asia/Kolkata' },

  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'cancelled', 'no_show'],
    default: 'pending',
  },

  // Links to result
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'InterviewSession' },

  // Candidate join token (extra security)
  joinToken: { type: String, default: () => uuidv4() },

  notes: { type: String },
}, { timestamps: true });

module.exports = mongoose.model('Interview', InterviewSchema);
