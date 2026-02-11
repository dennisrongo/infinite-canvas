import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Read the SQLite database file
const dbPath = join(__dirname, '.autoforge', 'features.db');
const buffer = fs.readFileSync(dbPath);

// Simple SQLite parsing - looking for text content
const text = buffer.toString('utf8');

// Extract feature information by searching for patterns
const featurePattern = /(\d+)\|.*?\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|/g;

const features = [];
let match;
let id = 22;

// Search for feature data in the database
// SQLite stores data in a specific format, let's try to extract readable strings
const lines = text.split('\x00');
for (const line of lines) {
  if (line.includes('feature') && line.includes('verification')) {
    console.log(line);
  }
}

// Alternative: Try to find feature-related text
const searchStrings = [
  'feature 22',
  'feature 23',
  'feature 24',
  'verification',
  'step',
  'canvas'
];

for (const str of searchStrings) {
  const index = text.indexOf(str);
  if (index !== -1) {
    const context = text.substring(index - 100, index + 500);
    console.log(`Found "${str}":`, context.substring(0, 200));
  }
}
