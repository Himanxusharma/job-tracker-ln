/**
 * Job Tracker LN - Storage Utilities
 * Type-safe interface to chrome.storage.local for settings,
 * OAuth tokens, and local dedup cache.
 */

const STORAGE_KEYS = {
  SHEET_ID: 'jt_sheet_id',
  SHEET_URL: 'jt_sheet_url',
  SHEET_TITLE: 'jt_sheet_title',
  SAVED_JOBS: 'jt_saved_jobs',
  OAUTH_CLIENT_ID: 'jt_oauth_client_id',
  LAST_SYNC: 'jt_last_sync',
  USER_INFO: 'jt_user_info'
};

/**
 * Gets extension settings.
 */
export async function getSettings() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.SHEET_ID,
    STORAGE_KEYS.SHEET_URL,
    STORAGE_KEYS.SHEET_TITLE,
    STORAGE_KEYS.OAUTH_CLIENT_ID,
    STORAGE_KEYS.LAST_SYNC,
    STORAGE_KEYS.USER_INFO
  ]);

  return {
    sheetId: data[STORAGE_KEYS.SHEET_ID] || '',
    sheetUrl: data[STORAGE_KEYS.SHEET_URL] || '',
    sheetTitle: data[STORAGE_KEYS.SHEET_TITLE] || 'Job Tracker LN',
    oauthClientId: data[STORAGE_KEYS.OAUTH_CLIENT_ID] || '',
    lastSync: data[STORAGE_KEYS.LAST_SYNC] || null,
    userInfo: data[STORAGE_KEYS.USER_INFO] || null
  };
}

/**
 * Updates extension settings.
 */
export async function saveSettings(settings) {
  const updates = {};
  if (settings.sheetId !== undefined) updates[STORAGE_KEYS.SHEET_ID] = settings.sheetId;
  if (settings.sheetUrl !== undefined) updates[STORAGE_KEYS.SHEET_URL] = settings.sheetUrl;
  if (settings.sheetTitle !== undefined) updates[STORAGE_KEYS.SHEET_TITLE] = settings.sheetTitle;
  if (settings.oauthClientId !== undefined) updates[STORAGE_KEYS.OAUTH_CLIENT_ID] = settings.oauthClientId;
  if (settings.lastSync !== undefined) updates[STORAGE_KEYS.LAST_SYNC] = settings.lastSync;
  if (settings.userInfo !== undefined) updates[STORAGE_KEYS.USER_INFO] = settings.userInfo;

  await chrome.storage.local.set(updates);
}

/**
 * Retrieves all saved jobs from local dedup cache.
 * @returns {Promise<Object>} Map of normalizedUrl -> job info
 */
export async function getSavedJobsCache() {
  const data = await chrome.storage.local.get(STORAGE_KEYS.SAVED_JOBS);
  return data[STORAGE_KEYS.SAVED_JOBS] || {};
}

/**
 * Checks if a job has already been saved.
 * @param {string} normalizedUrl
 * @returns {Promise<Object|null>}
 */
export async function getSavedJob(normalizedUrl) {
  if (!normalizedUrl) return null;
  const cache = await getSavedJobsCache();
  return cache[normalizedUrl] || null;
}

/**
 * Adds or updates a saved job in local cache.
 * @param {Object} job
 */
export async function addSavedJob(job) {
  if (!job || !job.jobLink) return;
  const cache = await getSavedJobsCache();
  cache[job.jobLink] = {
    role: job.role || '',
    company: job.company || '',
    location: job.location || '',
    dateSaved: job.dateSaved || new Date().toISOString(),
    status: job.status || 'Saved',
    rowIndex: job.rowIndex || null
  };
  await chrome.storage.local.set({ [STORAGE_KEYS.SAVED_JOBS]: cache });
}

/**
 * Removes a job from local cache (used for Undo).
 * @param {string} normalizedUrl
 */
export async function removeSavedJob(normalizedUrl) {
  if (!normalizedUrl) return;
  const cache = await getSavedJobsCache();
  if (cache[normalizedUrl]) {
    delete cache[normalizedUrl];
    await chrome.storage.local.set({ [STORAGE_KEYS.SAVED_JOBS]: cache });
  }
}

/**
 * Replaces the entire saved jobs cache (e.g. after sync from Google Sheet).
 * @param {Object} freshCache
 */
export async function replaceSavedJobsCache(freshCache) {
  await chrome.storage.local.set({
    [STORAGE_KEYS.SAVED_JOBS]: freshCache,
    [STORAGE_KEYS.LAST_SYNC]: new Date().toISOString()
  });
}

/**
 * Clears sheet connection and local cached data.
 */
export async function clearSheetData() {
  await chrome.storage.local.remove([
    STORAGE_KEYS.SHEET_ID,
    STORAGE_KEYS.SHEET_URL,
    STORAGE_KEYS.SHEET_TITLE,
    STORAGE_KEYS.SAVED_JOBS,
    STORAGE_KEYS.LAST_SYNC
  ]);
}
