/**
 * Script to check for common memory leak patterns in the codebase
 * Usage: node scripts/test-memory-leaks.cjs
 */

const fs = require('fs');
const path = require('path');

const issues = [];

// Check for missing cleanup in useEffect
function checkUseEffectCleanup(filePath, content) {
  const lines = content.split('\n');
  const useEffectRegex = /useEffect\s*\(/g;
  const setIntervalRegex = /setInterval\s*\(/g;
  const setTimeoutRegex = /setTimeout\s*\(/g;
  const addEventListenerRegex = /addEventListener\s*\(/g;
  const returnRegex = /return\s+.*?\(\s*=>\s*\{/;

  let useEffectMatches = [];
  let match;

  while ((match = useEffectRegex.exec(content)) !== null) {
    useEffectMatches.push(match.index);
  }

  for (const matchIndex of useEffectMatches) {
    const linesBefore = content.substring(0, matchIndex).split('\n');
    const lineNum = linesBefore.length;
    const effectStart = lineNum - 1;

    // Find the end of the useEffect (matching closing brace)
    let braceCount = 0;
    let foundEffectStart = false;
    let effectEnd = lineNum;
    for (let i = lineNum; i < lines.length; i++) {
      const line = lines[i];
      for (const char of line) {
        if (char === '{') braceCount++;
        if (char === '}') braceCount--;
        if (braceCount === 0 && foundEffectStart) {
          effectEnd = i + 1;
          break;
        }
        if (braceCount > 0) foundEffectStart = true;
      }
      if (effectEnd > lineNum) break;
    }

    const effectContent = lines.slice(lineNum, effectEnd).join('\n');

    // Check for patterns that need cleanup
    if (setIntervalRegex.test(effectContent)) {
      if (!returnRegex.test(effectContent)) {
        issues.push({
          file: filePath,
          line: effectStart,
          type: 'Missing setInterval cleanup',
          severity: 'high',
          message: 'useEffect contains setInterval but no cleanup function returned',
        });
      }
    }

    if (setTimeoutRegex.test(effectContent)) {
      if (!returnRegex.test(effectContent)) {
        issues.push({
          file: filePath,
          line: effectStart,
          type: 'Missing setTimeout cleanup',
          severity: 'medium',
          message: 'useEffect contains setTimeout but no cleanup function returned',
        });
      }
    }

    if (addEventListenerRegex.test(effectContent)) {
      if (!returnRegex.test(effectContent)) {
        issues.push({
          file: filePath,
          line: effectStart,
          type: 'Missing addEventListener cleanup',
          severity: 'high',
          message: 'useEffect contains addEventListener but no cleanup function returned',
        });
      }
    }
  }
}

// Check for missing dependency arrays in useEffect
function checkUseEffectDeps(filePath, content) {
  const useEffectWithDepsRegex = /useEffect\s*\(\s*[^,]+,\s*\[\s*\]\s*\)/g;
  const useEffectNoDepsRegex = /useEffect\s*\(\s*[^,]+\s*\)(?!\s*,\s*\[)/g;

  // Check for useEffect without dependency array
  const lines = content.split('\n');
  let match;

  // Find useEffect calls that might be missing dependencies
  const useEffectRegex = /useEffect\s*\(/g;
  while ((match = useEffectRegex.exec(content)) !== null) {
    const linesBefore = content.substring(0, match.index).split('\n');
    const lineNum = linesBefore.length;

    // Check if there's a dependency array
    const remainingContent = content.substring(match.index);
    const next1000Chars = remainingContent.substring(0, 1000);

    // If no dependency array is found within reasonable distance
    if (!next1000Chars.includes(',') || next1000Chars.indexOf(')') < next1000Chars.indexOf(',')) {
      const line = lines[lineNum - 1] || '';
      if (!line.trim().startsWith('//')) { // Ignore commented lines
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'Potential missing dependency array',
          severity: 'low',
          message: 'useEffect might be missing dependency array',
        });
      }
    }
  }
}

// Check for global variables that could cause memory leaks
function checkGlobalVariables(filePath, content) {
  const globalPatterns = [
    /window\.\w+\s*=/,
    /global\.\w+\s*=/,
    /globalThis\.\w+\s*=/,
  ];

  globalPatterns.forEach((pattern, idx) => {
    const regex = new RegExp(pattern, 'g');
    let match;
    while ((match = regex.exec(content)) !== null) {
      const linesBefore = content.substring(0, match.index).split('\n');
      const lineNum = linesBefore.length;
      issues.push({
        file: filePath,
        line: lineNum,
        type: 'Global variable assignment',
        severity: 'medium',
        message: 'Assignment to global variable may cause memory leaks',
      });
    }
  });
}

// Check for missing cleanup in React components
function checkComponentCleanup(filePath, content) {
  // Check if component uses useRef without cleanup
  const useRefRegex = /useRef\s*\(/g;
  let match;

  while ((match = useRefRegex.exec(content)) !== null) {
    const remainingContent = content.substring(match.index);
    const next500Chars = remainingContent.substring(0, 500);

    // Check if the ref is used with timers or event listeners
    if (next500Chars.includes('setInterval') || next500Chars.includes('addEventListener')) {
      const linesBefore = content.substring(0, match.index).split('\n');
      const lineNum = linesBefore.length;

      // Check for useEffect with cleanup
      if (!content.substring(match.index, match.index + 2000).includes('return') ||
          !content.substring(match.index, match.index + 2000).includes('clearInterval') ||
          !content.substring(match.index, match.index + 2000).includes('removeEventListener')) {
        issues.push({
          file: filePath,
          line: lineNum,
          type: 'Ref with timer/event listener - check cleanup',
          severity: 'medium',
          message: 'useRef is used with timers or event listeners - verify cleanup exists',
        });
      }
    }
  }
}

// Recursively scan files
function scanDirectory(dir, extensions) {
  const files = fs.readdirSync(dir, { withFileTypes: true });

  for (const file of files) {
    const fullPath = path.join(dir, file.name);

    if (file.isDirectory()) {
      // Skip node_modules, .next, .git
      if (!['node_modules', '.next', '.git', 'dist', 'build'].includes(file.name)) {
        scanDirectory(fullPath, extensions);
      }
    } else if (extensions.some(ext => file.name.endsWith(ext))) {
      const content = fs.readFileSync(fullPath, 'utf-8');
      console.log(`Scanning: ${fullPath}`);

      checkUseEffectCleanup(fullPath, content);
      checkUseEffectDeps(fullPath, content);
      checkGlobalVariables(fullPath, content);
      checkComponentCleanup(fullPath, content);
    }
  }
}

async function main() {
  console.log('🔍 Scanning for memory leak patterns...\n');

  const srcDir = path.join(__dirname, '..', 'src');
  const appDir = path.join(__dirname, '..', 'app');

  // Scan TypeScript and JavaScript files
  const extensions = ['.ts', '.tsx', '.js', '.jsx'];

  if (fs.existsSync(srcDir)) {
    scanDirectory(srcDir, extensions);
  }
  if (fs.existsSync(appDir)) {
    scanDirectory(appDir, extensions);
  }

  console.log(`\n📊 Found ${issues.length} potential issues:\n`);

  if (issues.length === 0) {
    console.log('✅ No obvious memory leak patterns found!');
    console.log('\nNote: This is a static analysis. Runtime memory profiling');
    console.log('should still be performed in the browser DevTools.');
  } else {
    const bySeverity = {
      high: issues.filter(i => i.severity === 'high'),
      medium: issues.filter(i => i.severity === 'medium'),
      low: issues.filter(i => i.severity === 'low'),
    };

    if (bySeverity.high.length > 0) {
      console.log('🔴 HIGH SEVERITY:');
      bySeverity.high.forEach(issue => {
        console.log(`   ${path.relative(process.cwd(), issue.file)}:${issue.line}`);
        console.log(`   ${issue.message}\n`);
      });
    }

    if (bySeverity.medium.length > 0) {
      console.log('⚠️  MEDIUM SEVERITY:');
      bySeverity.medium.forEach(issue => {
        console.log(`   ${path.relative(process.cwd(), issue.file)}:${issue.line}`);
        console.log(`   ${issue.message}\n`);
      });
    }

    if (bySeverity.low.length > 0) {
      console.log('📝 LOW SEVERITY:');
      bySeverity.low.forEach(issue => {
        console.log(`   ${path.relative(process.cwd(), issue.file)}:${issue.line}`);
        console.log(`   ${issue.message}\n`);
      });
    }
  }

  console.log('\n✅ Static analysis complete!');
  console.log('\nFor comprehensive memory leak testing, use browser DevTools:');
  console.log('1. Open DevTools > Memory tab');
  console.log('2. Take heap snapshot before using the app');
  console.log('3. Use the app for 10-15 minutes (create/edit/delete notes)');
  console.log('4. Take another heap snapshot');
  console.log('5. Compare snapshots for retained objects');
  console.log('6. Look for "Detached DOM nodes" and "Event Listeners"');
}

main().catch(console.error);
