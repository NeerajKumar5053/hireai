const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'localhost', port: 5000, path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    };
    const req = http.request(options, (res) => {
      let d = '';
      res.on('data', (chunk) => { d += chunk; });
      res.on('end', () => resolve(JSON.parse(d)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function seed() {
  console.log('🌱 Seeding demo accounts...\n');

  // Recruiter
  try {
    const r = await post('/api/auth/register', {
      name: 'TechCorp Recruiter',
      email: 'recruiter@hireai.com',
      password: 'pass123',
      role: 'recruiter',
      company: 'TechCorp India',
    });
    if (r.success || r.token) {
      console.log('✅ Recruiter created: recruiter@hireai.com / pass123');
    } else {
      console.log('ℹ️  Recruiter:', r.message);
    }
  } catch (e) { console.error('Recruiter error:', e.message); }

  // Candidate
  try {
    const c = await post('/api/auth/register', {
      name: 'Demo Candidate',
      email: 'candidate@hireai.com',
      password: 'pass123',
      role: 'candidate',
    });
    if (c.success || c.token) {
      console.log('✅ Candidate created: candidate@hireai.com / pass123');
    } else {
      console.log('ℹ️  Candidate:', c.message);
    }
  } catch (e) { console.error('Candidate error:', e.message); }

  console.log('\n🎉 Done! You can now log in at http://localhost:5173');
  console.log('   Admin:     admin@hireai.com     / admin123');
  console.log('   Recruiter: recruiter@hireai.com / pass123');
  console.log('   Candidate: candidate@hireai.com / pass123');
}

seed();
