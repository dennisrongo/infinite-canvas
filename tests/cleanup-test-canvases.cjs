const http = require('http');

const authToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiIzMmQ5YmE1ZC0xMzZiLTQ3OGYtODYwMy0xNjdlM2IyYzE4MWYiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJpYXQiOjE3NzA2NjMzOTAsImV4cCI6MTc3MTI2ODE5MH0.Kp1NoVmAgnB5xy39CZvViK46iwRIuJUVQMQ8qO6S5Zk';

// Canvas IDs to delete
const canvasIds = [
  '6ba237b6-7a82-40ad-84f4-7d5b54c679d6', // TEST_CANVAS_UI_V2_12345
  '6e58eb29-e04b-4c88-bb10-5c826b811173', // TEST_CANVAS_16_FEATURE_SCRIPT_12345
];

// Get CSRF token first
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

    // Delete each canvas
    let deleted = 0;
    canvasIds.forEach((canvasId, index) => {
      setTimeout(() => {
        const deleteOptions = {
          hostname: 'localhost',
          port: 3000,
          path: `/api/canvases/${canvasId}`,
          method: 'DELETE',
          headers: {
            'Cookie': `auth_token=${authToken}`,
            'x-csrf-token': csrfData.csrfToken
          }
        };

        const deleteReq = http.request(deleteOptions, (deleteRes) => {
          let deleteBody = '';
          deleteRes.on('data', (chunk) => { deleteBody += chunk; });
          deleteRes.on('end', () => {
            console.log(`Deleted canvas ${canvasId}: ${deleteRes.statusCode}`);
            deleted++;
            if (deleted === canvasIds.length) {
              console.log('All test canvases cleaned up!');
            }
          });
        });

        deleteReq.on('error', (e) => {
          console.error(`Error deleting canvas ${canvasId}:`, e.message);
        });

        deleteReq.end();
      }, index * 500); // Stagger requests
    });
  });
});

csrfReq.on('error', (e) => {
  console.error('Error getting CSRF token:', e.message);
});

csrfReq.end();
