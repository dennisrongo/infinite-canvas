#!/usr/bin/env node

/**
 * Feature #28: Canvas switching preserves state - Database Verification Test
 *
 * This test verifies that the database can store and retrieve viewport state
 * (zoom level, pan position) for canvases.
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const TEST_EMAIL = 'feature28-viewport@example.com';

console.log('='.repeat(80));
console.log('Feature #28: Canvas State Preservation - DATABASE TEST');
console.log('='.repeat(80));

async function cleanup() {
  console.log('\n[1/8] Cleaning up previous test data...');
  try {
    await prisma.user.deleteMany({
      where: { email: TEST_EMAIL }
    });
    console.log('✅ Cleanup complete');
  } catch (error) {
    console.log('ℹ️  No existing test data to clean');
  }
}

async function createTestUser() {
  console.log('\n[2/8] Creating test user...');

  const user = await prisma.user.create({
    data: {
      email: TEST_EMAIL,
      passwordHash: 'test_hash_only',
      displayName: 'Feature 28 Test User',
    }
  });

  console.log(`✅ User created: ${user.id}`);
  return user;
}

async function createTestCanvases(userId) {
  console.log('\n[3/8] Creating test canvases with viewport state...');

  // Create Canvas A with viewport state
  const canvasA = await prisma.canvas.create({
    data: {
      userId,
      name: 'Canvas A - Viewport Test',
      viewportX: 100.5,
      viewportY: 200.3,
      zoom: 1.5,
    }
  });
  console.log(`✅ Created Canvas A with viewport: x=${canvasA.viewportX}, y=${canvasA.viewportY}, zoom=${canvasA.zoom}`);

  // Create Canvas B with different viewport state
  const canvasB = await prisma.canvas.create({
    data: {
      userId,
      name: 'Canvas B - Viewport Test',
      viewportX: -50.2,
      viewportY: 150.7,
      zoom: 2.0,
    }
  });
  console.log(`✅ Created Canvas B with viewport: x=${canvasB.viewportX}, y=${canvasB.viewportY}, zoom=${canvasB.zoom}`);

  return { canvasA, canvasB };
}

async function testViewportRetrieval(canvasA, canvasB) {
  console.log('\n[4/8] Testing viewport state retrieval...');

  // Fetch Canvas A
  const fetchedA = await prisma.canvas.findUnique({
    where: { id: canvasA.id }
  });

  if (fetchedA.viewportX === canvasA.viewportX &&
      fetchedA.viewportY === canvasA.viewportY &&
      fetchedA.zoom === canvasA.zoom) {
    console.log('✅ Canvas A viewport state preserved correctly');
  } else {
    console.log('❌ Canvas A viewport state NOT preserved');
    return false;
  }

  // Fetch Canvas B
  const fetchedB = await prisma.canvas.findUnique({
    where: { id: canvasB.id }
  });

  if (fetchedB.viewportX === canvasB.viewportX &&
      fetchedB.viewportY === canvasB.viewportY &&
      fetchedB.zoom === canvasB.zoom) {
    console.log('✅ Canvas B viewport state preserved correctly');
  } else {
    console.log('❌ Canvas B viewport state NOT preserved');
    return false;
  }

  return true;
}

async function testViewportUpdate(canvasA) {
  console.log('\n[5/8] Testing viewport state update...');

  // Update Canvas A viewport
  const newViewport = { x: 300.7, y: 400.2, zoom: 0.8 };

  const updated = await prisma.canvas.update({
    where: { id: canvasA.id },
    data: {
      viewportX: newViewport.x,
      viewportY: newViewport.y,
      zoom: newViewport.zoom,
    }
  });

  if (updated.viewportX === newViewport.x &&
      updated.viewportY === newViewport.y &&
      updated.zoom === newViewport.zoom) {
    console.log(`✅ Canvas A viewport updated: x=${updated.viewportX}, y=${updated.viewportY}, zoom=${updated.zoom}`);
    return true;
  } else {
    console.log('❌ Canvas A viewport update failed');
    return false;
  }
}

async function testDefaultViewport(userId) {
  console.log('\n[6/8] Testing default viewport values...');

  // Create canvas without explicit viewport values
  const canvasC = await prisma.canvas.create({
    data: {
      userId,
      name: 'Canvas C - Default Viewport',
    }
  });

  console.log(`✅ Created Canvas C with defaults: x=${canvasC.viewportX}, y=${canvasC.viewportY}, zoom=${canvasC.zoom}`);

  // Verify defaults are 0, 0, 1
  if (canvasC.viewportX === 0 &&
      canvasC.viewportY === 0 &&
      canvasC.zoom === 1) {
    console.log('✅ Default viewport values correct (0, 0, 1)');
    return true;
  } else {
    console.log('❌ Default viewport values incorrect');
    return false;
  }
}

async function testNullHandling(userId) {
  console.log('\n[7/8] Testing null viewport handling...');

  // Create canvas with null viewport (explicitly set to null)
  const canvasD = await prisma.canvas.create({
    data: {
      userId,
      name: 'Canvas D - Null Viewport',
      viewportX: null,
      viewportY: null,
      zoom: null,
    }
  });

  console.log(`✅ Created Canvas D with null values: x=${canvasD.viewportX}, y=${canvasD.viewportY}, zoom=${canvasD.zoom}`);

  // Verify nulls are stored as null (not defaulted)
  if (canvasD.viewportX === null &&
      canvasD.viewportY === null &&
      canvasD.zoom === null) {
    console.log('✅ Null values stored correctly (will use defaults in UI)');
    return true;
  } else {
    console.log('❌ Null values not handled correctly');
    return false;
  }
}

async function testStateIndependence(canvasA, canvasB) {
  console.log('\n[8/8] Testing state independence between canvases...');

  // Update Canvas A
  await prisma.canvas.update({
    where: { id: canvasA.id },
    data: { viewportX: 999, viewportY: 888, zoom: 3.0 }
  });

  // Fetch both canvases
  const fetchedA = await prisma.canvas.findUnique({ where: { id: canvasA.id } });
  const fetchedB = await prisma.canvas.findUnique({ where: { id: canvasB.id } });

  // Verify A changed but B didn't
  const aChanged = fetchedA.viewportX === 999 && fetchedA.viewportY === 888 && fetchedA.zoom === 3.0;
  const bUnchanged = fetchedB.viewportX !== 999 && fetchedB.viewportY !== 888 && fetchedB.zoom !== 3.0;

  if (aChanged && bUnchanged) {
    console.log('✅ Canvas state is independent (A changed, B unchanged)');
    return true;
  } else {
    console.log('❌ Canvas state is not independent');
    return false;
  }
}

async function runTests() {
  try {
    await cleanup();
    const user = await createTestUser();
    const { canvasA, canvasB } = await createTestCanvases(user.id);

    const results = {
      viewportRetrieval: await testViewportRetrieval(canvasA, canvasB),
      viewportUpdate: await testViewportUpdate(canvasA),
      defaultViewport: await testDefaultViewport(user.id),
      nullHandling: await testNullHandling(user.id),
      stateIndependence: await testStateIndependence(canvasA, canvasB),
    };

    console.log('\n' + '='.repeat(80));
    console.log('TEST RESULTS SUMMARY');
    console.log('='.repeat(80));

    const totalTests = Object.keys(results).length;
    const passedTests = Object.values(results).filter(r => r).length;

    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${totalTests - passedTests}`);
    console.log('');

    Object.entries(results).forEach(([test, passed]) => {
      console.log(`${passed ? '✅' : '❌'} ${test}`);
    });

    console.log('\n' + '='.repeat(80));
    console.log('CONCLUSION');
    console.log('='.repeat(80));

    if (passedTests === totalTests) {
      console.log('✅ DATABASE LAYER: All viewport persistence tests PASSED');
      console.log('');
      console.log('The database schema correctly supports:');
      console.log('  • Storing viewport X, Y coordinates and zoom level');
      console.log('  • Retrieving saved viewport state');
      console.log('  • Updating viewport state');
      console.log('  • Default values (0, 0, 1)');
      console.log('  • Independent state for each canvas');
      console.log('');
      console.log('⚠️  NOTE: Full Feature #28 requires UI integration:');
      console.log('  • ReactFlowCanvas component to save viewport on pan/zoom');
      console.log('  • Canvas page to restore viewport on load');
      console.log('  • These components have been updated but need browser testing');
      console.log('='.repeat(80));
      process.exit(0);
    } else {
      console.log('❌ SOME TESTS FAILED - Database schema needs attention');
      console.log('='.repeat(80));
      process.exit(1);
    }

  } catch (error) {
    console.error('\n❌ Test execution failed:', error);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runTests();
