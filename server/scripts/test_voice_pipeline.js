/**
 * End-to-end voice pipeline test:
 * 1. Creates a minimal valid WAV file (1 second of silence)
 * 2. Sends it to Groq Whisper
 * 3. Tests the LLaMA interview/respond endpoint too
 */
require('dotenv').config();
const Groq = require('groq-sdk');
const { toFile } = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// Build a minimal PCM WAV buffer (1 second of silence at 16kHz, 16-bit mono)
function makeSilentWav(durationSecs = 1) {
  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const numSamples = sampleRate * durationSecs;
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);          // chunk size
  buf.writeUInt16LE(1, 20);           // PCM
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28);
  buf.writeUInt16LE(numChannels * bitsPerSample / 8, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  // rest is already 0 (silence)
  return buf;
}

async function testWhisper() {
  console.log('\n🎙️  Testing Groq Whisper transcription...');
  try {
    const wavBuffer = makeSilentWav(2);
    const blob = new Blob([wavBuffer], { type: 'audio/wav' });
    const audioFile = await toFile(blob, 'test.wav', { type: 'audio/wav' });

    const result = await groq.audio.transcriptions.create({
      file: audioFile,
      model: process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3',
      response_format: 'text',
      language: 'en',
    });

    console.log('✅ Whisper OK — transcript:', JSON.stringify(result));
  } catch (err) {
    console.error('❌ Whisper FAILED:', err.message);
    if (err.status) console.error('   HTTP status:', err.status);
  }
}

async function testLLaMA() {
  console.log('\n🤖  Testing Groq LLaMA interview/respond...');
  try {
    const model = process.env.GROQ_LLM_MODEL || 'llama-3.3-70b-versatile';
    const completion = await groq.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: 'You are an AI interviewer for a Full Stack Developer role. You are on question 1 of 8. Briefly acknowledge the answer and ask question 2.' },
        { role: 'user', content: 'I have 3 years of experience with React and Node.js.' },
      ],
      max_tokens: 150,
      temperature: 0.7,
    });
    console.log('✅ LLaMA OK — response:', completion.choices[0].message.content);
  } catch (err) {
    console.error('❌ LLaMA FAILED:', err.message);
  }
}

(async () => {
  await testWhisper();
  await testLLaMA();
  console.log('\nDone.');
})();
