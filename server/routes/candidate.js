const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const InterviewSession = require('../models/InterviewSession');
const Job = require('../models/Job');
const User = require('../models/User');

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

module.exports = router;
