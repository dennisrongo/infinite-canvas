// Color contrast ratio calculator for WCAG compliance
// Based on https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html

function luminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

function contrastRatio(color1, color2) {
  const rgb1 = hexToRgb(color1);
  const rgb2 = hexToRgb(color2);

  if (!rgb1 || !rgb2) {
    throw new Error('Invalid hex color');
  }

  const lum1 = luminance(rgb1.r, rgb1.g, rgb1.b);
  const lum2 = luminance(rgb2.r, rgb2.g, rgb2.b);

  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);

  return (brightest + 0.05) / (darkest + 0.05);
}

// Light mode colors from app_spec.txt
const lightBg = '#FFFFFF';
const lightText = '#1E293B';
const lightPrimary = '#3B82F6';
const lightSidebar = '#F1F5F9';
const lightNoteBorder = '#E2E8F0';

// Dark mode colors from app_spec.txt
const darkBg = '#0F172A';
const darkText = '#F1F5F9';
const darkPrimary = '#60A5FA';
const darkSidebar = '#1E293B';
const darkNoteBorder = '#475569';

console.log('=== LIGHT MODE CONTRAST RATIOS ===');
console.log(`Text on Background: ${contrastRatio(lightText, lightBg).toFixed(2)}:1 (WCAG AA requires 4.5:1)`);
console.log(`Primary on Background: ${contrastRatio(lightPrimary, lightBg).toFixed(2)}:1 (WCAG AA requires 4.5:1)`);
console.log(`Text on Sidebar: ${contrastRatio(lightText, lightSidebar).toFixed(2)}:1 (WCAG AA requires 4.5:1)`);

console.log('\n=== DARK MODE CONTRAST RATIOS ===');
console.log(`Text on Background: ${contrastRatio(darkText, darkBg).toFixed(2)}:1 (WCAG AA requires 4.5:1)`);
console.log(`Primary on Background: ${contrastRatio(darkPrimary, darkBg).toFixed(2)}:1 (WCAG AA requires 4.5:1)`);
console.log(`Text on Sidebar: ${contrastRatio(darkText, darkSidebar).toFixed(2)}:1 (WCAG AA requires 4.5:1)`);

// Additional checks for borders and interactive elements
console.log('\n=== ADDITIONAL CONTRAST CHECKS ===');
console.log(`Note Border on Canvas (light): ${contrastRatio(lightNoteBorder, '#F8FAFC').toFixed(2)}:1`);
console.log(`Note Border on Canvas (dark): ${contrastRatio(darkNoteBorder, '#1E293B').toFixed(2)}:1`);

// WCAG AA Standards:
// - Normal text: 4.5:1
// - Large text (18pt+ or 14pt+ bold): 3:1
// - UI components and graphical objects: 3:1

console.log('\n=== WCAG AA COMPLIANCE ===');
const lightTextOnBg = contrastRatio(lightText, lightBg);
const darkTextOnBg = contrastRatio(darkText, darkBg);
const lightPrimaryOnBg = contrastRatio(lightPrimary, lightBg);
const darkPrimaryOnBg = contrastRatio(darkPrimary, darkBg);

console.log(`Light mode text: ${lightTextOnBg >= 4.5 ? '✅ PASS' : '❌ FAIL'} (${lightTextOnBg.toFixed(2)}:1)`);
console.log(`Dark mode text: ${darkTextOnBg >= 4.5 ? '✅ PASS' : '❌ FAIL'} (${darkTextOnBg.toFixed(2)}:1)`);
console.log(`Light mode primary: ${lightPrimaryOnBg >= 4.5 ? '✅ PASS' : '❌ FAIL'} (${lightPrimaryOnBg.toFixed(2)}:1)`);
console.log(`Dark mode primary: ${darkPrimaryOnBg >= 4.5 ? '✅ PASS' : '❌ FAIL'} (${darkPrimaryOnBg.toFixed(2)}:1)`);

// Check link colors
const lightLinkHover = '#2563EB'; // Darker blue for hover
const darkLinkHover = '#3B82F6'; // Lighter blue for hover in dark mode
console.log(`\n=== LINK COLORS ===`);
console.log(`Light mode link hover: ${contrastRatio(lightLinkHover, lightBg).toFixed(2)}:1 (WCAG AA requires 4.5:1)`);
console.log(`Dark mode link hover: ${contrastRatio(darkLinkHover, darkBg).toFixed(2)}:1 (WCAG AA requires 4.5:1)`);

// Check button backgrounds (white on blue)
const white = '#FFFFFF';
console.log(`\n=== BUTTON BACKGROUNDS ===`);
console.log(`Light mode button (white on blue): ${contrastRatio(white, lightPrimary).toFixed(2)}:1 (WCAG AA requires 4.5:1)`);
console.log(`Dark mode button (white on blue): ${contrastRatio(white, darkPrimary).toFixed(2)}:1 (WCAG AA requires 4.5:1)`);
