const http = require('http');

const data = JSON.stringify({
  email: 'test@example.com',
  password: 'Test123!@#',
  rememberMe: true
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  let cookies = res.headers['set-cookie'];
  console.log('Status:', res.statusCode);
  console.log('Cookies:', cookies);

  let body = '';
  res.on('data', (chunk) => { body += chunk; });
  res.on('end', () => {
    console.log('Response:', body);
  });
});

req.on('error', (e) => {
  console.error('Error:', e.message);
});

req.write(data);
req.end();
