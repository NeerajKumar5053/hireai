const mongoose = require('mongoose');

const ApplicationSchema = new mongoose.Schema({
  job: { type: mongoose.Schema.Types.ObjectId, ref: 'Job', required: true },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  coverLetter: { type: String },
  resumeUrl: { type: String },

  status: {
    type: String,
    enum: ['applied', 'reviewing', 'shortlisted', 'interview_scheduled', 'interviewed', 'offered', 'rejected', 'withdrawn'],
    default: 'applied',
  },

  // Recruiter notes
  recruiterNotes: { type: String },
  rating: { type: Number, min: 1, max: 5 },

  // Timeline
  timeline: [{
    status: String,
    message: String,
    date: { type: Date, default: Date.now },
  }],
}, { timestamps: true });

// One application per job per candidate
ApplicationSchema.index({ job: 1, candidate: 1 }, { unique: true });

module.exports = mongoose.model('Application', ApplicationSchema);
