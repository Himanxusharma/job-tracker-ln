/**
 * Job Tracker LN - Comprehensive Full-Project Reverification Suite
 * Validates syntax, manifest integrity, file references, message routes,
 * CSS balance, HTML markup, URL normalizer stress cases, and contrast ratios.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { normalizeJobUrl } from '../src/utils/url-normalizer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

let total = 0;
let passed = 0;

function check(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [OK] ${message}`);
  } else {
    console.error(`  [FAIL] ${message}`);
    process.exitCode = 1;
  }
}

console.log('\n========================================');
console.log('1. MANIFEST & FILE SYSTEM VERIFICATION');
console.log('========================================');

const manifestPath = path.join(rootDir, 'manifest.json');
check(fs.existsSync(manifestPath), 'manifest.json exists');

let manifest;
try {
  manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  check(true, 'manifest.json is valid JSON');
} catch (e) {
  check(false, `manifest.json JSON parse error: ${e.message}`);
}

check(manifest.manifest_version === 3, 'Manifest version is 3');
check(manifest.name === 'Job Tracker LN', 'Name is "Job Tracker LN"');
check(manifest.version === '1.0.0', 'Version is "1.0.0"');

// Check all files referenced in manifest exist on disk
const manifestFiles = [
  manifest.action?.default_popup,
  manifest.background?.service_worker,
  ...(manifest.content_scripts?.[0]?.js || []),
  ...(manifest.content_scripts?.[0]?.css || []),
  manifest.icons?.['16'],
  manifest.icons?.['48'],
  manifest.icons?.['128']
].filter(Boolean);

manifestFiles.forEach(relPath => {
  const fullPath = path.join(rootDir, relPath);
  check(fs.existsSync(fullPath), `Manifest referenced file exists: ${relPath}`);
});

console.log('\n========================================');
console.log('2. ICON DIMENSIONS & PNG FORMAT AUDIT');
console.log('========================================');

[16, 48, 128].forEach(size => {
  const iconPath = path.join(rootDir, `assets/icons/icon-${size}.png`);
  check(fs.existsSync(iconPath), `assets/icons/icon-${size}.png exists`);
  const buf = fs.readFileSync(iconPath);
  const isPng = buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  check(isPng, `icon-${size}.png has valid PNG magic numbers`);
  const w = buf.readUInt32BE(16);
  const h = buf.readUInt32BE(20);
  check(w === size && h === size, `icon-${size}.png dimensions are strictly ${size}x${size}`);
});

console.log('\n========================================');
console.log('3. CSS BRACE & SYNTAX INTEGRITY AUDIT');
console.log('========================================');

const cssFiles = [
  'assets/styles/design-tokens.css',
  'src/content/content.css',
  'src/popup/popup.css'
];

cssFiles.forEach(file => {
  const content = fs.readFileSync(path.join(rootDir, file), 'utf8');
  let openBraces = (content.match(/\{/g) || []).length;
  let closeBraces = (content.match(/\}/g) || []).length;
  check(openBraces === closeBraces, `${file} balanced braces (${openBraces} open, ${closeBraces} close)`);
  check(!content.includes('undefined'), `${file} has no accidental "undefined" tokens`);
});

console.log('\n========================================');
console.log('4. HTML INTEGRITY & REQUIRED IDS');
console.log('========================================');

const popupHtml = fs.readFileSync(path.join(rootDir, 'src/popup/popup.html'), 'utf8');

const requiredPopupIds = [
  'tab-btn-home',
  'tab-btn-settings',
  'tab-content-home',
  'tab-content-settings',
  'jt-connection-pill',
  'card-connected-sheet',
  'card-setup-prompt',
  'sheet-title-text',
  'sheet-external-link',
  'count-saved',
  'count-applied',
  'count-interview',
  'count-offer',
  'count-accepted',
  'funnel-conversion-rate',
  'active-filter-badge',
  'btn-clear-filter',
  'recent-jobs-list',
  'btn-quick-setup',
  'btn-create-sheet',
  'input-existing-sheet',
  'btn-connect-existing',
  'btn-sync-cache',
  'btn-disconnect',
  'jt-status-bar-text'
];

requiredPopupIds.forEach(id => {
  const hasId = popupHtml.includes(`id="${id}"`);
  check(hasId, `popup.html contains required ID: #${id}`);
});

console.log('\n========================================');
console.log('5. URL NORMALIZER STRESS TESTS');
console.log('========================================');

const stressCases = [
  // Standard URLs
  {
    in: 'https://www.linkedin.com/jobs/view/1234567890/',
    out: 'https://www.linkedin.com/jobs/view/1234567890/',
    desc: 'Clean direct view'
  },
  // URLs with heavy tracking query strings
  {
    in: 'https://www.linkedin.com/jobs/view/1234567890/?refId=abc&trackingId=xyz&trk=d_flagship3_job_home&lipi=urn%3Ali%3Apage%3A123',
    out: 'https://www.linkedin.com/jobs/view/1234567890/',
    desc: 'Direct view with 4+ tracking params stripped'
  },
  // Search URLs with currentJobId
  {
    in: 'https://www.linkedin.com/jobs/search/?currentJobId=1234567890&geoId=103644278&keywords=software',
    out: 'https://www.linkedin.com/jobs/view/1234567890/',
    desc: 'Search view with currentJobId converted to canonical'
  },
  // Collections URL with jobId
  {
    in: 'https://www.linkedin.com/jobs/collections/recommended/?jobId=9988776655&origin=JOB_ALERT_EMAIL',
    out: 'https://www.linkedin.com/jobs/view/9988776655/',
    desc: 'Collections view with jobId converted to canonical'
  },
  // Missing trailing slash
  {
    in: 'https://www.linkedin.com/jobs/view/555444333',
    out: 'https://www.linkedin.com/jobs/view/555444333/',
    desc: 'Adds trailing slash consistently'
  },
  // Subdomain variations
  {
    in: 'https://uk.linkedin.com/jobs/view/1122334455/?trk=sem',
    out: 'https://www.linkedin.com/jobs/view/1122334455/',
    desc: 'Standardizes country subdomain to www.linkedin.com'
  },
  // Invalid / empty inputs
  {
    in: '',
    out: '',
    desc: 'Handles empty string gracefully'
  },
  {
    in: null,
    out: '',
    desc: 'Handles null input gracefully'
  }
];

stressCases.forEach(tc => {
  const result = normalizeJobUrl(tc.in);
  check(result === tc.out, `${tc.desc}: got "${result}"`);
});

console.log('\n========================================');
console.log('6. SERVICE WORKER MESSAGE ROUTING AUDIT');
console.log('========================================');

const swContent = fs.readFileSync(path.join(rootDir, 'src/background/service-worker.js'), 'utf8');

const expectedActions = [
  'CHECK_JOB_STATUS',
  'SAVE_JOB',
  'UNDO_SAVE',
  'CREATE_SHEET',
  'CONNECT_SHEET',
  'SYNC_SHEET',
  'GET_STATUS',
  'UPDATE_JOB_DETAILS',
  'GET_SAVED_URLS',
  'DISCONNECT'
];

expectedActions.forEach(action => {
  check(swContent.includes(`action === '${action}'`), `Service worker implements action handler: ${action}`);
});

check(swContent.includes('chrome.commands.onCommand.addListener'), 'Service worker registers commands listener');
check(swContent.includes('return true; // Keeps async message channel open'), 'Service worker returns true for async responses');

console.log('\n========================================');
console.log('7. SHEETS API V4 CONTRACT AUDIT');
console.log('========================================');

const sheetsApiContent = fs.readFileSync(path.join(rootDir, 'src/background/sheets-api.js'), 'utf8');

check(sheetsApiContent.includes('export async function createJobTrackerSheet'), 'Exports createJobTrackerSheet');
check(sheetsApiContent.includes('export async function appendJobRow'), 'Exports appendJobRow');
check(sheetsApiContent.includes('export async function deleteJobRow'), 'Exports deleteJobRow');
check(sheetsApiContent.includes('export async function verifyAndSetupSheet'), 'Exports verifyAndSetupSheet');
check(sheetsApiContent.includes('export async function fetchAllSheetJobs'), 'Exports fetchAllSheetJobs');
check(sheetsApiContent.includes('export async function updateJobStatusAndNotes'), 'Exports updateJobStatusAndNotes');
check(sheetsApiContent.includes('ONE_OF_LIST'), 'Includes ONE_OF_LIST data validation rule');
check(sheetsApiContent.includes('frozenRowCount: 1'), 'Includes frozenRowCount: 1');

console.log('\n========================================');
console.log('8. WCAG CONTRAST RATIO VERIFICATION');
console.log('========================================');

function getLuminance(r, g, b) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
}

function getContrast(rgb1, rgb2) {
  const lum1 = getLuminance(...rgb1);
  const lum2 = getLuminance(...rgb2);
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

// Canvas bg: #090D16 -> [9, 13, 22]
// Surface bg: #111827 -> [17, 24, 39]
// Text Primary: #F9FAFB -> [249, 250, 251]
// Text Secondary: #D1D5DB -> [209, 213, 219]
// Text Muted: #9CA3AF -> [156, 163, 175]

const bgCanvas = [9, 13, 22];
const bgSurface = [17, 24, 39];
const textPrimary = [249, 250, 251];
const textSecondary = [209, 213, 219];
const textMuted = [156, 163, 175];

const ratioPrimary = getContrast(textPrimary, bgCanvas);
const ratioSecondary = getContrast(textSecondary, bgSurface);
const ratioMuted = getContrast(textMuted, bgSurface);

check(ratioPrimary >= 7.0, `Text primary contrast ratio is ${ratioPrimary.toFixed(2)}:1 (exceeds WCAG AAA 7:1)`);
check(ratioSecondary >= 7.0, `Text secondary contrast ratio is ${ratioSecondary.toFixed(2)}:1 (exceeds WCAG AAA 7:1)`);
check(ratioMuted >= 4.5, `Text muted contrast ratio is ${ratioMuted.toFixed(2)}:1 (exceeds WCAG AA 4.5:1)`);

console.log('\n========================================');
console.log(`TOTAL AUDIT RESULT: ${passed}/${total} CHECKS PASSED`);
console.log('========================================\n');
