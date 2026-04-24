require('dotenv').config();
const Groq = require('groq-sdk');
const { toFile } = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testWav() {
  const fs = require('fs');
  // Read a real audio file if available, or just test Buffer vs Blob logic
  // Let's create a sine wave buffer instead of silence

  const sampleRate = 16000;
  const numSamples = sampleRate * 2;
  const numChannels = 1;
  const bitsPerSample = 16;
  const dataSize = numSamples * numChannels * (bitsPerSample / 8);
  const buf = Buffer.alloc(44 + dataSize);

  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + dataSize, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);          
  buf.writeUInt16LE(1, 20);           
  buf.writeUInt16LE(numChannels, 22);
  buf.writeUInt32LE(sampleRate, 24);
  buf.writeUInt32LE(sampleRate * numChannels * bitsPerSample / 8, 28);
  buf.writeUInt16LE(numChannels * bitsPerSample / 8, 32);
  buf.writeUInt16LE(bitsPerSample, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(dataSize, 40);
  
  // write a 440hz sine wave
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const value = Math.sin(t * 440 * Math.PI * 2) * 32760;
    buf.writeInt16LE(value, 44 + i * 2);
  }

  try {
    // Test 1: Using Buffer directly
    const authFileBuf = await toFile(buf, 'test1.wav', { type: 'audio/wav' });
    const res1 = await groq.audio.transcriptions.create({
      file: authFileBuf,
      model: 'whisper-large-v3',
    });
    console.log('Buffer -> Whisper:', res1.text);

    // Test 2: Using Blob
    const blob = new Blob([buf], { type: 'audio/wav' });
    const authFileBlob = await toFile(blob, 'test2.wav', { type: 'audio/wav' });
    const res2 = await groq.audio.transcriptions.create({
      file: authFileBlob,
      model: 'whisper-large-v3',
    });
    console.log('Blob -> Whisper:', res2.text);
  } catch (e) {
    console.error('Error:', e.message);
  }
}
testWav();
