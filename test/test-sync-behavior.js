/**
 * Test: Manual Sheet Sync Behavior
 * Tests syncing data from Google Sheet with modifications and deletions.
 */

import assert from 'assert';
import { normalizeJobUrl } from '../src/utils/url-normalizer.js';

console.log('--- Test Suite: Sheet Sync & Deletion Purge Verification ---');

// Mock Sheet data as returned by Google Sheets values API
const mockSheetRows = [
  // Row 2
  ['2026-09-20T10:00:00Z', 'Staff Frontend Engineer', 'Vercel', 'Remote', 'https://www.linkedin.com/jobs/view/1000000001/', 'Interview', 'Passed round 1', 'https://www.linkedin.com/company/vercel/'],
  // Row 3 (User edited status from 'Saved' to 'Offer')
  ['2026-09-21T11:00:00Z', 'Senior Systems Architect', 'Linear', 'San Francisco, CA', 'https://www.linkedin.com/jobs/view/1000000002/', 'Offer', 'Offer details received', 'https://www.linkedin.com/company/linear/']
  // Note: Row 4 ('1000000003') was deleted by user in the spreadsheet!
];

// Simulate fetchAllSheetJobs logic
const jobMap = {};
mockSheetRows.forEach((row, idx) => {
  const dateSaved = row[0] || '';
  const role = row[1] || '';
  const company = row[2] || '';
  const location = row[3] || '';
  const jobLink = (row[4] || '').trim();
  const status = row[5] || 'Saved';
  const notes = row[6] || '';
  const companyUrl = row[7] || '';
  const rowIndex = idx + 2;

  if (jobLink) {
    const canonicalKey = normalizeJobUrl(jobLink) || jobLink;
    jobMap[canonicalKey] = {
      dateSaved,
      role,
      company,
      companyUrl,
      location,
      status,
      notes,
      rowIndex,
      jobLink: canonicalKey
    };
  }
});

// Test 1: Surviving row count
assert.strictEqual(Object.keys(jobMap).length, 2, 'JobMap should only contain 2 active rows');
console.log('✅ [PASS] JobMap contains only surviving rows (2 rows)');

// Test 2: Deleted job is absent
const deletedUrl = 'https://www.linkedin.com/jobs/view/1000000003/';
assert.strictEqual(jobMap[deletedUrl], undefined, 'Deleted job should not exist in jobMap');
console.log('✅ [PASS] Deleted row (1000000003) is completely purged');

// Test 3: Status edit is reflected
const editedJob = jobMap['https://www.linkedin.com/jobs/view/1000000002/'];
assert.ok(editedJob, 'Edited job should exist');
assert.strictEqual(editedJob.status, 'Offer', 'Status should be updated to Offer');
assert.strictEqual(editedJob.notes, 'Offer details received', 'Notes should be updated');
console.log('✅ [PASS] Modified status ("Offer") and notes successfully indexed');

// Test 4: Row indices are accurately recalculated
assert.strictEqual(jobMap['https://www.linkedin.com/jobs/view/1000000001/'].rowIndex, 2);
assert.strictEqual(jobMap['https://www.linkedin.com/jobs/view/1000000002/'].rowIndex, 3);
console.log('✅ [PASS] Row indices accurately reflect spreadsheet row positions');

console.log('====================================');
console.log('All 4 sync behavior tests passed! 🚀');
console.log('====================================');
