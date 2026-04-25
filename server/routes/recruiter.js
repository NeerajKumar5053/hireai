const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const InterviewSession = require('../models/InterviewSession');

// All recruiter routes are protected
router.use(protect, authorize('recruiter'));

// ─── JOBS ───────────────────────────────────────────────────────────────────

// @route GET /api/recruiter/jobs
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await Job.find({ recruiter: req.user._id }).sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/recruiter/jobs
router.post('/jobs', async (req, res) => {
  try {
    const jobData = {
      ...req.body,
      recruiter: req.user._id,
      company: req.user.company || req.body.company,
      companyLogo: req.user.companyLogo,
    };
    const job = await Job.create(jobData);

    await User.findByIdAndUpdate(req.user._id, {
      $push: {
        notifications: {
          message: `Job "${job.title}" posted successfully`,
          type: 'success',
          link: `/recruiter/jobs/${job._id}`,
        },
      },
    });

    res.status(201).json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PUT /api/recruiter/jobs/:id
router.put('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findOne({ _id: req.params.id, recruiter: req.user._id });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    const updated = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json({ success: true, job: updated });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route DELETE /api/recruiter/jobs/:id
router.delete('/jobs/:id', async (req, res) => {
  try {
    const job = await Job.findOneAndDelete({ _id: req.params.id, recruiter: req.user._id });
    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });
    res.json({ success: true, message: 'Job deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── APPLICATIONS ────────────────────────────────────────────────────────────

// @route GET /api/recruiter/applications
router.get('/applications', async (req, res) => {
  try {
    const { jobId, status } = req.query;
    const query = { recruiter: req.user._id };
    if (jobId) query.job = jobId;
    if (status) query.status = status;

    const applications = await Application.find(query)
      .populate('candidate', 'name email avatar skills experience headline resume')
      .populate('job', 'title company')
      .sort({ createdAt: -1 });

    res.json({ success: true, applications });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PUT /api/recruiter/applications/:id/status
router.put('/applications/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const app = await Application.findOne({ _id: req.params.id, recruiter: req.user._id })
      .populate('candidate', 'name email');

    if (!app) return res.status(404).json({ success: false, message: 'Application not found' });

    app.status = status;
    if (notes) app.recruiterNotes = notes;
    app.timeline.push({ status, message: `Status updated to ${status}` });
    await app.save();

    // Notify candidate
    await User.findByIdAndUpdate(app.candidate._id, {
      $push: {
        notifications: {
          message: `Your application status was updated to: ${status.replace('_', ' ')}`,
          type: status === 'rejected' ? 'error' : 'info',
          link: '/candidate/applications',
        },
      },
    });

    // Emit socket notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${app.candidate._id}`).emit('notification', {
        message: `Application status: ${status}`,
        type: status === 'rejected' ? 'error' : 'info',
      });
    }

    res.json({ success: true, application: app });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── INTERVIEWS ──────────────────────────────────────────────────────────────

// @route GET /api/recruiter/interviews
router.get('/interviews', async (req, res) => {
  try {
    const interviews = await Interview.find({ recruiter: req.user._id })
      .populate('candidate', 'name email avatar')
      .populate('job', 'title')
      .sort({ scheduledAt: 1 });
    res.json({ success: true, interviews });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/recruiter/interviews
router.post('/interviews', async (req, res) => {
  try {
    // ── Validate that scheduledAt is in the future ──
    const scheduledAt = new Date(req.body.scheduledAt);
    if (isNaN(scheduledAt.getTime()) || scheduledAt <= new Date()) {
      return res.status(400).json({ success: false, message: 'Interview must be scheduled for a future date and time.' });
    }

    const interview = await Interview.create({
      ...req.body,
      recruiter: req.user._id,
      scheduledAt,
    });

    // Update application status
    if (req.body.application) {
      await Application.findByIdAndUpdate(req.body.application, {
        status: 'interview_scheduled',
        $push: { timeline: { status: 'interview_scheduled', message: 'Interview scheduled' } },
      });
    }

    // Notify candidate
    await User.findByIdAndUpdate(req.body.candidate, {
      $push: {
        notifications: {
          message: `Interview scheduled on ${scheduledAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })} — Click to join`,
          type: 'success',
          link: `/candidate/interviews`,
        },
      },
    });

    // Notify panelists (if panel mode)
    if (req.body.interviewMode === 'panel' && Array.isArray(req.body.panelists)) {
      for (const panelistId of req.body.panelists) {
        await User.findByIdAndUpdate(panelistId, {
          $push: {
            notifications: {
              message: `You have been added as a panelist for an interview on ${scheduledAt.toLocaleDateString('en-IN')}`,
              type: 'info',
              link: `/recruiter/dashboard`,
            },
          },
        });
      }
    }

    const io = req.app.get('io');
    if (io) {
      io.to(`user_${req.body.candidate}`).emit('interview_scheduled', {
        interview,
        message: 'You have a new interview scheduled!',
      });
    }

    res.status(201).json({ success: true, interview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/recruiter/interviews/:id/result
router.get('/interviews/:id/result', async (req, res) => {
  try {
    const interview = await Interview.findOne({
      _id: req.params.id,
      recruiter: req.user._id,
    }).populate('session').populate('candidate', 'name email avatar');

    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

    res.json({ success: true, interview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/recruiter/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [totalJobs, activeJobs, totalApplications, pendingInterviews, completedInterviews] = await Promise.all([
      Job.countDocuments({ recruiter: req.user._id }),
      Job.countDocuments({ recruiter: req.user._id, status: 'active' }),
      Application.countDocuments({ recruiter: req.user._id }),
      Interview.countDocuments({ recruiter: req.user._id, status: 'pending' }),
      Interview.countDocuments({ recruiter: req.user._id, status: 'completed' }),
    ]);

    const recentApplications = await Application.find({ recruiter: req.user._id })
      .populate('candidate', 'name email avatar skills')
      .populate('job', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    const upcomingInterviews = await Interview.find({
      recruiter: req.user._id,
      status: 'pending',
      scheduledAt: { $gte: new Date() },
    })
      .populate('candidate', 'name email avatar')
      .populate('job', 'title')
      .sort({ scheduledAt: 1 })
      .limit(5);

    res.json({
      success: true,
      stats: { totalJobs, activeJobs, totalApplications, pendingInterviews, completedInterviews },
      recentApplications,
      upcomingInterviews,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
