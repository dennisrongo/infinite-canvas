const API_URL = 'http://localhost:50000';

async function createTestUser() {
  const uniqueId = Date.now();
  const email = `search_test_${uniqueId}@example.com`;
  const password = 'TestPass123!';
  const displayName = `Search Test User ${uniqueId}`;

  console.log('Creating test user for search features...');
  console.log('Email:', email);
  console.log('Password:', password);
  console.log('Display Name:', displayName);

  try {
    // Register user
    const registerResponse = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password,
        confirmPassword: password,
        displayName
      })
    });

    if (!registerResponse.ok) {
      const error = await registerResponse.text();
      console.error('Registration failed:', error);
      throw new Error('Registration failed');
    }

    const userData = await registerResponse.json();
    console.log('✓ User created successfully!');
    console.log('User ID:', userData.user.id);

    // Login to get token
    const loginResponse = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    if (!loginResponse.ok) {
      throw new Error('Login failed');
    }

    const loginData = await loginResponse.json();
    console.log('✓ Login successful!');
    console.log('Token:', loginData.token);

    // Create a test canvas
    const canvasResponse = await fetch(`${API_URL}/api/canvases`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${loginData.token}`
      },
      body: JSON.stringify({
        name: 'Search Test Canvas',
        folderId: null
      })
    });

    if (!canvasResponse.ok) {
      throw new Error('Canvas creation failed');
    }

    const canvas = await canvasResponse.json();
    console.log('✓ Canvas created!');
    console.log('Canvas ID:', canvas.id);

    // Create some test notes with various content
    const notes = [
      { title: 'JavaScript Notes', content: 'JavaScript is a programming language' },
      { title: 'Python Guide', content: 'Python is great for data science' },
      { title: 'React Tutorial', content: 'React is a JavaScript library for building UIs' },
      { title: 'Database Design', content: 'PostgreSQL is a powerful relational database' },
      { title: 'CSS Styling', content: 'CSS makes the web beautiful' },
      { title: 'Testing Guide', content: 'Testing is important for quality' },
      { title: 'Node.js Backend', content: 'Node.js allows JavaScript on the server' },
      { title: 'TypeScript Tips', content: 'TypeScript adds types to JavaScript' },
      { title: 'Web Development', content: 'Web development involves HTML, CSS, and JavaScript' },
      { title: 'API Design', content: 'RESTful APIs are common in web development' },
      { title: 'Security Best Practices', content: 'Always validate and sanitize user input' },
      { title: 'Performance Optimization', content: 'Optimize database queries and frontend code' }
    ];

    for (const note of notes) {
      const noteResponse = await fetch(`${API_URL}/api/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${loginData.token}`
        },
        body: JSON.stringify({
          canvasId: canvas.id,
          title: note.title,
          content: note.content,
          x: Math.random() * 500,
          y: Math.random() * 500
        })
      });

      if (!noteResponse.ok) {
        console.error('Failed to create note:', note.title);
      } else {
        console.log(`✓ Created note: ${note.title}`);
      }
    }

    console.log('\n========================================');
    console.log('TEST USER CREATED SUCCESSFULLY');
    console.log('========================================');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Canvas ID:', canvas.id);
    console.log('Notes created:', notes.length);
    console.log('========================================\n');

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

createTestUser();
