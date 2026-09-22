/**
 * Job Tracker LN - Popup Controller
 * Manages tab switching, Google Sheet connection wizards,
 * pipeline funnel analytics, and real-time status updates.
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
  const activityCountText = document.getElementById('activity-count-text');
  const recentJobsList = document.getElementById('recent-jobs-list');
  const statusBarText = document.getElementById('jt-status-bar-text');

  // DOM Elements - Funnel & Filters
  const funnelSteps = document.querySelectorAll('.jt-funnel-step');
  const funnelConversionRate = document.getElementById('funnel-conversion-rate');
  const activeFilterBadge = document.getElementById('active-filter-badge');
  const activeFilterName = document.getElementById('active-filter-name');
  const btnClearFilter = document.getElementById('btn-clear-filter');

  const countSaved = document.getElementById('count-saved');
  const countApplied = document.getElementById('count-applied');
  const countInterview = document.getElementById('count-interview');
  const countOffer = document.getElementById('count-offer');
  const countAccepted = document.getElementById('count-accepted');

  // DOM Elements - Actions
  const btnQuickSetup = document.getElementById('btn-quick-setup');
  const btnCreateSheet = document.getElementById('btn-create-sheet');
  const inputExistingSheet = document.getElementById('input-existing-sheet');
  const btnConnectExisting = document.getElementById('btn-connect-existing');
  const btnSyncCache = document.getElementById('btn-sync-cache');
  const btnDisconnect = document.getElementById('btn-disconnect');

  let allJobsList = [];
  let currentFilter = null;

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
   * Updates pipeline funnel counts and conversion rates.
   */
  function updatePipelineFunnel(jobs) {
    const counts = {
      Saved: 0,
      Applied: 0,
      Interview: 0,
      Offer: 0,
      Accepted: 0,
      Rejected: 0,
      Archived: 0
    };

    jobs.forEach(job => {
      const st = job.status || 'Saved';
      if (counts[st] !== undefined) {
        counts[st]++;
      } else {
        counts.Saved++;
      }
    });

    if (countSaved) countSaved.textContent = String(counts.Saved);
    if (countApplied) countApplied.textContent = String(counts.Applied);
    if (countInterview) countInterview.textContent = String(counts.Interview);
    if (countOffer) countOffer.textContent = String(counts.Offer);
    if (countAccepted) countAccepted.textContent = String(counts.Accepted);

    // Compute Interview Rate: Interview / Applied (or Interview / Total if direct)
    const totalApplied = counts.Applied + counts.Interview + counts.Offer + counts.Accepted;
    if (totalApplied > 0 && funnelConversionRate) {
      const interviewPlus = counts.Interview + counts.Offer + counts.Accepted;
      const rate = Math.round((interviewPlus / totalApplied) * 100);
      funnelConversionRate.textContent = `${rate}% Interview Rate`;
    } else if (funnelConversionRate) {
      funnelConversionRate.textContent = '0% Interview Rate';
    }
  }

  /**
   * Filters and renders recent jobs.
   */
  function renderRecentJobs() {
    let displayJobs = allJobsList;
    if (currentFilter) {
      displayJobs = allJobsList.filter(j => (j.status || 'Saved').toLowerCase() === currentFilter.toLowerCase());
    }

    if (!displayJobs || displayJobs.length === 0) {
      recentJobsList.innerHTML = `
        <div class="jt-empty-state">
          <p>${currentFilter ? `No applications currently marked as "${currentFilter}".` : 'No jobs tracked yet. Open any LinkedIn job posting to save it directly!'}</p>
        </div>
      `;
      return;
    }

    recentJobsList.innerHTML = displayJobs.slice(0, 10).map(job => {
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

  // Setup Funnel Step Filter Click
  funnelSteps.forEach(step => {
    step.addEventListener('click', () => {
      const filter = step.getAttribute('data-filter');
      if (currentFilter === filter) {
        // Toggle off
        clearFilter();
      } else {
        currentFilter = filter;
        funnelSteps.forEach(s => s.classList.remove('step-active'));
        step.classList.add('step-active');

        if (activeFilterBadge && activeFilterName) {
          activeFilterBadge.style.display = 'inline-flex';
          activeFilterName.textContent = filter;
        }
        renderRecentJobs();
      }
    });
  });

  function clearFilter() {
    currentFilter = null;
    funnelSteps.forEach(s => s.classList.remove('step-active'));
    if (activeFilterBadge) {
      activeFilterBadge.style.display = 'none';
    }
    renderRecentJobs();
  }

  if (btnClearFilter) {
    btnClearFilter.addEventListener('click', (e) => {
      e.stopPropagation();
      clearFilter();
    });
  }

  /**
   * Loads full status from extension background service worker.
   */
  async function refreshStatus() {
    chrome.runtime.sendMessage({ action: 'GET_STATUS' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        setStatusMessage('Background service worker starting...', true);
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

      // Funnel & Activity
      allJobsList = recentJobs || [];
      activityCountText.textContent = `${savedCount || 0} saved`;
      updatePipelineFunnel(allJobsList);
      renderRecentJobs();

      if (isConnected) {
        setStatusMessage(`Ready. Connected to "${settings.sheetTitle || 'Job Tracker LN'}". (Alt+S to save)`);
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

  if (btnQuickSetup) btnQuickSetup.addEventListener('click', () => handleCreateSheet(btnQuickSetup));
  if (btnCreateSheet) btnCreateSheet.addEventListener('click', () => handleCreateSheet(btnCreateSheet));

  /**
   * Connects an existing Google Sheet by URL or ID.
   */
  if (btnConnectExisting) {
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
  }

  /**
   * Refreshes local dedup cache from connected sheet.
   */
  if (btnSyncCache) {
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
  }

  /**
   * Disconnects active sheet and clears session.
   */
  if (btnDisconnect) {
    btnDisconnect.addEventListener('click', () => {
      const confirmed = confirm('Disconnect Google Sheet and clear local tracker cache? Your Google Sheet itself will NOT be deleted.');
      if (!confirmed) return;

      chrome.runtime.sendMessage({ action: 'DISCONNECT' }, () => {
        setStatusMessage('Disconnected Google Sheet.');
        refreshStatus();
        switchTab('home');
      });
    });
  }

  // Initial load
  refreshStatus();
});
