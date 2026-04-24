const g = require('groq-sdk');
console.log('keys:', Object.keys(g).slice(0,20));
if (g.toFile) console.log('toFile: YES');
else console.log('toFile: NO - checking default export');
const Groq = g.default || g;
console.log('Groq type:', typeof Groq);
