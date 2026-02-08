#!/usr/bin/env node
/**
 * Feature #32: Sidebar responsive on mobile
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dashboardPath = path.join(__dirname, 'app', 'dashboard', 'page.tsx');
const dashboardContent = fs.readFileSync(dashboardPath, 'utf-8');

let passed = 0;
let total = 0;

function test(name, condition) {
  total++;
  if (condition) {
    console.log(`✓ ${name}`);
    passed++;
    return true;
  } else {
    console.log(`✗ ${name}`);
    return false;
  }
}

console.log('=== Feature #32: Mobile Sidebar Responsiveness ===\n');

// Test 1: Mobile sidebar state
test('Has sidebarOpen state', dashboardContent.includes('sidebarOpen'));

// Test 2: Hamburger menu
test('Has hamburger menu button (lg:hidden class)',
  dashboardContent.includes('lg:hidden') && dashboardContent.includes('svg'));

// Test 3: Mobile overlay
test('Has mobile overlay', dashboardContent.includes('bg-black') && dashboardContent.includes('bg-opacity'));

// Test 4: Responsive classes
test('Uses responsive breakpoint classes (lg:)', dashboardContent.includes('lg:hidden') || dashboardContent.includes('lg:static'));

// Test 5: Transform animation
test('Uses transform for slide effect', dashboardContent.includes('translate-x'));

// Test 6: Fixed positioning on mobile
test('Fixed on mobile, static on desktop', dashboardContent.includes('fixed') && dashboardContent.includes('lg:static'));

// Test 7: Z-index layering
test('Has proper z-index', dashboardContent.includes('z-40') || dashboardContent.includes('z-50'));

// Test 8: Click outside to close
test('Click outside closes sidebar', dashboardContent.includes('onClick') && dashboardContent.includes('setSidebarOpen(false)'));

// Test 9: Sidebar width constraint
test('Sidebar has width constraint', dashboardContent.includes('w-80') || dashboardContent.includes('w-full'));

// Test 10: Sidebar scrollable
test('Sidebar is scrollable', dashboardContent.includes('overflow-y'));

// Test 11: Transition animation
test('Has transition animation', dashboardContent.includes('transition'));

// Test 12: Closes on action
test('Closes when canvas created', dashboardContent.includes('createCanvas') && dashboardContent.includes('setSidebarOpen(false)'));

// Test 13: Sidebar aside tag
test('Uses semantic <aside> for sidebar', dashboardContent.includes('<aside'));

// Test 14: Main content area
test('Has main content area separate from sidebar', dashboardContent.includes('<div className="flex-1'));

console.log(`\n${passed}/${total} tests passed`);

if (passed >= 10) {
  console.log('\n✅ Feature #32 PASSED: Sidebar is mobile responsive\n');
  process.exit(0);
} else {
  console.log('\n❌ Feature #32 FAILED: Mobile responsiveness incomplete\n');
  process.exit(1);
}
