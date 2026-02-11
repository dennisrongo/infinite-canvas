#!/usr/bin/env node

import http from 'http';

const API_URL = 'http://localhost:4003';

// Test 1: Check if API is responding
console.log('Testing API availability...');

const testReq = http.request({
  hostname: 'localhost',
  port: 4003,
  path: '/api/health',
  method: 'GET',
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Health check response:', res.statusCode, body);
  });
});

testReq.on('error', (err) => {
  console.error('Health check failed:', err.message);
});

testReq.end();

// Test 2: Try login with simpler test
const loginData = JSON.stringify({
  email: 'feature49@example.com',
  password: 'Test1234!@#',
});

const loginReq = http.request({
  hostname: 'localhost',
  port: 4003,
  path: '/api/auth/login',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(loginData),
  },
}, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log('Login response:', res.statusCode);
    console.log('Body:', body.substring(0, 200));
  });
});

loginReq.on('error', (err) => {
  console.error('Login failed:', err.message);
});

loginReq.write(loginData);
loginReq.end();

setTimeout(() => {
  console.log('Tests completed');
}, 5000);
