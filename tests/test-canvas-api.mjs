const testCanvasAPI = async () => {
  const response = await fetch('http://localhost:3015/api/canvases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ name: 'Test Canvas API' })
  });

  console.log('Status:', response.status);
  const text = await response.text();
  console.log('Response:', text);
};

testCanvasAPI().catch(console.error);
