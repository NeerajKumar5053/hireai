const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  requirements: { type: String },
  responsibilities: { type: String },

  recruiter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  company: { type: String, default: 'Unknown Company' },
  companyLogo: { type: String },

  location: { type: String },
  locationType: { type: String, enum: ['remote', 'hybrid', 'onsite'], default: 'onsite' },

  jobType: { type: String, enum: ['full-time', 'part-time', 'contract', 'internship', 'freelance'], default: 'full-time' },
  experienceLevel: { type: String, enum: ['fresher', 'entry', 'mid', 'senior', 'lead'], default: 'entry' },
  salaryMin: { type: Number },
  salaryMax: { type: Number },
  salaryCurrency: { type: String, default: 'INR' },

  skills: [{ type: String }],
  category: { type: String }, // e.g. "Software Engineering", "Design", "Marketing"

  deadline: { type: Date },
  status: { type: String, enum: ['draft', 'active', 'closed', 'paused'], default: 'active' },

  applicantCount: { type: Number, default: 0 },
  viewCount: { type: Number, default: 0 },

  // AI Interview config
  defaultInterviewType: { type: String, enum: ['ai', 'video', 'none'], default: 'none' },
  aiInterviewMode: { type: String, enum: ['full', 'assisted'], default: 'full' },
  customQuestions: [{ type: String }],
  interviewDuration: { type: Number, default: 30 }, // minutes

  isHidden: { type: Boolean, default: false }, // Admin can hide
}, { timestamps: true });

// Text index for search
JobSchema.index({ title: 'text', description: 'text', company: 'text', skills: 'text' });

module.exports = mongoose.model('Job', JobSchema);
