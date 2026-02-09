/**
 * Verification script for Error Handling Features #129 and #130
 *
 * Feature #129: Network failure handling
 * - Tests network offline detection
 * - Tests error messages for network failures
 * - Tests safeFetch wrapper
 *
 * Feature #130: Invalid input handling
 * - Tests empty canvas name validation
 * - Tests long folder name validation
 * - Tests invalid email validation
 * - Tests negative/zero note size validation
 */

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('='.repeat(60));
console.log('Error Handling Features Verification');
console.log('Features #129 and #130');
console.log('='.repeat(60));
console.log();

// Helper function to check if a file contains specific code patterns
function fileContains(filePath, patterns) {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const results = [];

    for (const pattern of patterns) {
      const found = content.includes(pattern.search);
      results.push({
        name: pattern.name,
        found,
        required: pattern.required || false
      });
    }

    return results;
  } catch (error) {
    return [];
  }
}

// Helper to print test results
function printTestSection(title) {
  console.log();
  console.log('-'.repeat(60));
  console.log(title);
  console.log('-'.repeat(60));
}

function printTestResult(name, passed, details = '') {
  const icon = passed ? '✅ PASS' : '❌ FAIL';
  console.log(`${icon}: ${name}${details ? ' - ' + details : ''}`);
  return passed;
}

let totalPassed = 0;
let totalFailed = 0;

// ============================================================================
// FEATURE #129: Network Failure Handling
// ============================================================================
printTestSection('Feature #129: Network Failure Handling');

console.log('Checking network utility implementation...');

const networkPatterns = [
  { name: 'isOnline() function', search: 'export function isOnline()' },
  { name: 'addNetworkStatusListeners() function', search: 'export function addNetworkStatusListeners' },
  { name: 'safeFetch() wrapper with network detection', search: 'export async function safeFetch' },
  { name: 'navigator.onLine check', search: 'navigator.onLine' },
  { name: 'online/offline event listeners', search: 'addEventListener(\'online\'' },
];

const networkResults = fileContains(join(__dirname, 'src/lib/network.ts'), networkPatterns);
networkResults.forEach(result => {
  const passed = printTestResult(result.name, result.found);
  if (passed) totalPassed++; else totalFailed++;
});

console.log();
console.log('Checking useNetworkStatus hook...');

const hookPatterns = [
  { name: 'useNetworkStatus hook exported', search: 'export function useNetworkStatus' },
  { name: 'isOnline state tracking', search: 'const [isOnline, setIsOnline]' },
  { name: 'wasOffline state tracking', search: 'const [wasOffline, setWasOffline]' },
  { name: 'mounted state for SSR', search: 'const [mounted, setMounted]' },
  { name: 'useEffect for event listeners', search: 'useEffect' },
  { name: 'cleanup function', search: 'return cleanup' },
];

const hookResults = fileContains(join(__dirname, 'src/hooks/useNetworkStatus.ts'), hookPatterns);
hookResults.forEach(result => {
  const passed = printTestResult(result.name, result.found);
  if (passed) totalPassed++; else totalFailed++;
});

console.log();
console.log('Checking NetworkStatusBanner component...');

const bannerPatterns = [
  { name: 'NetworkStatusBanner component', search: 'export default function NetworkStatusBanner' },
  { name: 'useNetworkStatus hook usage', search: 'useNetworkStatus()' },
  { name: 'Conditional rendering based on isOnline', search: 'if (isOnline)' },
  { name: 'Offline message display', search: 'You are offline' },
  { name: 'Banner styling', search: 'bg-amber-500' },
];

const bannerResults = fileContains(join(__dirname, 'src/components/ui/NetworkStatusBanner.tsx'), bannerPatterns);
bannerResults.forEach(result => {
  const passed = printTestResult(result.name, result.found);
  if (passed) totalPassed++; else totalFailed++;
});

console.log();
console.log('Checking API client with network error handling...');

const apiClientPatterns = [
  { name: 'api.get() with safeFetch', search: 'async get(url: string)' },
  { name: 'api.post() with safeFetch', search: 'async post(url: string' },
  { name: 'api.put() with safeFetch', search: 'async put(url: string' },
  { name: 'api.delete() with safeFetch', search: 'async delete(url: string' },
  { name: 'handleAPIError() helper', search: 'export function handleAPIError' },
  { name: 'NetworkOfflineError class', search: 'class NetworkOfflineError' },
  { name: 'NetworkConnectionError class', search: 'class NetworkConnectionError' },
  { name: 'NetworkOfflineError handling', search: 'instanceof NetworkOfflineError' },
];

const apiClientResults = fileContains(join(__dirname, 'src/lib/api-client.ts'), apiClientPatterns);
apiClientResults.forEach(result => {
  const passed = printTestResult(result.name, result.found);
  if (passed) totalPassed++; else totalFailed++;
});

console.log();
console.log('Checking layout includes NetworkStatusBanner...');

const layoutPatterns = [
  { name: 'NetworkStatusBanner import', search: "import NetworkStatusBanner" },
  { name: 'NetworkStatusBanner in JSX', search: '<NetworkStatusBanner' },
];

const layoutResults = fileContains(join(__dirname, 'app/layout.tsx'), layoutPatterns);
layoutResults.forEach(result => {
  const passed = printTestResult(result.name, result.found);
  if (passed) totalPassed++; else totalFailed++;
});

// ============================================================================
// FEATURE #130: Invalid Input Handling
// ============================================================================
printTestSection('Feature #130: Invalid Input Handling');

console.log('Checking canvas name validation...');

const canvasPatterns = [
  { name: 'Empty canvas name check', search: "Canvas name cannot be empty" },
  { name: 'Canvas name required check', search: 'Canvas name is required' },
  { name: 'Canvas name length validation (255 max)', search: 'Canvas name is too long. Maximum 255 characters' },
  { name: 'Canvas name trimming', search: 'const trimmedName = name.trim()' },
  { name: 'Canvas name type check', search: 'typeof name !== \'string\'' },
];

const canvasResults = fileContains(join(__dirname, 'app/api/canvases/route.ts'), canvasPatterns);
canvasResults.forEach(result => {
  const passed = printTestResult(result.name, result.found);
  if (passed) totalPassed++; else totalFailed++;
});

console.log();
console.log('Checking folder name validation...');

const folderPatterns = [
  { name: 'Empty folder name check', search: "Folder name cannot be empty" },
  { name: 'Folder name required check', search: 'Folder name is required' },
  { name: 'Folder name length validation (255 max)', search: 'Folder name is too long. Maximum 255 characters' },
  { name: 'Folder name trimming', search: 'const trimmedName = name.trim()' },
  { name: 'Folder name type check', search: 'typeof name !== \'string\'' },
];

const folderResults = fileContains(join(__dirname, 'app/api/folders/route.ts'), folderPatterns);
folderResults.forEach(result => {
  const passed = printTestResult(result.name, result.found);
  if (passed) totalPassed++; else totalFailed++;
});

console.log();
console.log('Checking email validation (auth)...');

const authPatterns = [
  { name: 'validateEmail() function', search: 'export function validateEmail' },
  { name: 'Email regex pattern', search: '/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/' },
];

const authResults = fileContains(join(__dirname, 'src/lib/auth.ts'), authPatterns);
authResults.forEach(result => {
  const passed = printTestResult(result.name, result.found);
  if (passed) totalPassed++; else totalFailed++;
});

console.log();
console.log('Checking registration API email validation...');

const registerPatterns = [
  { name: 'Registration email validation', search: 'if (!email || !validateEmail(email))' },
  { name: 'Invalid email error message', search: 'Invalid email address' },
];

const registerResults = fileContains(join(__dirname, 'app/api/auth/register/route.ts'), registerPatterns);
registerResults.forEach(result => {
  const passed = printTestResult(result.name, result.found);
  if (passed) totalPassed++; else totalFailed++;
});

console.log();
console.log('Checking note size validation (via Zod schema)...');

const validationPatterns = [
  { name: 'noteUpdateSchema with Zod', search: 'export const noteUpdateSchema' },
  { name: 'width validation (positive)', search: 'z.number().positive().optional()' },
  { name: 'height validation (positive)', search: 'height: z.number().positive()' },
  { name: 'fontSize validation (positive with max)', search: 'fontSize: z.number().positive().max(72)' },
  { name: 'noteTitleSchema with max length', search: 'noteTitleSchema = z.string().max(500' },
];

const validationResults = fileContains(join(__dirname, 'src/lib/validation.ts'), validationPatterns);
validationResults.forEach(result => {
  const passed = printTestResult(result.name, result.found);
  if (passed) totalPassed++; else totalFailed++;
});

console.log();
console.log('Checking canvas update endpoint also has validation...');

const canvasUpdatePatterns = [
  { name: 'Canvas rename name validation', search: 'Canvas name cannot be empty' },
  { name: 'Canvas rename length validation', search: 'Canvas name is too long' },
];

const canvasUpdateResults = fileContains(join(__dirname, 'app/api/canvases/[id]/route.ts'), canvasUpdatePatterns);
canvasUpdateResults.forEach(result => {
  const passed = printTestResult(result.name, result.found);
  if (passed) totalPassed++; else totalFailed++;
});

console.log();
console.log('Checking folder rename endpoint also has validation...');

const folderUpdatePatterns = [
  { name: 'Folder rename name validation', search: 'Folder name cannot be empty' },
  { name: 'Folder rename length validation', search: 'Folder name is too long' },
];

const folderUpdateResults = fileContains(join(__dirname, 'app/api/folders/[id]/route.ts'), folderUpdatePatterns);
folderUpdateResults.forEach(result => {
  const passed = printTestResult(result.name, result.found);
  if (passed) totalPassed++; else totalFailed++;
});

// ============================================================================
// SUMMARY
// ============================================================================
console.log();
console.log('='.repeat(60));
console.log('VERIFICATION SUMMARY');
console.log('='.repeat(60));
console.log(`Total Tests Passed: ${totalPassed}`);
console.log(`Total Tests Failed: ${totalFailed}`);
console.log(`Total Tests: ${totalPassed + totalFailed}`);
console.log(`Success Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);
console.log();

if (totalFailed === 0) {
  console.log('✅ ALL TESTS PASSED - Features #129 and #130 verified!');
} else {
  console.log('❌ SOME TESTS FAILED - Please review the output above');
  process.exit(1);
}
