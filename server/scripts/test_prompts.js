/**
 * Test the improved AI prompts — verify AI responds specifically to the answer
 */
require('dotenv').config();
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const LLM_MODEL = process.env.GROQ_LLM_MODEL || 'llama-3.3-70b-versatile';

async function testContextualResponse() {
  console.log('\n🤖 Testing contextual AI response (old prompt vs new prompt)\n');

  const candidateAnswer = "I've worked with React for about 2 years. I mainly use useState and useEffect hooks. For state management I use Redux but I'm not very comfortable with async actions in it.";
  const jobTitle = "Senior React Developer";

  // Old generic prompt
  const oldPrompt = `You are an AI interviewer for a ${jobTitle} position. You are currently on question 2 of 8.

Your task:
1. Briefly acknowledge the candidate's answer (1 sentence max)
2. Ask the NEXT interview question. Make it progressively more challenging.

Keep your response concise and natural.`;

  // New contextual prompt
  const newPrompt = `You are a sharp, professional AI interviewer conducting a real job interview for a ${jobTitle} position. This is question 2 of 8.

The candidate just answered the previous question. Your job is to:
1. READ their answer carefully — identify what they said, what they got right, what's missing or vague.
2. Respond in a NATURAL, conversational way that directly references what THEY said — don't be generic.
3. Ask a FOLLOW-UP or NEXT question that:
   - If their answer was incomplete or vague: dig deeper into what they just said (e.g. "You mentioned X — can you elaborate on how you actually implemented that?")
   - If their answer was good: move to a logically connected, harder topic
   - If their answer was off-topic or wrong: politely correct course and ask a clearer version
   Always make the next question feel like a natural progression from what they just said.

IMPORTANT RULES:
- Your response must clearly reference details from what the candidate JUST said
- NEVER give a generic response that could fit any answer
- Keep your response to 3-5 sentences maximum
- Do NOT score or evaluate out loud — just conduct the interview naturally
- Sound like a real human interviewer, not a script`;

  const history = [
    { role: 'assistant', content: 'Tell me about your React experience — what aspects have you worked with most?' },
    { role: 'user', content: candidateAnswer },
  ];

  console.log('📝 Candidate said:', candidateAnswer);
  console.log('\n─────────────────────────────────────');

  // Old
  const old = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [{ role: 'system', content: oldPrompt }, ...history],
    max_tokens: 300,
  });
  console.log('\n❌ OLD (generic) AI response:');
  console.log(old.choices[0].message.content);

  // New
  const neu = await groq.chat.completions.create({
    model: LLM_MODEL,
    messages: [{ role: 'system', content: newPrompt }, ...history],
    max_tokens: 500,
    temperature: 0.75,
  });
  console.log('\n✅ NEW (contextual) AI response:');
  console.log(neu.choices[0].message.content);
}

testContextualResponse().catch(console.error);
