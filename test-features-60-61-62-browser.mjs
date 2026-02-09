/**
 * Browser automation test for Features #60, #61, #62
 * Using Playwright MCP tools
 */

const BASE_URL = 'http://localhost:44444';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Test helper to login
 */
async function login(page, email, password) {
  console.log('\n=== Logging in ===');

  // Navigate to login
  await page.goto(`${BASE_URL}/login`);

  // Wait for page to load
  await sleep(2000);

  // Fill login form
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);

  // Submit form
  await page.click('button[type="submit"]');

  // Wait for redirect to dashboard
  await sleep(3000);

  console.log('✅ Logged in');
}

/**
 * Test Feature #60: Rich Text Toolbar
 */
async function testFeature60(page) {
  console.log('\n=== Feature #60: Rich Text Toolbar ===');

  // Navigate to dashboard
  await page.goto(`${BASE_URL}/dashboard`);
  await sleep(2000);

  // Click on first canvas (if exists)
  const canvasLink = await page.$('a[href^="/canvas/"]');
  if (!canvasLink) {
    console.log('⚠️  No canvas found, creating one...');
    // Click "New Canvas" button
    await page.click('button:has-text("New Canvas")');
    await sleep(1000);

    // Enter canvas name
    await page.fill('input[placeholder*="canvas name" i]', 'Font Test Canvas');
    await sleep(500);

    // Submit
    await page.click('button:has-text("Create")');
    await sleep(2000);
  } else {
    await canvasLink.click();
    await sleep(2000);
  }

  // Double-click on canvas to create note
  console.log('Creating note...');
  await page.click('.react-flow', { position: { x: 400, y: 300 }, clickCount: 2 });
  await sleep(2000);

  // Wait for editor modal to open
  const editorModal = await page.$('.fixed.inset-0');
  if (!editorModal) {
    console.error('❌ Editor modal did not open');
    return false;
  }

  console.log('✅ Editor opened');

  // Check for toolbar buttons
  const boldButton = await page.$('button:has-text("B")');
  const italicButton = await page.$('button:has-text("I")');
  const underlineButton = await page.$('button:has-text("U")');

  if (!boldButton) {
    console.error('❌ Bold button not found');
    return false;
  }
  console.log('✅ Bold button found');

  if (!italicButton) {
    console.error('❌ Italic button not found');
    return false;
  }
  console.log('✅ Italic button found');

  if (!underlineButton) {
    console.error('❌ Underline button not found');
    return false;
  }
  console.log('✅ Underline button found');

  // Test toolbar functionality
  const textarea = await page.$('textarea#note-content');
  if (!textarea) {
    console.error('❌ Content textarea not found');
    return false;
  }

  // Click in textarea and add some text
  await textarea.click();
  await page.type('textarea#note-content', 'test text');
  await sleep(500);

  // Select the text (Ctrl+A)
  await page.keyboard.press('Control+A');
  await sleep(200);

  // Click bold button
  await boldButton.click();
  await sleep(500);

  // Check if markdown was added
  const content1 = await page.inputValue('textarea#note-content');
  if (!content1.includes('**')) {
    console.error('❌ Bold markdown not added');
    console.log('   Content:', content1);
    return false;
  }
  console.log('✅ Bold markdown added:', content1);

  // Clear and test italic
  await textarea.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.type('textarea#note-content', 'test text');
  await sleep(500);

  await page.keyboard.press('Control+A');
  await italicButton.click();
  await sleep(500);

  const content2 = await page.inputValue('textarea#note-content');
  if (!content2.includes('*')) {
    console.error('❌ Italic markdown not added');
    console.log('   Content:', content2);
    return false;
  }
  console.log('✅ Italic markdown added:', content2);

  // Clear and test underline
  await textarea.click();
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.type('textarea#note-content', 'test text');
  await sleep(500);

  await page.keyboard.press('Control+A');
  await underlineButton.click();
  await sleep(500);

  const content3 = await page.inputValue('textarea#note-content');
  if (!content3.includes('<u>')) {
    console.error('❌ Underline HTML not added');
    console.log('   Content:', content3);
    return false;
  }
  console.log('✅ Underline HTML added:', content3);

  // Close editor
  await page.click('button[aria-label="Close dialog"] button, .fixed.inset-0 button svg');
  await sleep(1000);

  return true;
}

/**
 * Test Feature #61: Font Family Selector
 */
async function testFeature61(page) {
  console.log('\n=== Feature #61: Font Family Selector ===');

  // Open note for editing (click on note node)
  await page.click('.react-flow__node');
  await sleep(500);
  await page.click('.react-flow__node'); // Double click
  await sleep(2000);

  // Wait for editor
  const editorModal = await page.$('.fixed.inset-0');
  if (!editorModal) {
    console.error('❌ Editor modal did not open');
    return false;
  }

  // Check for font family dropdown
  const fontSelect = await page.$('select#font-family');
  if (!fontSelect) {
    console.error('❌ Font family dropdown not found');
    return false;
  }
  console.log('✅ Font family dropdown found');

  // Get available options
  const options = await page.$$eval('select#font-family option', opts => opts.map(o => o.value));
  console.log('   Available fonts:', options);

  if (options.length < 3) {
    console.error('❌ Not enough font options');
    return false;
  }
  console.log('✅ Multiple font options available');

  // Change font to Georgia
  await page.selectOption('select#font-family', 'Georgia, serif');
  await sleep(500);

  // Check if font was changed
  const selectedFont = await page.inputValue('select#font-family');
  if (selectedFont !== 'Georgia, serif') {
    console.error('❌ Font family not changed');
    return false;
  }
  console.log('✅ Font family changed to:', selectedFont);

  // Close editor
  await page.click('.fixed.inset-0 button svg');
  await sleep(1000);

  return true;
}

/**
 * Test Feature #62: Font Size Adjustment
 */
async function testFeature62(page) {
  console.log('\n=== Feature #62: Font Size Adjustment ===');

  // Open note for editing
  await page.click('.react-flow__node');
  await sleep(500);
  await page.click('.react-flow__node');
  await sleep(2000);

  // Wait for editor
  const editorModal = await page.$('.fixed.inset-0');
  if (!editorModal) {
    console.error('❌ Editor modal did not open');
    return false;
  }

  // Check for font size dropdown
  const sizeSelect = await page.$('select#font-size');
  if (!sizeSelect) {
    console.error('❌ Font size dropdown not found');
    return false;
  }
  console.log('✅ Font size dropdown found');

  // Get available options
  const options = await page.$$eval('select#font-size option', opts => opts.map(o => parseInt(o.value)));
  console.log('   Available sizes:', options);

  if (options.length < 5) {
    console.error('❌ Not enough size options');
    return false;
  }
  console.log('✅ Multiple size options available');

  // Change size to 18px
  await page.selectOption('select#font-size', '18');
  await sleep(500);

  // Check if size was changed
  const selectedSize = await page.inputValue('select#font-size');
  if (selectedSize !== '18') {
    console.error('❌ Font size not changed');
    return false;
  }
  console.log('✅ Font size changed to:', selectedSize, 'px');

  // Check if textarea style was updated
  const textarea = await page.$('textarea#note-content');
  const fontSize = await textarea.evaluate(el => window.getComputedStyle(el).fontSize);
  console.log('   Textarea font-size:', fontSize);

  // Close editor
  await page.click('.fixed.inset-0 button svg');
  await sleep(1000);

  return true;
}

/**
 * Main test runner
 */
export async function test() {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  Browser Testing Features #60, #61, #62                    ║');
  console.log('╚════════════════════════════════════════════════════════════╝');

  // This will be called from the MCP tool context
  // The actual browser automation will be done via MCP tools
  console.log('\nNote: This test requires Playwright MCP tools to run');
  console.log('Please use the browser automation tools to verify:');
  console.log('1. Rich text toolbar buttons (B, I, U) are visible');
  console.log('2. Font family dropdown has multiple options');
  console.log('3. Font size dropdown has multiple options');
  console.log('4. Clicking buttons adds markdown/HTML to textarea');
  console.log('5. Changing fonts updates textarea style');
}

console.log('Test file loaded. Run via Playwright MCP tools.');
