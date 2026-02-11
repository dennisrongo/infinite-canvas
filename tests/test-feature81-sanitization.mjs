/**
 * Feature #81: Unit tests for sanitization functions
 * Tests that the sanitization library correctly removes XSS payloads
 */

// Import the sanitization functions
import { sanitizeHtml, sanitizeMarkdown, sanitizeNoteTitle } from '../src/lib/sanitization.ts';

const XSS_TEST_CASES = [
  {
    name: 'Script tag',
    input: '<script>alert("XSS")</script>',
    shouldNotContain: ['<script>', '</script>'],
  },
  {
    name: 'Script with content',
    input: 'Hello <script>alert("XSS")</script> world',
    shouldNotContain: ['<script>', '</script>'],
    shouldContain: ['Hello', 'world'],
  },
  {
    name: 'Image onerror',
    input: '<img src=x onerror=alert(1)>',
    shouldNotContain: ['onerror', '<img'],
  },
  {
    name: 'SVG onload',
    input: '<svg onload=alert(1)>test</svg>',
    shouldNotContain: ['onload', '<svg'],
  },
  {
    name: 'Iframe',
    input: '<iframe src="javascript:alert(1)"></iframe>',
    shouldNotContain: ['<iframe', 'javascript:'],
  },
  {
    name: 'Onclick attribute',
    input: '<div onclick="alert(1)">click me</div>',
    shouldNotContain: ['onclick'],
  },
  {
    name: 'Style tag',
    input: '<style>@import "javascript:alert(1)";</style>',
    shouldNotContain: ['<style>', '</style>'],
  },
  {
    name: 'Object tag',
    input: '<object data="javascript:alert(1)"></object>',
    shouldNotContain: ['<object', 'javascript:'],
  },
  {
    name: 'Embed tag',
    input: '<embed src="javascript:alert(1)">',
    shouldNotContain: ['<embed', 'javascript:'],
  },
  {
    name: 'Multiple script tags',
    input: '<script>alert(1)</script> text <script>alert(2)</script>',
    shouldNotContain: ['<script>', '</script>'],
  },
];

function testSanitizeHtml() {
  console.log('\n=== Testing sanitizeHtml() ===\n');

  let passed = 0;
  let failed = 0;

  for (const testCase of XSS_TEST_CASES) {
    const sanitized = sanitizeHtml(testCase.input);
    let testPassed = true;

    // Check that dangerous content is removed
    for (const danger of testCase.shouldNotContain) {
      if (sanitized.includes(danger)) {
        console.error(`❌ ${testCase.name}: Still contains "${danger}"`);
        console.error(`   Input:  ${testCase.input}`);
        console.error(`   Output: ${sanitized}`);
        testPassed = false;
      }
    }

    // Check that safe content is preserved
    if (testCase.shouldContain) {
      for (const safe of testCase.shouldContain) {
        if (!sanitized.includes(safe)) {
          console.error(`❌ ${testCase.name}: Removed safe content "${safe}"`);
          testPassed = false;
        }
      }
    }

    if (testPassed) {
      console.log(`✅ ${testCase.name}: Sanitized correctly`);
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\nResults: ${passed}/${XSS_TEST_CASES.length} passed`);
  return { passed, failed };
}

function testSanitizeMarkdown() {
  console.log('\n=== Testing sanitizeMarkdown() ===\n');

  const testCases = [
    {
      name: 'Script tag',
      input: '<script>alert("XSS")</script>',
      shouldNotContain: ['<script>', '</script>'],
    },
    {
      name: 'Image onerror',
      input: '<img src=x onerror=alert(1)>',
      shouldNotContain: ['onerror'],
    },
    {
      name: 'Safe markdown preserved',
      input: '# Heading\n\n**Bold** text',
      shouldContain: ['# Heading', '**Bold**'],
    },
    {
      name: 'XSS in markdown',
      input: 'Text <script>alert(1)</script> more text',
      shouldNotContain: ['<script>'],
      shouldContain: ['Text', 'more text'],
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const sanitized = sanitizeMarkdown(testCase.input);
    let testPassed = true;

    for (const danger of testCase.shouldNotContain || []) {
      if (sanitized.includes(danger)) {
        console.error(`❌ ${testCase.name}: Still contains "${danger}"`);
        testPassed = false;
      }
    }

    for (const safe of testCase.shouldContain || []) {
      if (!sanitized.includes(safe)) {
        console.error(`❌ ${testCase.name}: Removed safe content "${safe}"`);
        testPassed = false;
      }
    }

    if (testPassed) {
      console.log(`✅ ${testCase.name}: Sanitized correctly`);
      passed++;
    } else {
      failed++;
    }
  }

  console.log(`\nResults: ${passed}/${testCases.length} passed`);
  return { passed, failed };
}

function testSanitizeNoteTitle() {
  console.log('\n=== Testing sanitizeNoteTitle() ===\n');

  const testCases = [
    {
      name: 'HTML in title',
      input: '<script>alert(1)</script>Title',
      expected: 'Title',
    },
    {
      name: 'Normal title',
      input: 'My Note Title',
      expected: 'My Note Title',
    },
    {
      name: 'Title with HTML entities',
      input: '<b>Bold</b> Title',
      expected: 'Bold Title',
    },
    {
      name: 'Whitespace trimming',
      input: '  Title with spaces  ',
      expected: 'Title with spaces',
    },
  ];

  let passed = 0;
  let failed = 0;

  for (const testCase of testCases) {
    const sanitized = sanitizeNoteTitle(testCase.input);

    if (sanitized === testCase.expected) {
      console.log(`✅ ${testCase.name}: "${testCase.input}" → "${sanitized}"`);
      passed++;
    } else {
      console.error(`❌ ${testCase.name}:`);
      console.error(`   Expected: "${testCase.expected}"`);
      console.error(`   Got:      "${sanitized}"`);
      failed++;
    }
  }

  console.log(`\nResults: ${passed}/${testCases.length} passed`);
  return { passed, failed };
}

async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Feature #81: XSS Protection Unit Tests                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  const htmlResults = testSanitizeHtml();
  const markdownResults = testSanitizeMarkdown();
  const titleResults = testSanitizeNoteTitle();

  const totalPassed = htmlResults.passed + markdownResults.passed + titleResults.passed;
  const totalFailed = htmlResults.failed + markdownResults.failed + titleResults.failed;
  const totalTests = totalPassed + totalFailed;

  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║  FINAL RESULTS                                             ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log(`Total Tests:  ${totalTests}`);
  console.log(`✅ Passed:     ${totalPassed} (${((totalPassed / totalTests) * 100).toFixed(1)}%)`);
  console.log(`❌ Failed:     ${totalFailed} (${((totalFailed / totalTests) * 100).toFixed(1)}%)`);

  if (totalFailed > 0) {
    console.error('\n⚠️  Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

runAllTests().catch((error) => {
  console.error('Test suite failed:', error);
  process.exit(1);
});
