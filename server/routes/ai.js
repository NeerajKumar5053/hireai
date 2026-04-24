const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { uploadAudio } = require('../middleware/upload');
const groqService = require('../services/groqService');
const InterviewSession = require('../models/InterviewSession');

// @route POST /api/ai/transcribe - Convert audio to text via Groq Whisper
router.post('/transcribe', protect, uploadAudio.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No audio file provided' });

    const transcript = await groqService.transcribeAudio(req.file.buffer, req.file.mimetype);
    res.json({ success: true, transcript });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/ai/interview/start - Generate first question
router.post('/interview/start', protect, async (req, res) => {
  try {
    const { jobTitle, jobDescription, requirements, skills, mode, customQuestions } = req.body;

    const question = await groqService.startInterview({
      jobTitle, jobDescription, requirements, skills, mode, customQuestions,
    });

    res.json({ success: true, question });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/ai/interview/respond - Get AI response to candidate answer
router.post('/interview/respond', protect, async (req, res) => {
  try {
    const { answer, conversationHistory, jobTitle, questionNumber, totalQuestions } = req.body;

    const response = await groqService.evaluateAndRespond({
      answer, conversationHistory, jobTitle, questionNumber, totalQuestions,
    });

    res.json({ success: true, response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/ai/interview/report - Generate final report
router.post('/interview/report', protect, async (req, res) => {
  try {
    const { sessionId, transcript, emotionData, cheatEvents, jobTitle, isPractice } = req.body;

    const report = await groqService.generateReport({
      transcript, emotionData, cheatEvents, jobTitle, isPractice,
    });

    // Save to DB
    if (sessionId) {
      await InterviewSession.findByIdAndUpdate(sessionId, {
        report: report.report,
        overallScore: report.overallScore,
        communicationScore: report.communicationScore,
        technicalScore: report.technicalScore,
        confidenceScore: report.confidenceScore,
      });
    }

    res.json({ success: true, ...report });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/ai/practice/start - Start practice interview
router.post('/practice/start', protect, async (req, res) => {
  try {
    const { role, skill, difficulty } = req.body;

    // Create practice session
    const session = await InterviewSession.create({
      candidate: req.user._id,
      isPractice: true,
      practiceRole: role,
      practiceSkill: skill,
      practiceDifficulty: difficulty,
      startedAt: new Date(),
      status: 'in_progress',
    });

    const question = await groqService.startPracticeInterview({ role, skill, difficulty });
    res.json({ success: true, question, sessionId: session._id });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/ai/practice/respond - Practice interview AI response
router.post('/practice/respond', protect, async (req, res) => {
  try {
    const { answer, conversationHistory, role, skill, difficulty, questionNumber, totalQuestions } = req.body;

    const response = await groqService.evaluatePracticeAnswer({
      answer, conversationHistory, role, skill, difficulty, questionNumber, totalQuestions,
    });

    res.json({ success: true, response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/ai/resume/parse - Parse resume and extract info
router.post('/resume/parse', protect, async (req, res) => {
  try {
    const { text } = req.body;
    const parsed = await groqService.parseResume(text);
    res.json({ success: true, parsed });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/ai/job/match - Calculate job match score
router.post('/job/match', protect, async (req, res) => {
  try {
    const { jobDescription, candidateProfile } = req.body;
    const match = await groqService.calculateJobMatch({ jobDescription, candidateProfile });
    res.json({ success: true, match });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
