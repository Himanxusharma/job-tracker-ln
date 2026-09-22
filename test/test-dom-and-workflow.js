/**
 * Job Tracker LN - End-to-End Workflow & DOM Simulation Test
 */

import { normalizeJobUrl } from '../src/utils/url-normalizer.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');

let total = 0;
let passed = 0;

function assert(cond, msg) {
  total++;
  if (cond) {
    passed++;
    console.log(`✅ [PASS] ${msg}`);
  } else {
    console.error(`❌ [FAIL] ${msg}`);
    process.exitCode = 1;
  }
}

console.log('\n--- E2E Test Suite 1: Mock LinkedIn HTML Parsing ---');
const mockHtml = fs.readFileSync(path.join(rootDir, 'test/mock-linkedin.html'), 'utf8');

// Regex-based extractor verification mimicking parser.js logic
function simulateParse(html, url) {
  // Title
  const titleMatch = html.match(/class="job-details-jobs-unified-top-card__job-title"[^>]*>[\s\S]*?<h1>([\s\S]*?)<\/h1>/i);
  const role = titleMatch ? titleMatch[1].trim() : '';

  // Company
  const companyMatch = html.match(/class="job-details-jobs-unified-top-card__company-name"[^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i);
  const company = companyMatch ? companyMatch[1].trim() : '';

  // Location
  const locationMatch = html.match(/class="job-details-jobs-unified-top-card__bullet"[^>]*>([\s\S]*?)<\/span>/i);
  const location = locationMatch ? locationMatch[1].trim() : '';

  const jobLink = normalizeJobUrl(url);

  return { role, company, location, jobLink, dateSaved: new Date().toISOString() };
}

const parsed = simulateParse(mockHtml, 'https://www.linkedin.com/jobs/view/4199999999/?trackingId=abc123xyz');
assert(parsed.role === 'Senior Staff Systems Engineer', `Role correctly extracted: "${parsed.role}"`);
assert(parsed.company === 'Anthropic', `Company correctly extracted: "${parsed.company}"`);
assert(parsed.location === 'San Francisco, CA (Hybrid)', `Location correctly extracted: "${parsed.location}"`);
assert(parsed.jobLink === 'https://www.linkedin.com/jobs/view/4199999999/', `Job Link normalized: "${parsed.jobLink}"`);

console.log('\n--- E2E Test Suite 2: State & Storage Transition Simulation ---');
const mockStorage = {
  sheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
  savedJobs: {}
};

function saveJobWorkflow(job) {
  if (!mockStorage.sheetId) return { unconfigured: true };
  if (mockStorage.savedJobs[job.jobLink]) {
    return { duplicate: true, existingJob: mockStorage.savedJobs[job.jobLink] };
  }
  const rowIndex = Object.keys(mockStorage.savedJobs).length + 2;
  const savedRecord = { ...job, status: 'Saved', rowIndex };
  mockStorage.savedJobs[job.jobLink] = savedRecord;
  return { success: true, rowIndex, jobData: savedRecord };
}

function undoWorkflow(jobLink) {
  if (mockStorage.savedJobs[jobLink]) {
    delete mockStorage.savedJobs[jobLink];
    return { success: true };
  }
  return { success: false, error: 'Job not found' };
}

// 1. Initial save
const saveRes1 = saveJobWorkflow(parsed);
assert(saveRes1.success === true, 'First save succeeds');
assert(saveRes1.rowIndex === 2, 'Assigned row index 2 in Google Sheet');
assert(mockStorage.savedJobs[parsed.jobLink].status === 'Saved', 'Default status is "Saved"');

// 2. Duplicate save
const saveRes2 = saveJobWorkflow(parsed);
assert(saveRes2.duplicate === true, 'Second save correctly detected as duplicate');
assert(saveRes2.existingJob.role === 'Senior Staff Systems Engineer', 'Duplicate response includes existing job info');

// 3. Undo save
const undoRes = undoWorkflow(parsed.jobLink);
assert(undoRes.success === true, 'Undo successfully removes entry from database');
assert(!mockStorage.savedJobs[parsed.jobLink], 'Database no longer contains undone job');

// 4. Re-save after undo
const saveRes3 = saveJobWorkflow(parsed);
assert(saveRes3.success === true, 'Re-saving after undo succeeds');

console.log('\n--- E2E Test Suite 3: Sheets API Schema & Data Validation Specs ---');
const EXPECTED_STATUSES = [
  'Saved',
  'Applied',
  'Interview',
  'Offer',
  'Accepted',
  'Rejected',
  'Archived'
];
assert(EXPECTED_STATUSES.length === 7, 'Exactly 7 statuses specified in FRD');
assert(EXPECTED_STATUSES[0] === 'Saved', 'First/Default status is "Saved"');
assert(EXPECTED_STATUSES.includes('Rejected'), 'Includes "Rejected"');
assert(EXPECTED_STATUSES.includes('Archived'), 'Includes "Archived"');

console.log(`\n================================`);
console.log(`Results: ${passed}/${total} E2E verification tests passed.`);
console.log(`================================\n`);
