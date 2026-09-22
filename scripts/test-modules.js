/**
 * Job Tracker LN - Automated Module Verification Script
 */

import { normalizeJobUrl } from '../src/utils/url-normalizer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

let totalTests = 0;
let passedTests = 0;

function assert(condition, message) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`✅ PASS: ${message}`);
  } else {
    console.error(`❌ FAIL: ${message}`);
    process.exitCode = 1;
  }
}

console.log('\n--- 1. Testing Manifest JSON ---');
const manifestPath = path.join(rootDir, 'manifest.json');
assert(fs.existsSync(manifestPath), 'manifest.json exists');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
assert(manifest.manifest_version === 3, 'Manifest is version 3');
assert(manifest.name === 'Job Tracker LN', 'Name is "Job Tracker LN"');
assert(manifest.permissions.includes('storage'), 'Permissions include storage');
assert(manifest.permissions.includes('identity'), 'Permissions include identity');
assert(manifest.permissions.includes('tabs'), 'Permissions include tabs');
assert(manifest.commands && manifest.commands.save_job_shortcut, 'Commands include save_job_shortcut');
assert(manifest.commands.save_job_shortcut.suggested_key.default === 'Alt+S', 'save_job_shortcut default key is Alt+S');

console.log('\n--- 2. Testing Icon Assets ---');
const iconSizes = [16, 48, 128];
iconSizes.forEach(size => {
  const iconFile = path.join(rootDir, `assets/icons/icon-${size}.png`);
  assert(fs.existsSync(iconFile), `icon-${size}.png exists`);
  const buf = fs.readFileSync(iconFile);
  assert(buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47, `icon-${size}.png has valid PNG signature`);
  const width = buf.readUInt32BE(16);
  const height = buf.readUInt32BE(20);
  assert(width === size && height === size, `icon-${size}.png has correct dimensions (${width}x${height})`);
});

console.log('\n--- 3. Testing URL Normalizer ---');
const testCases = [
  {
    raw: 'https://www.linkedin.com/jobs/view/4123456789/?trk=job-recommendations&refId=abc123xyz',
    expected: 'https://www.linkedin.com/jobs/view/4123456789/',
    label: 'Strips tracking query params from direct view'
  },
  {
    raw: 'https://www.linkedin.com/jobs/search/?currentJobId=4123456789&keywords=engineer',
    expected: 'https://www.linkedin.com/jobs/view/4123456789/',
    label: 'Normalizes currentJobId from search view into canonical view URL'
  },
  {
    raw: 'https://www.linkedin.com/jobs/collections/recommended/?jobId=9876543210',
    expected: 'https://www.linkedin.com/jobs/view/9876543210/',
    label: 'Normalizes jobId from collections into canonical view URL'
  },
  {
    raw: 'https://www.linkedin.com/jobs/view/4123456789',
    expected: 'https://www.linkedin.com/jobs/view/4123456789/',
    label: 'Ensures standard trailing slash'
  }
];

testCases.forEach(tc => {
  const normalized = normalizeJobUrl(tc.raw);
  assert(normalized === tc.expected, `${tc.label} -> got "${normalized}"`);
});

console.log('\n--- 4. Checking Required Source Files ---');
const requiredFiles = [
  'assets/styles/design-tokens.css',
  'src/utils/url-normalizer.js',
  'src/utils/storage.js',
  'src/content/parser.js',
  'src/content/content.js',
  'src/content/content.css',
  'src/background/sheets-api.js',
  'src/background/service-worker.js',
  'src/popup/popup.html',
  'src/popup/popup.css',
  'src/popup/popup.js',
  'CHROMEWEBSTORE.md'
];

requiredFiles.forEach(file => {
  const filePath = path.join(rootDir, file);
  assert(fs.existsSync(filePath), `Required file exists: ${file}`);
});

console.log(`\n================================`);
console.log(`Summary: ${passedTests}/${totalTests} tests passed.`);
console.log(`================================\n`);
