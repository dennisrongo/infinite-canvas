/**
 * Feature #81: Note content validation and sanitization - XSS Protection Test
 *
 * This script tests that XSS payloads are properly sanitized and don't execute.
 */

const XSS_PAYLOADS = [
  '<script>alert("XSS")</script>',
  '<script>alert(document.cookie)</script>',
  '<img src=x onerror=alert(1)>',
  '<img src="x" onerror="alert(\'XSS\')">',
  '<svg onload=alert(1)>',
  '<iframe src="javascript:alert(1)"></iframe>',
  '<body onload=alert(1)>',
  '<input onfocus=alert(1) autofocus>',
  '<select onfocus=alert(1) autofocus><option>',
  '<textarea onfocus=alert(1) autofocus>',
  '<marquee onstart=alert(1)>',
  '<video><source onerror=alert(1)>',
  '<audio src=x onerror=alert(1)>',
  '<details open ontoggle=alert(1)>',
  '<style>@import "javascript:alert(1)";</style>',
  '<style>body{background:url("javascript:alert(1)")}</style>',
  '<a href="javascript:alert(1)">click</a>',
  '<div onclick="alert(1)">click</div>',
];

async function testXSSEndpoint(payload) {
  const response = await fetch('http://localhost:3010/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'test_xss_user@example.com',
      password: 'Test1234!@#',
    }),
  });

  if (!response.ok) {
    // Create test user first
    const regResponse = await fetch('http://localhost:3010/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_xss_user@example.com',
        password: 'Test1234!@#',
      }),
    });

    if (!regResponse.ok) {
      console.error('Failed to create test user');
      return null;
    }

    // Login again
    const loginResponse = await fetch('http://localhost:3010/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_xss_user@example.com',
        password: 'Test1234!@#',
      }),
    });

    if (!loginResponse.ok) {
      console.error('Failed to login');
      return null;
    }

    const loginData = await loginResponse.json();
    return loginData.token;
  }

  const data = await response.json();
  return data.token;
}

async function createNoteWithPayload(token, payload) {
  // First get or create a canvas
  const canvasesResponse = await fetch('http://localhost:3010/api/canvases', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!canvasesResponse.ok) {
    console.error('Failed to fetch canvases');
    return null;
  }

  const canvasesData = await canvasesResponse.json();

  let canvasId;
  if (canvasesData.canvases && canvasesData.canvases.length > 0) {
    canvasId = canvasesData.canvases[0].id;
  } else {
    // Create a canvas
    const createCanvasResponse = await fetch('http://localhost:3010/api/canvases', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'XSS Test Canvas',
        folderId: null,
      }),
    });

    if (!createCanvasResponse.ok) {
      console.error('Failed to create canvas');
      return null;
    }

    const canvasData = await createCanvasResponse.json();
    canvasId = canvasData.canvas.id;
  }

  // Create note with XSS payload
  const createNoteResponse = await fetch(`http://localhost:3010/api/canvases/${canvasId}/notes`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `XSS Test - ${payload.substring(0, 30)}`,
      content: payload,
      positionX: 100,
      positionY: 100,
      width: 300,
      height: 200,
    }),
  });

  if (!createNoteResponse.ok) {
    const errorData = await createNoteResponse.json();
    console.error(`Failed to create note:`, errorData);
    return null;
  }

  const noteData = await createNoteResponse.json();
  return noteData.note;
}

async function testNoteContentSanitization() {
  console.log('='.repeat(80));
  console.log('Feature #81: XSS Protection Test');
  console.log('='.repeat(80));
  console.log('');

  // Test each payload
  let passed = 0;
  let failed = 0;

  for (const payload of XSS_PAYLOADS) {
    console.log(`Testing payload: ${payload.substring(0, 50)}...`);

    const token = await testXSSEndpoint(payload);
    if (!token) {
      console.error('❌ Failed to authenticate');
      failed++;
      continue;
    }

    const note = await createNoteWithPayload(token, payload);
    if (!note) {
      console.error('❌ Failed to create note');
      failed++;
      continue;
    }

    // Check if the payload was sanitized
    const content = note.content;

    // Check for dangerous patterns
    const hasScriptTag = content.includes('<script>');
    const hasOnerror = /onerror\s*=/i.test(content);
    const hasOnload = /onload\s*=/i.test(content);
    const hasOnclick = /onclick\s*=/i.test(content);
    const hasJavascriptHref = /href\s*=\s*["']javascript:/i.test(content);
    const hasIframe = content.includes('<iframe');
    const hasObject = content.includes('<object');
    const hasEmbed = content.includes('<embed');

    if (hasScriptTag || hasOnerror || hasOnload || hasOnclick || hasJavascriptHref || hasIframe || hasObject || hasEmbed) {
      console.error(`❌ XSS payload NOT sanitized!`);
      console.error(`   Original: ${payload}`);
      console.error(`   Stored:   ${content}`);
      failed++;
    } else {
      console.log(`✅ Payload sanitized successfully`);
      passed++;
    }

    // Clean up - delete the note
    try {
      await fetch(`http://localhost:3010/api/notes/${note.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      // Ignore cleanup errors
    }
  }

  console.log('');
  console.log('='.repeat(80));
  console.log('Test Results:');
  console.log(`  ✅ Passed: ${passed}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log(`  📊 Success Rate: ${((passed / XSS_PAYLOADS.length) * 100).toFixed(1)}%`);
  console.log('='.repeat(80));

  if (failed > 0) {
    console.error('\n⚠️  Some XSS payloads were NOT sanitized!');
    process.exit(1);
  } else {
    console.log('\n✅ All XSS payloads were successfully sanitized!');
    process.exit(0);
  }
}

// Run the test
testNoteContentSanitization().catch((error) => {
  console.error('Test failed with error:', error);
  process.exit(1);
});
