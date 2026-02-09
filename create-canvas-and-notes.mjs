import http from 'http';

const BASE_URL = 'http://localhost:13579';
const TEST_USER = {
  email: 'autosave1770604588088@test.com',
  password: 'TestPassword123!'
};

let authCookie = '';

function request(method, path, data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (authCookie) {
      options.headers['Cookie'] = authCookie;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        if (res.headers['set-cookie']) {
          authCookie = res.headers['set-cookie'][0];
        }
        resolve({
          status: res.statusCode,
          body: body ? JSON.parse(body) : null
        });
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function login() {
  const res = await request('POST', '/api/auth/login', TEST_USER);
  if (res.status !== 200) {
    throw new Error(`Login failed: ${res.status}`);
  }
  console.log('✅ Logged in');
}

async function createCanvas(name) {
  const res = await request('POST', '/api/canvases', { name });
  if (res.status === 201 || res.status === 200) {
    console.log(`✅ Created canvas: ${res.body.canvas.name}`);
    return res.body.canvas;
  }
  throw new Error(`Failed to create canvas: ${res.status}`);
}

async function createNote(canvasId, noteData) {
  const res = await request('POST', `/api/canvases/${canvasId}/notes`, noteData);
  if (res.status === 201 || res.status === 200) {
    console.log(`✅ Created note: ${res.body.note.title}`);
    return res.body.note;
  }
  throw new Error(`Failed to create note: ${res.status}`);
}

async function main() {
  try {
    await login();

    // Create canvas
    const canvas = await createCanvas('Auto-save Test Canvas');

    // Create a few notes
    await createNote(canvas.id, {
      title: 'Test Note 1',
      content: 'This is a test note for auto-save functionality.',
      positionX: 100,
      positionY: 100,
      width: 300,
      height: 200
    });

    await createNote(canvas.id, {
      title: 'Test Note 2',
      content: 'Another test note with different content.',
      positionX: 500,
      positionY: 100,
      width: 300,
      height: 200
    });

    console.log('\n✅ Setup complete! Ready to test auto-save features.');
    console.log(`Canvas ID: ${canvas.id}`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
