const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const Job = require('../models/Job');

// Public: Bootstrap first admin (one-time only)
router.post('/bootstrap', async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount > 0) return res.status(400).json({ success: false, message: 'Admin already exists. Use login.' });
    const { name, email, password } = req.body;
    const admin = await User.create({ name, email, password, role: 'admin', isVerified: true });
    const token = admin.getSignedJwtToken();
    res.status(201).json({ success: true, token, message: 'Admin created! You can now log in.' });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
});
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const InterviewSession = require('../models/InterviewSession');

router.use(protect, authorize('admin'));

// @route GET /api/admin/dashboard
router.get('/dashboard', async (req, res) => {
  try {
    const [totalUsers, recruiters, candidates, totalJobs, totalApplications, totalInterviews] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: 'recruiter' }),
      User.countDocuments({ role: 'candidate' }),
      Job.countDocuments(),
      Application.countDocuments(),
      InterviewSession.countDocuments(),
    ]);

    const recentUsers = await User.find().sort({ createdAt: -1 }).limit(10).select('-password');
    const recentJobs = await Job.find().sort({ createdAt: -1 }).limit(10).populate('recruiter', 'name company');

    // Monthly signups for chart
    const monthlyData = await User.aggregate([
      { $group: { _id: { month: { $month: '$createdAt' }, year: { $year: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      { $limit: 12 },
    ]);

    res.json({
      success: true,
      stats: { totalUsers, recruiters, candidates, totalJobs, totalApplications, totalInterviews },
      recentUsers,
      recentJobs,
      monthlyData,
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/admin/users
router.get('/users', async (req, res) => {
  try {
    const { role, search, page = 1, limit = 20 } = req.query;
    const query = {};
    if (role) query.role = role;
    if (search) query.$or = [{ name: { $regex: search, $options: 'i' } }, { email: { $regex: search, $options: 'i' } }];

    const total = await User.countDocuments(query);
    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    res.json({ success: true, users, total });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PUT /api/admin/users/:id/suspend
router.put('/users/:id/suspend', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id,
      { isActive: false }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PUT /api/admin/users/:id/activate
router.put('/users/:id/activate', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id,
      { isActive: true }, { new: true });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PUT /api/admin/recruiters/:id/verify
router.put('/recruiters/:id/verify', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id,
      { isVerified: true }, { new: true });

    await User.findByIdAndUpdate(req.params.id, {
      $push: {
        notifications: {
          message: 'Your recruiter account has been verified by admin!',
          type: 'success',
        },
      },
    });

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route DELETE /api/admin/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/admin/jobs
router.get('/jobs', async (req, res) => {
  try {
    const jobs = await Job.find()
      .populate('recruiter', 'name company')
      .sort({ createdAt: -1 });
    res.json({ success: true, jobs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route PUT /api/admin/jobs/:id/hide
router.put('/jobs/:id/hide', async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, { isHidden: true }, { new: true });
    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/admin/create - Create admin user
router.post('/create', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    const admin = await User.create({ name, email, password, role: 'admin', isVerified: true });
    res.status(201).json({ success: true, admin });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Bootstrap first admin (no auth, one-time use)
router.post('/bootstrap', async (req, res) => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    if (adminCount > 0) {
      return res.status(400).json({ success: false, message: 'Admin already exists' });
    }
    const { name, email, password } = req.body;
    const admin = await User.create({ name, email, password, role: 'admin', isVerified: true });
    const token = admin.getSignedJwtToken();
    res.status(201).json({ success: true, token, message: 'Admin created successfully' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
