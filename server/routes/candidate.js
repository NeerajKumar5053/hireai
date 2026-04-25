const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const { uploadPDF } = require('../middleware/upload');
const pdfParse = require('pdf-parse');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const InterviewSession = require('../models/InterviewSession');
const Job = require('../models/Job');
const User = require('../models/User');
const groqService = require('../services/groqService');

router.use(protect, authorize('candidate'));

// @route GET /api/candidate/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [totalApplications, interviews, practiceCount] = await Promise.all([
      Application.countDocuments({ candidate: req.user._id }),
      Interview.find({ candidate: req.user._id }).sort({ scheduledAt: -1 }).limit(3)
        .populate('job', 'title company').populate('recruiter', 'name'),
      InterviewSession.countDocuments({ candidate: req.user._id, isPractice: true }),
    ]);

    const applicationsByStatus = await Application.aggregate([
      { $match: { candidate: req.user._id } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    const recentApplications = await Application.find({ candidate: req.user._id })
      .populate('job', 'title company companyLogo location salary')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({
      success: true,
      stats: { totalApplications, practiceCount },
      applicationsByStatus,
      recentApplications,
      upcomingInterviews: interviews,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/candidate/applications
router.get('/applications', async (req, res) => {
  try {
    const applications = await Application.find({ candidate: req.user._id })
      .populate('job', 'title company companyLogo location locationType salaryMin salaryMax experienceLevel')
      .populate('recruiter', 'name company')
      .sort({ createdAt: -1 });
    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/candidate/apply/:jobId
router.post('/apply/:jobId', async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const existing = await Application.findOne({ job: req.params.jobId, candidate: req.user._id });
    if (existing) return res.status(400).json({ success: false, message: 'Already applied to this job' });

    const application = await Application.create({
      job: req.params.jobId,
      candidate: req.user._id,
      recruiter: job.recruiter,
      coverLetter: req.body.coverLetter,
      resumeUrl: req.body.resumeUrl || req.user.resume,
      timeline: [{ status: 'applied', message: 'Application submitted' }],
    });

    await Job.findByIdAndUpdate(req.params.jobId, { $inc: { applicantCount: 1 } });

    // Notify recruiter
    await User.findByIdAndUpdate(job.recruiter, {
      $push: {
        notifications: {
          message: `New application for "${job.title}" from ${req.user.name}`,
          type: 'info',
          link: `/recruiter/applicants`,
        },
      },
    });

    const io = req.app.get('io');
    if (io) io.to(`user_${job.recruiter}`).emit('new_application', { jobTitle: job.title, candidateName: req.user.name });

    res.status(201).json({ success: true, application });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route DELETE /api/candidate/applications/:id
router.delete('/applications/:id', async (req, res) => {
  try {
    const app = await Application.findOne({ _id: req.params.id, candidate: req.user._id });
    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    app.status = 'withdrawn';
    app.timeline.push({ status: 'withdrawn', message: 'Candidate withdrew application' });
    await app.save();

    res.json({ success: true, message: 'Application withdrawn' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/candidate/interviews
router.get('/interviews', async (req, res) => {
  try {
    const interviews = await Interview.find({ candidate: req.user._id })
      .populate('job', 'title company')
      .populate('recruiter', 'name company avatar')
      .sort({ scheduledAt: -1 });
    res.json({ success: true, interviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/candidate/interviews/:id/join - Get join details
router.get('/interviews/:id/join', async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      candidate: req.user._id,
    }).populate('job', 'title description company requirements skills').populate('recruiter', 'name');

    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

    res.json({ success: true, interview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/candidate/practice/sessions
router.get('/practice/sessions', async (req, res) => {
  try {
    const sessions = await InterviewSession.find({
      candidate: req.user._id,
      isPractice: true,
    }).sort({ createdAt: -1 }).limit(20);
    res.json({ success: true, sessions });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/candidate/profile
router.get('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/candidate/resume/upload
// Upload a PDF resume, extract text, parse with AI, autofill profile
router.post('/resume/upload', uploadPDF.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No PDF file uploaded. Please attach a PDF resume.' });
    }

    // Extract raw text from PDF buffer
    let pdfText = '';
    try {
      const pdfData = await pdfParse(req.file.buffer);
      pdfText = pdfData.text || '';
    } catch (pdfErr) {
      return res.status(422).json({ success: false, message: 'Could not read PDF — please ensure it is a text-based (non-scanned) PDF.' });
    }

    if (!pdfText || pdfText.trim().length < 50) {
      return res.status(422).json({ success: false, message: 'PDF appears to be empty or scanned. Please use a text-based PDF.' });
    }

    // Parse resume with Groq AI
    const parsed = await groqService.parseResume(pdfText);

    // Build profile update — only overwrite fields that the AI actually found
    const updates = {};
    if (parsed.name && parsed.name.trim())               updates.name = parsed.name.trim();
    if (parsed.headline && parsed.headline.trim())        updates.headline = parsed.headline.trim();
    if (parsed.location && parsed.location.trim())        updates.location = parsed.location.trim();
    if (parsed.phone && parsed.phone.trim())              updates.phone = parsed.phone.trim();
    if (Array.isArray(parsed.skills) && parsed.skills.length > 0) {
      // Merge with existing skills (union)
      const existing = req.user.skills || [];
      const merged = [...new Set([...existing, ...parsed.skills])];
      updates.skills = merged;
    }
    if (parsed.experience && ['fresher','entry','mid','senior','lead'].includes(parsed.experience)) {
      updates.experience = parsed.experience;
    }
    if (parsed.bio) updates.bio = parsed.bio;
    if (parsed.linkedIn) updates.linkedIn = parsed.linkedIn;
    if (parsed.github) updates.github = parsed.github;

    // Auto-update the user profile
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updates,
      { new: true, runValidators: false }
    );

    res.json({
      success: true,
      message: 'Resume parsed and profile updated!',
      parsed,
      user: updatedUser,
    });
  } catch (err) {
    console.error('Resume upload error:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/candidate/job-recommendations
// Return jobs sorted by match with the candidate's skills
router.get('/job-recommendations', async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const skills = user.skills || [];
    const experience = user.experience;

    // Find active jobs
    const jobs = await Job.find({ status: 'active' }).limit(20).lean();

    // Score each job by skill overlap
    const scored = jobs.map(job => {
      const jobSkills = (job.skills || []).map(s => s.toLowerCase());
      const candidateSkills = skills.map(s => s.toLowerCase());
      const matchCount = candidateSkills.filter(s => jobSkills.includes(s)).length;
      const totalSkills = Math.max(jobSkills.length, 1);
      const score = Math.round((matchCount / totalSkills) * 100);
      return { ...job, matchScore: score, matchedSkills: candidateSkills.filter(s => jobSkills.includes(s)) };
    });

    // Sort by score descending
    scored.sort((a, b) => b.matchScore - a.matchScore);

    res.json({ success: true, jobs: scored.slice(0, 10) });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
