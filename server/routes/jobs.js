const express = require('express');
const router = express.Router();
const Job = require('../models/Job');
const Application = require('../models/Application');

// @route GET /api/jobs - Public: Get all active jobs with filters
router.get('/', async (req, res) => {
  try {
    const {
      search, location, locationType, jobType, experienceLevel,
      salaryMin, salaryMax, skills, category, sort, page = 1, limit = 12,
    } = req.query;

    const query = { status: 'active', isHidden: false };

    if (search) {
      query.$text = { $search: search };
    }
    if (location) query.location = { $regex: location, $options: 'i' };
    if (locationType) query.locationType = locationType;
    if (jobType) query.jobType = jobType;
    if (experienceLevel) query.experienceLevel = experienceLevel;
    if (category) query.category = category;
    if (salaryMin || salaryMax) {
      query.salaryMin = { $gte: Number(salaryMin) || 0 };
      if (salaryMax) query.salaryMax = { $lte: Number(salaryMax) };
    }
    if (skills) {
      const skillArr = skills.split(',').map(s => s.trim());
      query.skills = { $in: skillArr };
    }

    const sortOptions = {
      latest: { createdAt: -1 },
      salary_high: { salaryMax: -1 },
      salary_low: { salaryMin: 1 },
      deadline: { deadline: 1 },
    };
    const sortBy = sortOptions[sort] || { createdAt: -1 };

    const skip = (Number(page) - 1) * Number(limit);
    const total = await Job.countDocuments(query);
    const jobs = await Job.find(query)
      .populate('recruiter', 'name company companyLogo avatar isVerified')
      .sort(sortBy)
      .skip(skip)
      .limit(Number(limit));

    res.json({
      success: true,
      jobs,
      pagination: {
        total,
        page: Number(page),
        pages: Math.ceil(total / Number(limit)),
        limit: Number(limit),
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/jobs/:id - Public: Get single job
router.get('/:id', async (req, res) => {
  try {
    const job = await Job.findById(req.params.id)
      .populate('recruiter', 'name company companyLogo avatar isVerified companyDescription companyWebsite');

    if (!job) return res.status(404).json({ success: false, message: 'Job not found' });

    // Increment view count
    await Job.findByIdAndUpdate(req.params.id, { $inc: { viewCount: 1 } });

    res.json({ success: true, job });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
