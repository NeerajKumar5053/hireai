const http = require('http');

const body = JSON.stringify({
  name: 'Admin',
  email: 'admin@hireai.com',
  password: 'admin123',
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/admin/bootstrap',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(body),
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const result = JSON.parse(data);
    if (result.success) {
      console.log('✅ Admin created! Email: admin@hireai.com | Password: admin123');
    } else {
      console.log('ℹ️ ', result.message);
    }
  });
});

req.on('error', (e) => console.error('Error:', e.message));
req.write(body);
req.end();
