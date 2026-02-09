/**
 * Create test user for undo/redo features testing
 */

async function createTestUser() {
  const port = 55556;
  const baseUrl = `http://localhost:${port}`;

  try {
    console.log('Creating test user for undo/redo testing...\n');

    // Register user
    const registerResponse = await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_undoredo@example.com',
        password: 'Test1234!',
        confirmPassword: 'Test1234!'
      })
    });

    const registerData = await registerResponse.json();

    if (registerResponse.ok) {
      console.log('✅ User registered successfully');
    } else if (registerResponse.status === 400 && registerData.error.includes('already exists')) {
      console.log('✅ User already exists');
    } else {
      console.error('❌ Registration failed:', registerData.error);
      process.exit(1);
    }

    // Login to get session
    const loginResponse = await fetch(`${baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_undoredo@example.com',
        password: 'Test1234!'
      })
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok) {
      console.error('❌ Login failed:', loginData.error);
      process.exit(1);
    }

    console.log('✅ Login successful');

    // Get all canvases
    const canvasesResponse = await fetch(`${baseUrl}/api/canvases`, {
      headers: {
        'Cookie': loginResponse.sessionCookie || `session=${loginData.token}`
      }
    });

    const canvasesData = await canvasesResponse.json();

    if (canvasesResponse.ok && canvasesData.canvases && canvasesData.canvases.length > 0) {
      console.log(`\n✅ Found ${canvasesData.canvases.length} existing canvas(es)`);

      // Find or create test canvas
      let testCanvas = canvasesData.canvases.find(c => c.name === 'Undo Redo Test Canvas');

      if (testCanvas) {
        console.log(`✅ Using existing canvas: ${testCanvas.id}`);
      } else {
        // Create canvas
        const createCanvasResponse = await fetch(`${baseUrl}/api/canvases`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': loginResponse.sessionCookie || `session=${loginData.token}`
          },
          body: JSON.stringify({
            name: 'Undo Redo Test Canvas',
            folderId: null
          })
        });

        const createCanvasData = await createCanvasResponse.json();

        if (createCanvasResponse.ok) {
          testCanvas = createCanvasData.canvas;
          console.log(`✅ Created canvas: ${testCanvas.id}`);
        } else {
          console.error('❌ Failed to create canvas:', createCanvasData.error);
          process.exit(1);
        }
      }

      // Check if notes exist
      if (testCanvas.notes && testCanvas.notes.length > 0) {
        console.log(`\n✅ Canvas has ${testCanvas.notes.length} existing notes`);
      } else {
        console.log('\n📝 Creating test notes...');

        // Create test note 1
        const note1Response = await fetch(`${baseUrl}/api/canvases/${testCanvas.id}/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': loginResponse.sessionCookie || `session=${loginData.token}`
          },
          body: JSON.stringify({
            title: 'Test Note 1',
            content: 'This is a test note for undo/redo testing',
            positionX: 100,
            positionY: 100,
            width: 300,
            height: 200
          })
        });

        if (note1Response.ok) {
          console.log('✅ Created Test Note 1');
        }

        // Create test note 2
        const note2Response = await fetch(`${baseUrl}/api/canvases/${testCanvas.id}/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': loginResponse.sessionCookie || `session=${loginData.token}`
          },
          body: JSON.stringify({
            title: 'Test Note 2',
            content: 'Another test note',
            positionX: 500,
            positionY: 100,
            width: 300,
            height: 200
          })
        });

        if (note2Response.ok) {
          console.log('✅ Created Test Note 2');
        }

        // Create note for undo shortcut test
        const note3Response = await fetch(`${baseUrl}/api/canvases/${testCanvas.id}/notes`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Cookie': loginResponse.sessionCookie || `session=${loginData.token}`
          },
          body: JSON.stringify({
            title: 'UNDO_SHORTCUT_TEST',
            content: 'This note will test the undo shortcut',
            positionX: 300,
            positionY: 400,
            width: 300,
            height: 200
          })
        });

        if (note3Response.ok) {
          console.log('✅ Created UNDO_SHORTCUT_TEST note');
        }
      }

      console.log('\n=== TEST CREDENTIALS ===');
      console.log('Email: test_undoredo@example.com');
      console.log('Password: Test1234!');
      console.log('Canvas ID:', testCanvas.id);
      console.log('Canvas URL:', `${baseUrl}/canvas/${testCanvas.id}`);
      console.log('=======================\n');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

createTestUser();
