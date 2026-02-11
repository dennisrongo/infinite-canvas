#!/usr/bin/env node

import http from 'http';

const BASE_URL = 'http://localhost:3010';

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: { 'Content-Type': 'application/json' }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: body ? JSON.parse(body) : null });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  console.log('Creating test user and canvas for Feature #75...');

  // Create user
  const user = await request('POST', '/api/auth/register', {
    email: 'feature75@test.com',
    password: 'Test1234!@#',
    displayName: 'Feature 75 Tester'
  });
  console.log('User created:', user.data?.user?.id);

  // Create canvas
  const canvas = await request('POST', '/api/canvases', {
    name: 'Feature 75 Test Canvas'
  });
  console.log('Canvas created:', canvas.data?.id);

  // Create notes
  const note1 = await request('POST', `/api/canvases/${canvas.data.id}/notes`, {
    title: 'JavaScript Basics',
    content: 'Learn JS',
    positionX: 100,
    positionY: 100
  });
  console.log('Note 1 created:', note1.data?.title);

  const note2 = await request('POST', `/api/canvases/${canvas.data.id}/notes`, {
    title: 'Python Tutorial',
    content: 'Learn Python',
    positionX: 300,
    positionY: 100
  });
  console.log('Note 2 created:', note2.data?.title);

  const note3 = await request('POST', `/api/canvases/${canvas.data.id}/notes`, {
    title: 'Java Programming',
    content: 'Learn Java',
    positionX: 500,
    positionY: 100
  });
  console.log('Note 3 created:', note3.data?.title);

  const note4 = await request('POST', `/api/canvases/${canvas.data.id}/notes`, {
    title: 'React Framework',
    content: 'Learn React',
    positionX: 100,
    positionY: 300
  });
  console.log('Note 4 created:', note4.data?.title);

  console.log('\n✅ Setup complete!');
  console.log('Use feature75@test.com / Test1234!@# to login');
}

main().catch(console.error);
