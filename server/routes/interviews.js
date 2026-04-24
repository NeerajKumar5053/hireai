const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Interview = require('../models/Interview');
const InterviewSession = require('../models/InterviewSession');

// @route POST /api/interviews/:id/start - Start interview session
router.post('/:id/start', protect, async (req, res) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

    // Check authorization
    const userId = req.user._id.toString();
    const isParticipant = interview.candidate.toString() === userId ||
      (interview.recruiter && interview.recruiter.toString() === userId);

    if (!isParticipant) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    // Create or get session
    let session = await InterviewSession.findOne({ interview: interview._id });
    if (!session) {
      session = await InterviewSession.create({
        interview: interview._id,
        candidate: interview.candidate,
        recruiter: interview.recruiter,
        startedAt: new Date(),
        status: 'in_progress',
      });
      interview.status = 'in_progress';
      interview.session = session._id;
      await interview.save();
    }

    res.json({ success: true, session, interview });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/interviews/:id/end - End interview session
router.post('/:id/end', protect, async (req, res) => {
  try {
    const { emotionData, cheatEvents, transcript } = req.body;
    const interview = await Interview.findById(req.params.id);
    if (!interview) return res.status(404).json({ success: false, message: 'Interview not found' });

    const session = await InterviewSession.findById(interview.session);
    if (session) {
      if (emotionData) session.emotionData = emotionData;
      if (cheatEvents) session.cheatEvents = cheatEvents;
      if (transcript) session.transcript = transcript;

      // Calculate integrity score
      let integrityScore = 100;
      if (session.cheatEvents) {
        session.cheatEvents.forEach(e => {
          if (e.type === 'tab_switch') integrityScore -= 5;
          else if (e.type === 'multiple_faces') integrityScore -= 10;
          else if (e.type === 'eyes_away') integrityScore -= 3;
          else if (e.type === 'audio_anomaly') integrityScore -= 3;
          else if (e.type === 'copy_paste') integrityScore -= 5;
        });
      }
      session.integrityScore = Math.max(0, integrityScore);
      session.endedAt = new Date();
      session.status = 'completed';
      const durationMs = session.endedAt - session.startedAt;
      session.duration = Math.round(durationMs / 60000);
      await session.save();
    }

    interview.status = 'completed';
    await interview.save();

    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route GET /api/interviews/:id/session - Get session data
router.get('/:id/session', protect, async (req, res) => {
  try {
    const session = await InterviewSession.findById(req.params.id)
      .populate('candidate', 'name email avatar')
      .populate('interview');
    if (!session) return res.status(404).json({ success: false, message: 'Session not found' });
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// @route POST /api/interviews/session/:id/save-report - Save AI generated report
router.post('/session/:id/save-report', protect, async (req, res) => {
  try {
    const session = await InterviewSession.findByIdAndUpdate(
      req.params.id,
      {
        report: req.body.report,
        overallScore: req.body.overallScore,
        communicationScore: req.body.communicationScore,
        technicalScore: req.body.technicalScore,
        confidenceScore: req.body.confidenceScore,
      },
      { new: true }
    );
    res.json({ success: true, session });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
