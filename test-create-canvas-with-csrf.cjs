// Test script to create a canvas with proper CSRF token
const http = require('http');

// Auth token from our session
const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzMmQ5YmE1ZC0xMzZiLTQ3OGYtODYwMy0xNjdlM2IyYzE4MWYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3NzA2NjMzOTAsImV4cCI6MTc3MTI2ODE5MH0.Kp1NoVmAgnB5xy39CZvViK46iwRIuJUVQMQ8qO6S5Zk';

// First, get the CSRF token
const csrfOptions = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/auth/csrf',
  method: 'GET',
  headers: {
    'Cookie': `auth_token=${authToken}`
  }
};

const csrfReq = http.request(csrfOptions, (csrfRes) => {
  let body = '';
  csrfRes.on('data', (chunk) => { body += chunk; });
  csrfRes.on('end', () => {
    const csrfData = JSON.parse(body);
    console.log('CSRF Token:', csrfData.csrfToken);

    // Now create canvas with CSRF token
    const canvasData = JSON.stringify({ name: 'TEST_CANVAS_16_FEATURE_SCRIPT_12345' });

    const createOptions = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/canvases',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': canvasData.length,
        'Cookie': `auth_token=${authToken}; csrf_token=${csrfData.csrfToken}`,
        'x-csrf-token': csrfData.csrfToken
      }
    };

    const createReq = http.request(createOptions, (createRes) => {
      let createBody = '';
      createRes.on('data', (chunk) => { createBody += chunk; });
      createRes.on('end', () => {
        console.log('Status:', createRes.statusCode);
        console.log('Response:', createBody);
      });
    });

    createReq.on('error', (e) => {
      console.error('Error creating canvas:', e.message);
    });

    createReq.write(canvasData);
    createReq.end();
  });
});

csrfReq.on('error', (e) => {
  console.error('Error getting CSRF token:', e.message);
});

csrfReq.end();
