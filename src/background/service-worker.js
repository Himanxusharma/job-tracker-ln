/**
 * Job Tracker LN - Service Worker (Manifest V3)
 * Manages Google OAuth tokens, message dispatching,
 * Google Sheets API transactions, and local dedup caching.
 */

import {
  createJobTrackerSheet,
  appendJobRow,
  deleteJobRow,
  verifyAndSetupSheet,
  fetchAllSheetJobs,
  updateJobStatusAndNotes
} from './sheets-api.js';

import {
  getSettings,
  saveSettings,
  getSavedJob,
  addSavedJob,
  removeSavedJob,
  replaceSavedJobsCache,
  getSavedJobsCache,
  clearSheetData
} from '../utils/storage.js';

import { normalizeJobUrl } from '../utils/url-normalizer.js';

/**
 * Retrieves a valid Google OAuth 2.0 Access Token.
 * @param {boolean} interactive - Whether to prompt the user if not currently signed in.
 */
async function getAuthToken(interactive = false) {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive }, (token) => {
      if (chrome.runtime.lastError) {
        return reject(new Error(chrome.runtime.lastError.message));
      }
      if (!token) {
        return reject(new Error('Failed to obtain Google OAuth access token.'));
      }
      resolve(token);
    });
  });
}

/**
 * Removes cached token upon 401 error or user logout.
 */
async function removeAuthToken(token) {
  if (!token) return;
  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      resolve();
    });
  });
}

// Keyboard Shortcut Command Listener (Alt+S)
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'save_job_shortcut') {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab && tab.id) {
      chrome.tabs.sendMessage(tab.id, { action: 'TRIGGER_SAVE_SHORTCUT' }).catch(() => {});
    }
  }
});

// Runtime message router
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    try {
      const action = message.action;

      // 1. Check if a specific job link is already saved
      if (action === 'CHECK_JOB_STATUS') {
        const normalizedUrl = normalizeJobUrl(message.jobLink);
        const saved = await getSavedJob(normalizedUrl);
        return sendResponse({
          isSaved: Boolean(saved),
          status: saved?.status || null,
          savedJob: saved
        });
      }

      // 2. Save a job posting
      if (action === 'SAVE_JOB') {
        const { sheetId } = await getSettings();
        if (!sheetId) {
          return sendResponse({ unconfigured: true });
        }

        const jobData = message.jobData || {};
        const normalizedUrl = normalizeJobUrl(jobData.jobLink);
        jobData.jobLink = normalizedUrl;

        // Dedup Check
        const existingJob = await getSavedJob(normalizedUrl);
        if (existingJob) {
          return sendResponse({
            duplicate: true,
            existingJob
          });
        }

        // Get OAuth token
        let token;
        try {
          token = await getAuthToken(false);
        } catch (tokenErr) {
          // If silent token fails, try interactive
          try {
            token = await getAuthToken(true);
          } catch (interactiveErr) {
            return sendResponse({
              success: false,
              error: 'Google Authentication required. Please open extension settings to sign in.'
            });
          }
        }

        // Write row to Google Sheets
        try {
          const appendRes = await appendJobRow(token, sheetId, jobData);
          jobData.rowIndex = appendRes.rowIndex;

          // Update local dedup cache
          await addSavedJob(jobData);

          return sendResponse({
            success: true,
            rowIndex: appendRes.rowIndex,
            jobData
          });
        } catch (apiErr) {
          if (apiErr.status === 401) {
            await removeAuthToken(token);
            return sendResponse({
              success: false,
              error: 'Google session expired. Please open extension settings and reconnect.'
            });
          }
          return sendResponse({
            success: false,
            error: apiErr.message || 'Error writing to Google Sheet.'
          });
        }
      }

      // 3. Undo a saved job within 5s window
      if (action === 'UNDO_SAVE') {
        const { sheetId } = await getSettings();
        const { jobLink, rowIndex } = message;
        const normalizedUrl = normalizeJobUrl(jobLink);

        let token = await getAuthToken(false);
        if (rowIndex && sheetId) {
          try {
            await deleteJobRow(token, sheetId, rowIndex);
          } catch (e) {
            console.warn('Could not delete row by index, removing from cache only:', e);
          }
        }

        await removeSavedJob(normalizedUrl);
        return sendResponse({ success: true });
      }

      // 4. Create a new Google Sheet
      if (action === 'CREATE_SHEET') {
        const token = await getAuthToken(true);
        const sheetDetails = await createJobTrackerSheet(token);

        await saveSettings({
          sheetId: sheetDetails.sheetId,
          sheetUrl: sheetDetails.sheetUrl,
          sheetTitle: sheetDetails.sheetTitle
        });

        // Initialize empty cache
        await replaceSavedJobsCache({});

        return sendResponse({
          success: true,
          sheetDetails
        });
      }

      // 5. Connect an existing Google Sheet by ID or URL
      if (action === 'CONNECT_SHEET') {
        let rawInput = message.sheetIdOrUrl || '';
        let sheetId = rawInput.trim();

        // Extract ID if a full Google Sheets URL was pasted
        const match = sheetId.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
        if (match && match[1]) {
          sheetId = match[1];
        }

        if (!sheetId) {
          return sendResponse({ success: false, error: 'Invalid Google Sheet ID or URL' });
        }

        const token = await getAuthToken(true);
        const setupResult = await verifyAndSetupSheet(token, sheetId);

        await saveSettings({
          sheetId: setupResult.sheetId,
          sheetUrl: setupResult.sheetUrl,
          sheetTitle: setupResult.sheetTitle
        });

        // Populate local dedup cache with any existing entries
        const existingJobs = await fetchAllSheetJobs(token, sheetId);
        await replaceSavedJobsCache(existingJobs);

        return sendResponse({
          success: true,
          setupResult,
          count: Object.keys(existingJobs).length
        });
      }

      // 6. Sync cache from connected Google Sheet
      if (action === 'SYNC_SHEET') {
        const { sheetId } = await getSettings();
        if (!sheetId) {
          return sendResponse({ success: false, error: 'No sheet connected.' });
        }

        const token = await getAuthToken(true);
        const existingJobs = await fetchAllSheetJobs(token, sheetId);
        await replaceSavedJobsCache(existingJobs);

        return sendResponse({
          success: true,
          count: Object.keys(existingJobs).length
        });
      }

      // 7. Get full status for Popup UI
      if (action === 'GET_STATUS') {
        const settings = await getSettings();
        const cache = await getSavedJobsCache();
        const count = Object.keys(cache).length;
        return sendResponse({
          settings,
          savedCount: count,
          recentJobs: Object.values(cache).slice(-5).reverse()
        });
      }

      // 8. Update Status and Notes for a job
      if (action === 'UPDATE_JOB_DETAILS') {
        const { sheetId } = await getSettings();
        if (!sheetId) {
          return sendResponse({ success: false, error: 'No sheet connected.' });
        }

        const { jobLink, status, notes, rowIndex } = message;
        const normalizedUrl = normalizeJobUrl(jobLink);

        let token = await getAuthToken(true);
        await updateJobStatusAndNotes(token, sheetId, rowIndex, status, notes, normalizedUrl);

        // Update local cache
        const cache = await getSavedJobsCache();
        if (cache[normalizedUrl]) {
          cache[normalizedUrl].status = status;
          cache[normalizedUrl].notes = notes;
          await replaceSavedJobsCache(cache);
        }

        return sendResponse({ success: true, status, notes });
      }

      // 9. Get all saved URLs for search list badging
      if (action === 'GET_SAVED_URLS') {
        const cache = await getSavedJobsCache();
        return sendResponse({ savedJobs: cache });
      }

      // 10. Disconnect sheet & logout
      if (action === 'DISCONNECT') {
        try {
          const token = await getAuthToken(false);
          await removeAuthToken(token);
        } catch (e) {
          // Token might already be clear
        }
        await clearSheetData();
        return sendResponse({ success: true });
      }

      return sendResponse({ error: `Unknown action: ${action}` });
    } catch (err) {
      console.error('Service worker error:', err);
      return sendResponse({ success: false, error: err.message || 'Internal extension error' });
    }
  })();

  return true; // Keeps async message channel open
});
