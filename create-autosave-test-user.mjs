import http from 'http';

const BASE_URL = 'http://localhost:13579';

function request(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({
        status: res.statusCode,
        body: body ? JSON.parse(body) : null
      }));
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function createTestUser() {
  const timestamp = Date.now();
  const userData = {
    email: `autosave${timestamp}@test.com`,
    password: 'TestPassword123!',
    confirmPassword: 'TestPassword123!',
    displayName: 'Auto-save Test User'
  };

  console.log('Creating test user:', userData.email);

  const res = await request('POST', '/api/auth/register', userData);

  if (res.status === 201 || res.status === 200) {
    console.log('✅ User created successfully');
    console.log('Email:', userData.email);
    console.log('Password:', userData.password);
    return userData;
  } else if (res.status === 400 && res.body?.error?.includes('already exists')) {
    console.log('⚠️  User already exists, using existing credentials');
    return userData;
  } else {
    console.log('❌ Failed to create user:', res.status, res.body);
    throw new Error('Failed to create test user');
  }
}

createTestUser()
  .then(user => {
    console.log('\nAdd these credentials to your test script:');
    console.log(`email: '${user.email}',`);
    console.log(`password: '${user.password}',`);
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
