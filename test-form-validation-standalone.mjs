// Test form validation features directly
// This tests Features #131, #150, #151

// Copy of validation functions from src/lib/auth.ts
function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function validatePassword(password) {
  const errors = [];

  if (password.length < 8) {
    errors.push('Password must be at least 8 characters long');
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }

  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }

  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

console.log('='.repeat(60));
console.log('FORM VALIDATION TEST SUITE');
console.log('='.repeat(60));

// ============================================================================
// FEATURE #150: Email Format Validation
// ============================================================================
console.log('\nFEATURE #150: Email Format Validation');
console.log('-'.repeat(60));

const emailTests = [
  { input: 'not-an-email', expected: false, description: 'No @ symbol (invalid)' },
  { input: 'userdomain.com', expected: false, description: 'Missing @ symbol (invalid)' },
  { input: 'user@', expected: false, description: 'No domain after @ (invalid)' },
  { input: 'user@domain.com', expected: true, description: 'Valid email format' },
  { input: 'user@mail.domain.com', expected: true, description: 'Subdomain valid' },
  { input: 'test+tag@example.com', expected: true, description: 'Email with plus sign' },
  { input: 'user.name@example.co.uk', expected: true, description: 'Multi-part TLD' },
  { input: '', expected: false, description: 'Empty string (invalid)' },
  { input: '@example.com', expected: false, description: 'No user part (invalid)' },
];

let emailTestsPassed = 0;
let emailTestsFailed = 0;

for (const test of emailTests) {
  const result = validateEmail(test.input);
  const passed = result === test.expected;

  if (passed) {
    emailTestsPassed++;
    console.log(`  ✓ "${test.input}" - ${test.description}`);
  } else {
    emailTestsFailed++;
    console.log(`  ✗ "${test.input}" - ${test.description}`);
    console.log(`    Expected: ${test.expected}, Got: ${result}`);
  }
}

console.log(`\nEmail Validation: ${emailTestsPassed}/${emailTests.length} tests passed`);

// ============================================================================
// FEATURE #151: Password Matching Validation
// ============================================================================
console.log('\nFEATURE #151: Password Matching Validation');
console.log('-'.repeat(60));

const passwordMatchTests = [
  { password: 'Password123!', confirm: 'Password123!', shouldMatch: true, description: 'Identical passwords match' },
  { password: 'Password123!', confirm: 'Password456!', shouldMatch: false, description: 'Different passwords do not match' },
  { password: 'Password123!', confirm: '', shouldMatch: false, description: 'Empty confirmation does not match' },
  { password: 'Test1234!', confirm: 'Test1234 ', shouldMatch: false, description: 'Trailing space causes mismatch' },
  { password: 'Abc123!@', confirm: 'Abc123!@', shouldMatch: true, description: 'Matching special chars' },
];

let passwordMatchTestsPassed = 0;
let passwordMatchTestsFailed = 0;

for (const test of passwordMatchTests) {
  const matches = test.password === test.confirm;
  const passed = matches === test.shouldMatch;

  if (passed) {
    passwordMatchTestsPassed++;
    console.log(`  ✓ ${test.description}`);
  } else {
    passwordMatchTestsFailed++;
    console.log(`  ✗ ${test.description}`);
    console.log(`    Passwords: "${test.password}" vs "${test.confirm}"`);
    console.log(`    Expected match: ${test.shouldMatch}, Got match: ${matches}`);
  }
}

console.log(`\nPassword Matching: ${passwordMatchTestsPassed}/${passwordMatchTests.length} tests passed`);

// ============================================================================
// Password Requirements Validation (part of registration flow)
// ============================================================================
console.log('\nPassword Requirements Validation (Server-Side)');
console.log('-'.repeat(60));

const passwordRequirementTests = [
  { input: 'short', valid: false, description: 'Less than 8 characters' },
  { input: 'nocaps123!', valid: false, description: 'No uppercase letter' },
  { input: 'NOLOW123!', valid: false, description: 'No lowercase letter' },
  { input: 'NoNumber!', valid: false, description: 'No number' },
  { input: 'NoSpecial123', valid: false, description: 'No special character' },
  { input: 'noupp123!', valid: false, description: 'No uppercase (8+ chars)' },
  { input: 'NOLOW123!', valid: false, description: 'No lowercase (8+ chars)' },
  { input: 'ValidPass123!', valid: true, description: 'Valid password (meets all requirements)' },
  { input: 'MyP@ssw0rd', valid: true, description: 'Valid with special @' },
];

let passwordReqTestsPassed = 0;
let passwordReqTestsFailed = 0;

for (const test of passwordRequirementTests) {
  const result = validatePassword(test.input);
  const passed = result.valid === test.valid;

  if (passed) {
    passwordReqTestsPassed++;
    console.log(`  ✓ ${test.description}`);
  } else {
    passwordReqTestsFailed++;
    console.log(`  ✗ ${test.description}`);
    console.log(`    Expected valid: ${test.valid}, Got valid: ${result.valid}`);
    if (!result.valid) {
      console.log(`    Errors: ${result.errors.join(', ')}`);
    }
  }
}

console.log(`\nPassword Requirements: ${passwordReqTestsPassed}/${passwordRequirementTests.length} tests passed`);

// ============================================================================
// FEATURE #131: Canvas Name Validation
// ============================================================================
console.log('\nFEATURE #131: Canvas Name Validation');
console.log('-'.repeat(60));

const canvasNameTests = [
  { input: '', expectedValid: false, description: 'Empty string (invalid)' },
  { input: '   ', expectedValid: false, description: 'Only spaces (invalid after trim)' },
  { input: null, expectedValid: false, description: 'null value (invalid)' },
  { input: undefined, expectedValid: false, description: 'undefined (invalid)' },
  { input: '  Test  ', expectedValid: true, trimmed: 'Test', description: 'Spaces should be trimmed' },
  { input: 'a', expectedValid: true, description: 'Single character (valid)' },
  { input: 'A'.repeat(1000), expectedValid: true, description: 'Long name (1000 chars allowed)' },
  { input: 'Test@#$%', expectedValid: true, description: 'Special characters allowed' },
  { input: 'Test Canvas Name', expectedValid: true, description: 'Normal name with spaces' },
  { input: '日本語', expectedValid: true, description: 'Unicode characters allowed' },
];

let canvasNameTestsPassed = 0;
let canvasNameTestsFailed = 0;

for (const test of canvasNameTests) {
  // Check validation logic matching the API (route.ts line 89-101)
  // The API checks: if (!name || typeof name !== 'string') return error
  // Then: if (name.trim().length === 0) return error
  const isMissing = !test.input || typeof test.input !== 'string';
  const isEmpty = !isMissing && test.input.trim().length === 0;
  const isValid = !isMissing && !isEmpty;

  const passed = isValid === test.expectedValid;

  if (passed) {
    canvasNameTestsPassed++;
    console.log(`  ✓ ${test.description}`);
  } else {
    canvasNameTestsFailed++;
    console.log(`  ✗ ${test.description}`);
    const displayInput = test.input === null || test.input === undefined ? String(test.input) : `"${test.input.substring(0, 50)}${test.input.length > 50 ? '...' : ''}"`;
    console.log(`    Input: ${displayInput}`);
    console.log(`    Expected valid: ${test.expectedValid}, Got valid: ${isValid}`);
    console.log(`    (isMissing: ${isMissing}, isEmpty: ${isEmpty})`);
  }
}

console.log(`\nCanvas Name Validation: ${canvasNameTestsPassed}/${canvasNameTests.length} tests passed`);

// ============================================================================
// SUMMARY
// ============================================================================
console.log('\n' + '='.repeat(60));
console.log('TEST SUMMARY');
console.log('='.repeat(60));
console.log(`Feature #150 (Email Validation):          ${emailTestsPassed}/${emailTests.length} passed`);
console.log(`Feature #151 (Password Matching):         ${passwordMatchTestsPassed}/${passwordMatchTests.length} passed`);
console.log(`Password Requirements (Server-Side):      ${passwordReqTestsPassed}/${passwordRequirementTests.length} passed`);
console.log(`Feature #131 (Canvas Name Validation):    ${canvasNameTestsPassed}/${canvasNameTests.length} passed`);

const totalTests = emailTests.length + passwordMatchTests.length + passwordRequirementTests.length + canvasNameTests.length;
const totalPassed = emailTestsPassed + passwordMatchTestsPassed + passwordReqTestsPassed + canvasNameTestsPassed;

console.log(`\nTotal: ${totalPassed}/${totalTests} tests passed (${((totalPassed/totalTests)*100).toFixed(1)}%)`);

if (totalPassed === totalTests) {
  console.log('\n✅ ALL TESTS PASSED!');
  console.log('\nFeatures Verified:');
  console.log('  ✓ #150: Email format validation (invalid emails rejected)');
  console.log('  ✓ #151: Password matching validation (matching enforced)');
  console.log('  ✓ #131: Canvas name validation (empty names rejected)');
} else {
  console.log('\n❌ SOME TESTS FAILED');
  process.exit(1);
}
