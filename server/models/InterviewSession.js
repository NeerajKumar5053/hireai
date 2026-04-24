const mongoose = require('mongoose');

const InterviewSessionSchema = new mongoose.Schema({
  interview: { type: mongoose.Schema.Types.ObjectId, ref: 'Interview' },
  candidate: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isPractice: { type: Boolean, default: false },

  // Practice-specific
  practiceRole: { type: String },
  practiceSkill: { type: String },
  practiceDifficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'] },

  // Conversation transcript
  transcript: [{
    role: { type: String, enum: ['ai', 'candidate'] },
    message: { type: String },
    timestamp: { type: Date, default: Date.now },
    audioUrl: { type: String },
  }],

  // Emotion data (snapshot every 3 seconds)
  emotionData: [{
    timestamp: { type: Date },
    emotions: {
      happy: Number,
      sad: Number,
      angry: Number,
      fearful: Number,
      disgusted: Number,
      surprised: Number,
      neutral: Number,
    },
    dominantEmotion: String,
    confidence: Number,
  }],

  // Anti-cheat events
  cheatEvents: [{
    type: { type: String, enum: ['tab_switch', 'window_blur', 'multiple_faces', 'eyes_away', 'audio_anomaly', 'copy_paste'] },
    timestamp: { type: Date, default: Date.now },
    details: String,
  }],

  // Scores
  integrityScore: { type: Number, default: 100 },
  overallScore: { type: Number },
  communicationScore: { type: Number },
  technicalScore: { type: Number },
  confidenceScore: { type: Number },

  // AI-generated report
  report: {
    summary: String,
    strengths: [String],
    weaknesses: [String],
    recommendation: { type: String, enum: ['strong_yes', 'yes', 'maybe', 'no'] },
    detailedAnalysis: String,
    questionAnalysis: [{
      question: String,
      answer: String,
      score: Number,
      feedback: String,
    }],
    emotionSummary: String,
    cheatingAnalysis: String,
  },

  startedAt: { type: Date },
  endedAt: { type: Date },
  duration: { type: Number }, // actual duration in minutes
  status: { type: String, enum: ['in_progress', 'completed', 'abandoned'], default: 'in_progress' },
}, { timestamps: true });

module.exports = mongoose.model('InterviewSession', InterviewSessionSchema);
