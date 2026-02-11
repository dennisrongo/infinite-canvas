import http from 'http';

const BASE_URL = 'http://localhost:34568';
const TEST_USER = {
  email: 'test_features_55_56_57@example.com',
  password: 'test123456'
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
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        // Store auth cookie
        const setCookie = res.headers['set-cookie'];
        if (setCookie) {
          authCookie = setCookie[0].split(';')[0];
        }
        try {
          resolve({ status: res.statusCode, body: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, body });
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

async function main() {
  // Login
  console.log('Logging in...');
  const loginRes = await request('POST', '/api/auth/login', TEST_USER);
  console.log('Login status:', loginRes.status);

  if (loginRes.status !== 200) {
    console.error('Login failed:', loginRes.body);
    return;
  }

  // Create canvas
  console.log('Creating test canvas...');
  const canvasRes = await request('POST', '/api/canvases', {
    name: 'Theme Test Canvas',
    folderId: null
  });
  console.log('Canvas created:', canvasRes.body);
}

main().catch(console.error);
