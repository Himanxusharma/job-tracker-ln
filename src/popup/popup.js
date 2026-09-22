/**
 * Job Tracker LN - Popup Controller
 * Manages tab switching, Google Sheet connection wizards,
 * cache refreshing, and real-time status updates.
 */

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements - Navigation
  const tabBtnHome = document.getElementById('tab-btn-home');
  const tabBtnSettings = document.getElementById('tab-btn-settings');
  const panelHome = document.getElementById('tab-content-home');
  const panelSettings = document.getElementById('tab-content-settings');

  // DOM Elements - Status & Header
  const connectionPill = document.getElementById('jt-connection-pill');
  const cardConnectedSheet = document.getElementById('card-connected-sheet');
  const cardSetupPrompt = document.getElementById('card-setup-prompt');
  const sheetTitleText = document.getElementById('sheet-title-text');
  const sheetExternalLink = document.getElementById('sheet-external-link');
  const metricJobsCount = document.getElementById('metric-jobs-count');
  const activityCountText = document.getElementById('activity-count-text');
  const recentJobsList = document.getElementById('recent-jobs-list');
  const statusBarText = document.getElementById('jt-status-bar-text');

  // DOM Elements - Actions
  const btnQuickSetup = document.getElementById('btn-quick-setup');
  const btnCreateSheet = document.getElementById('btn-create-sheet');
  const inputExistingSheet = document.getElementById('input-existing-sheet');
  const btnConnectExisting = document.getElementById('btn-connect-existing');
  const btnSyncCache = document.getElementById('btn-sync-cache');
  const btnDisconnect = document.getElementById('btn-disconnect');

  /**
   * Sets temporary status bar feedback message.
   */
  function setStatusMessage(msg, isError = false) {
    if (statusBarText) {
      statusBarText.textContent = msg;
      statusBarText.style.color = isError ? '#F87171' : '#9CA3AF';
    }
  }

  /**
   * Switches active navigation tab.
   */
  function switchTab(target) {
    if (target === 'home') {
      tabBtnHome.classList.add('jt-tab-active');
      tabBtnHome.setAttribute('aria-selected', 'true');
      tabBtnSettings.classList.remove('jt-tab-active');
      tabBtnSettings.setAttribute('aria-selected', 'false');

      panelHome.style.display = 'flex';
      panelSettings.style.display = 'none';
    } else {
      tabBtnSettings.classList.add('jt-tab-active');
      tabBtnSettings.setAttribute('aria-selected', 'true');
      tabBtnHome.classList.remove('jt-tab-active');
      tabBtnHome.setAttribute('aria-selected', 'false');

      panelSettings.style.display = 'flex';
      panelHome.style.display = 'none';
    }
  }

  tabBtnHome.addEventListener('click', () => switchTab('home'));
  tabBtnSettings.addEventListener('click', () => switchTab('settings'));

  /**
   * Renders the list of recently saved jobs.
   */
  function renderRecentJobs(jobs) {
    if (!jobs || jobs.length === 0) {
      recentJobsList.innerHTML = `
        <div class="jt-empty-state">
          <p>No jobs tracked yet. Open any LinkedIn job posting to save it directly!</p>
        </div>
      `;
      return;
    }

    recentJobsList.innerHTML = jobs.map(job => {
      const statusClass = `tag-${(job.status || 'saved').toLowerCase()}`;
      return `
        <div class="jt-job-item">
          <div class="jt-job-item-details">
            <div class="jt-job-item-title" title="${escapeHtml(job.role || 'Job Posting')}">
              ${escapeHtml(job.role || 'Job Posting')}
            </div>
            <div class="jt-job-item-company">
              ${escapeHtml(job.company || 'Company')} • ${escapeHtml(job.location || 'Remote')}
            </div>
          </div>
          <span class="jt-status-tag ${statusClass}">${escapeHtml(job.status || 'Saved')}</span>
        </div>
      `;
    }).join('');
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Loads full status from extension background service worker.
   */
  async function refreshStatus() {
    chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        setStatusMessage('Background service worker inactive or starting...', true);
        return;
      }

      const { settings, savedCount, recentJobs } = response;
      const isConnected = Boolean(settings && settings.sheetId);

      // Header Connection Pill
      if (isConnected) {
        connectionPill.className = 'jt-status-pill jt-pill-connected';
        connectionPill.innerHTML = '<span class="jt-status-dot"></span><span>Connected</span>';

        cardConnectedSheet.style.display = 'flex';
        cardSetupPrompt.style.display = 'none';

        sheetTitleText.textContent = settings.sheetTitle || 'Job Tracker LN';
        sheetExternalLink.href = settings.sheetUrl || `https://docs.google.com/spreadsheets/d/${settings.sheetId}/edit`;
      } else {
        connectionPill.className = 'jt-status-pill jt-pill-disconnected';
        connectionPill.innerHTML = '<span class="jt-status-dot"></span><span>Not Connected</span>';

        cardConnectedSheet.style.display = 'none';
        cardSetupPrompt.style.display = 'flex';
      }

      // Metrics & Activity
      metricJobsCount.textContent = String(savedCount || 0);
      activityCountText.textContent = `${savedCount || 0} saved`;
      renderRecentJobs(recentJobs);

      if (isConnected) {
        setStatusMessage(`Ready. Connected to "${settings.sheetTitle || 'Job Tracker LN'}".`);
      } else {
        setStatusMessage('Click "Auto-Create Sheet" to start tracking.');
      }
    });
  }

  /**
   * Initiates automatic Google Sheet creation.
   */
  async function handleCreateSheet(btnElement) {
    const originalText = btnElement.innerHTML;
    btnElement.disabled = true;
    btnElement.innerHTML = `<span>Creating Sheet & Dropdowns...</span>`;
    setStatusMessage('Connecting with Google Sheets API...');

    chrome.runtime.sendMessage({ action: 'CREATE_SHEET' }, (res) => {
      btnElement.disabled = false;
      btnElement.innerHTML = originalText;

      if (res && res.success) {
        setStatusMessage('Google Sheet created and formatted successfully!');
        refreshStatus();
        switchTab('home');
      } else {
        const errorText = res?.error || 'Could not create sheet. Please check Google OAuth permission.';
        setStatusMessage(errorText, true);
        alert(errorText);
      }
    });
  }

  btnQuickSetup.addEventListener('click', () => handleCreateSheet(btnQuickSetup));
  btnCreateSheet.addEventListener('click', () => handleCreateSheet(btnCreateSheet));

  /**
   * Connects an existing Google Sheet by URL or ID.
   */
  btnConnectExisting.addEventListener('click', () => {
    const rawInput = inputExistingSheet.value.trim();
    if (!rawInput) {
      alert('Please paste a valid Google Sheet URL or spreadsheet ID.');
      return;
    }

    btnConnectExisting.disabled = true;
    btnConnectExisting.textContent = 'Linking...';
    setStatusMessage('Validating sheet schema...');

    chrome.runtime.sendMessage({ action: 'CONNECT_SHEET', sheetIdOrUrl: rawInput }, (res) => {
      btnConnectExisting.disabled = false;
      btnConnectExisting.textContent = 'Link';

      if (res && res.success) {
        inputExistingSheet.value = '';
        setStatusMessage(`Connected! Found ${res.count || 0} existing jobs.`);
        refreshStatus();
        switchTab('home');
      } else {
        const errorText = res?.error || 'Failed to link sheet. Ensure your Google account has edit access.';
        setStatusMessage(errorText, true);
        alert(errorText);
      }
    });
  });

  /**
   * Refreshes local dedup cache from connected sheet.
   */
  btnSyncCache.addEventListener('click', () => {
    btnSyncCache.disabled = true;
    setStatusMessage('Syncing local cache from Google Sheet...');

    chrome.runtime.sendMessage({ action: 'SYNC_SHEET' }, (res) => {
      btnSyncCache.disabled = false;
      if (res && res.success) {
        setStatusMessage(`Cache refreshed! ${res.count || 0} jobs indexed.`);
        refreshStatus();
      } else {
        setStatusMessage(res?.error || 'Sync failed.', true);
      }
    });
  });

  /**
   * Disconnects active sheet and clears session.
   */
  btnDisconnect.addEventListener('click', () => {
    const confirmed = confirm('Disconnect Google Sheet and clear local tracker cache? Your Google Sheet itself will NOT be deleted.');
    if (!confirmed) return;

    chrome.runtime.sendMessage({ action: 'DISCONNECT' }, () => {
      setStatusMessage('Disconnected Google Sheet.');
      refreshStatus();
      switchTab('home');
    });
  });

  // Initial load
  refreshStatus();
});
