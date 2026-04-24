const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ['admin', 'recruiter', 'candidate'], required: true },
  avatar: { type: String, default: '' },

  // Recruiter fields
  company: { type: String },
  companyLogo: { type: String },
  companyWebsite: { type: String },
  companyDescription: { type: String },
  isVerified: { type: Boolean, default: false }, // Admin approves recruiters

  // Candidate fields
  resume: { type: String },
  resumePublicId: { type: String },
  headline: { type: String },
  bio: { type: String },
  skills: [{ type: String }],
  experience: { type: String, enum: ['fresher', 'entry', 'mid', 'senior', 'lead'], default: 'fresher' },
  location: { type: String },
  expectedSalary: { type: Number },
  linkedIn: { type: String },
  github: { type: String },
  portfolio: { type: String },

  // Practice stats
  practiceStats: {
    totalSessions: { type: Number, default: 0 },
    avgScore: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0 },
  },

  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },
  notifications: [{
    message: String,
    type: { type: String, enum: ['info', 'success', 'warning', 'error'] },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
    link: String,
  }],
}, { timestamps: true });

// Hash password
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// JWT token
UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign({ id: this._id, role: this.role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE,
  });
};

// Match password
UserSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model('User', UserSchema);
