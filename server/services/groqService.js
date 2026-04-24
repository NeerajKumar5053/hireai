const Groq = require('groq-sdk');
const { Readable } = require('stream');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const LLM_MODEL = process.env.GROQ_LLM_MODEL || 'llama-3.3-70b-versatile';
const WHISPER_MODEL = process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3';

// ─── TRANSCRIPTION ────────────────────────────────────────────────────────────

const transcribeAudio = async (audioBuffer, mimeType) => {
  try {
    const ext = mimeType?.includes('mp4') || mimeType?.includes('m4a') ? 'm4a'
      : mimeType?.includes('ogg') ? 'ogg'
      : mimeType?.includes('wav') ? 'wav'
      : 'webm';
    
    const fs = require('fs');
    const path = require('path');
    const tempPath = path.join(__dirname, `../temp_audio_${Date.now()}.${ext}`);
    
    // Write raw Buffer to disk natively
    fs.writeFileSync(tempPath, audioBuffer);
    
    // Read directly as a Stream to bypass FormData/Blob memory corruption bugs
    const audioFile = fs.createReadStream(tempPath);

    let transcription;
    try {
      transcription = await groq.audio.transcriptions.create({
        file: audioFile,
        model: WHISPER_MODEL,
        response_format: 'verbose_json',
        language: 'en',
      });
    } finally {
      // Clean up the temp file
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
    }

    // verbose_json returns an object; extract the text
    const text = typeof transcription === 'string'
      ? transcription
      : transcription?.text || '';

    console.log(`[Whisper] transcribed (${audioBuffer.length} bytes): "${text}"`);
    return text;
  } catch (err) {
    console.error('Whisper transcription error:', err.message);
    throw new Error('Failed to transcribe audio: ' + err.message);
  }
};


// ─── INTERVIEW ────────────────────────────────────────────────────────────────

const startInterview = async ({ jobTitle, jobDescription, requirements, skills, mode, customQuestions }) => {
  const systemPrompt = `You are an expert AI interviewer for a ${jobTitle} position. Your job is to conduct a professional, thorough interview.

Job Details:
- Title: ${jobTitle}
- Description: ${jobDescription || 'Not provided'}
- Requirements: ${requirements || 'Not provided'}
- Key Skills: ${skills ? skills.join(', ') : 'Not specified'}

Interview Guidelines:
- Ask one question at a time
- Be professional yet conversational
- Start with a warm introduction and an easy opening question
- Progress from easy to harder questions
- Focus on technical skills, problem-solving, and behavioral aspects
${mode === 'assisted' && customQuestions?.length ? `- You MUST ask these specific questions: ${customQuestions.join(' | ')}` : '- Generate relevant questions based on the job description'}

Start the interview now with a brief, warm introduction (2-3 sentences) and your FIRST question only.`;

  const completion = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [{ role: 'system', content: systemPrompt }],
    temperature: 0.7,
    max_tokens: 300,
  });

  return completion.choices[0].message.content;
};

const evaluateAndRespond = async ({ answer, conversationHistory, jobTitle, questionNumber, totalQuestions }) => {
  const isLastQuestion = questionNumber >= totalQuestions;

  const systemPrompt = `You are a sharp, professional AI interviewer conducting a real job interview for a ${jobTitle} position. This is question ${questionNumber} of ${totalQuestions}.

The candidate just answered the previous question. Your job is to:
1. READ their answer carefully — identify what they said, what they got right, what's missing or vague.
2. Respond in a NATURAL, conversational way that directly references what THEY said — don't be generic.
3. ${isLastQuestion
    ? 'This is the FINAL question. Wrap up the interview warmly, acknowledge their overall performance briefly, and tell them the interview is now complete.'
    : `Ask a FOLLOW-UP or NEXT question that:
   - If their answer was incomplete or vague: dig deeper into what they just said (e.g. "You mentioned X — can you elaborate on how you actually implemented that?")
   - If their answer was good: move to a logically connected, harder topic
   - If their answer was off-topic or wrong: politely correct course and ask a clearer version
   Always make the next question feel like a natural progression from what they just said.`}

IMPORTANT RULES:
- Your response must clearly reference details from what the candidate JUST said
- NEVER give a generic response that could fit any answer
- Keep your response to 3-5 sentences maximum
- Do NOT score or evaluate out loud — just conduct the interview naturally
- Sound like a real human interviewer, not a script`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...conversationHistory.map(item => ({
      role: item.role === 'ai' ? 'assistant' : 'user',
      content: item.message,
    })),
    { role: 'user', content: answer },
  ];

  const completion = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages,
    temperature: 0.75,
    max_tokens: 500,
  });

  return completion.choices[0].message.content;
};

// ─── PRACTICE ─────────────────────────────────────────────────────────────────

const startPracticeInterview = async ({ role, skill, difficulty }) => {
  const difficultyDesc = {
    beginner: 'beginner-friendly, foundational',
    intermediate: 'intermediate level, requiring solid understanding',
    advanced: 'advanced, requiring deep expertise and experience',
  }[difficulty] || 'intermediate level';

  const systemPrompt = `You are an expert interviewer conducting a practice interview for: ${role} - ${skill} (${difficultyDesc} difficulty).

Start with a warm, encouraging welcome message (since this is practice) and ask your FIRST question.
The question should be ${difficultyDesc} appropriate for the role.
Keep your response concise.`;

  const completion = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [{ role: 'system', content: systemPrompt }],
    temperature: 0.7,
    max_tokens: 350,
  });

  return completion.choices[0].message.content;
};

const evaluatePracticeAnswer = async ({ answer, conversationHistory, role, skill, difficulty, questionNumber, totalQuestions }) => {
  const isLast = questionNumber >= totalQuestions;

  const messages = [
    {
      role: 'system',
      content: `You are an expert, encouraging practice interview coach for ${role} — ${skill} (${difficulty} difficulty). This is question ${questionNumber} of ${totalQuestions}.

The candidate just gave an answer. Your job:
1. Give SPECIFIC feedback on what they ACTUALLY said — mention their exact points by name
2. Point out ONE thing they did well and ONE thing they could strengthen (briefly)
3. ${isLast
  ? 'This is the final question. Wrap up warmly, give a short encouraging summary of the practice session, and tell them they did great for completing it.'
  : `Ask the NEXT question which should:
   - Build naturally on what they just discussed
   - If their answer was incomplete: ask them to expand on the specific part they skimmed
   - If their answer was strong: go one level deeper or to an adjacent topic
   - Match the ${difficulty} difficulty level`}

RULES:
- Always reference something specific from their actual answer (e.g. "You mentioned Redux — let's dig into that")
- Be encouraging but honest — don't just say 'Great answer!' generically
- Keep it conversational, 3-5 sentences max
- Sound like a real mentor who actually listened`,
    },
    ...conversationHistory.map(item => ({
      role: item.role === 'ai' ? 'assistant' : 'user',
      content: item.message,
    })),
    { role: 'user', content: answer },
  ];

  const completion = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 450,
  });

  return completion.choices[0].message.content;
};

// ─── REPORT GENERATION ────────────────────────────────────────────────────────

const generateReport = async ({ transcript, emotionData, cheatEvents, jobTitle, isPractice }) => {
  const conversationText = transcript
    .map(t => `${t.role === 'ai' ? 'Interviewer' : 'Candidate'}: ${t.message}`)
    .join('\n');

  // Analyze dominant emotions
  const emotionAggregates = {};
  if (emotionData && emotionData.length > 0) {
    emotionData.forEach(snap => {
      if (snap.emotions) {
        Object.entries(snap.emotions).forEach(([emotion, value]) => {
          emotionAggregates[emotion] = (emotionAggregates[emotion] || 0) + value;
        });
      }
    });
    const total = emotionData.length;
    Object.keys(emotionAggregates).forEach(k => {
      emotionAggregates[k] = (emotionAggregates[k] / total * 100).toFixed(1);
    });
  }

  const cheatSummary = cheatEvents && cheatEvents.length > 0
    ? `Integrity events: ${cheatEvents.map(e => e.type).join(', ')}`
    : 'No integrity issues detected';

  const prompt = `You are an expert interview evaluator. Analyze the following ${isPractice ? 'practice' : 'job'} interview transcript for "${jobTitle || 'the role'}" and provide a comprehensive evaluation.

INTERVIEW TRANSCRIPT:
${conversationText}

EMOTION DATA (average %):
${JSON.stringify(emotionAggregates, null, 2)}

INTEGRITY CHECK: ${cheatSummary}

Provide your analysis in the following EXACT JSON format (respond ONLY with valid JSON, no markdown):
{
  "overallScore": <0-100>,
  "communicationScore": <0-100>,
  "technicalScore": <0-100>,
  "confidenceScore": <0-100>,
  "report": {
    "summary": "<2-3 sentence overall summary>",
    "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "weaknesses": ["<area 1>", "<area 2>"],
    "recommendation": "<strong_yes|yes|maybe|no>",
    "detailedAnalysis": "<3-4 paragraph detailed analysis of performance>",
    "questionAnalysis": [
      {
        "question": "<question asked>",
        "answer": "<brief summary of answer>",
        "score": <0-100>,
        "feedback": "<specific feedback>"
      }
    ],
    "emotionSummary": "<2 sentences analyzing emotional patterns>",
    "cheatingAnalysis": "<1-2 sentences on integrity>"
  }
}`;

  const completion = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.3,
    max_tokens: 3000,
  });

  const responseText = completion.choices[0].message.content;

  try {
    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON in response');
    return JSON.parse(jsonMatch[0]);
  } catch (e) {
    console.error('Report parse error:', e.message);
    // Return fallback report
    return {
      overallScore: 70,
      communicationScore: 70,
      technicalScore: 70,
      confidenceScore: 70,
      report: {
        summary: 'Interview completed. Report generation encountered an issue.',
        strengths: ['Participated in the interview'],
        weaknesses: ['Could not fully analyze responses'],
        recommendation: 'maybe',
        detailedAnalysis: responseText.substring(0, 500),
        questionAnalysis: [],
        emotionSummary: 'Emotion analysis complete.',
        cheatingAnalysis: cheatSummary,
      },
    };
  }
};

// ─── RESUME PARSER ────────────────────────────────────────────────────────────

const parseResume = async (resumeText) => {
  const prompt = `Extract structured information from this resume text. Return ONLY valid JSON:
{
  "name": "",
  "email": "",
  "phone": "",
  "location": "",
  "headline": "",
  "skills": [],
  "experience": "fresher|entry|mid|senior|lead",
  "totalExperienceYears": 0,
  "education": [{"degree": "", "institution": "", "year": ""}],
  "workHistory": [{"company": "", "role": "", "duration": "", "description": ""}],
  "certifications": [],
  "languages": []
}

Resume Text:
${resumeText.substring(0, 3000)}`;

  const completion = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.1,
    max_tokens: 1000,
  });

  const text = completion.choices[0].message.content;
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
  } catch (e) {
    return {};
  }
};

// ─── JOB MATCH ────────────────────────────────────────────────────────────────

const calculateJobMatch = async ({ jobDescription, candidateProfile }) => {
  const prompt = `Calculate how well this candidate matches the job. Return ONLY valid JSON:
{
  "matchScore": <0-100>,
  "matchedSkills": [],
  "missingSkills": [],
  "experienceMatch": "strong|partial|weak",
  "summary": "<2 sentences>"
}

Job: ${JSON.stringify(jobDescription).substring(0, 1000)}
Candidate: ${JSON.stringify(candidateProfile).substring(0, 1000)}`;

  const completion = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
    max_tokens: 500,
  });

  try {
    const text = completion.choices[0].message.content;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { matchScore: 50 };
  } catch (e) {
    return { matchScore: 50 };
  }
};

module.exports = {
  transcribeAudio,
  startInterview,
  evaluateAndRespond,
  startPracticeInterview,
  evaluatePracticeAnswer,
  generateReport,
  parseResume,
  calculateJobMatch,
};
