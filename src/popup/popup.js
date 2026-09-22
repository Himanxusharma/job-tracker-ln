/**
 * Job Tracker LN - Popup Controller
 * Manages tab switching, Google Sheet connection wizards,
 * pipeline funnel analytics, instant search, and CSV exports.
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

  // DOM Elements - Search & Export
  const inputJobSearch = document.getElementById('input-job-search');
  const btnClearSearch = document.getElementById('btn-clear-search');
  const btnExportCsv = document.getElementById('btn-export-csv');
  const btnExportCsvSettings = document.getElementById('btn-export-csv-settings');

  // DOM Elements - Actions
  const btnQuickSetup = document.getElementById('btn-quick-setup');
  const btnCreateSheet = document.getElementById('btn-create-sheet');
  const inputExistingSheet = document.getElementById('input-existing-sheet');
  const btnConnectExisting = document.getElementById('btn-connect-existing');
  const btnSyncCache = document.getElementById('btn-sync-cache');
  const btnSyncHeader = document.getElementById('btn-sync-header');
  const btnSyncActivity = document.getElementById('btn-sync-activity');
  const sheetLastSyncTime = document.getElementById('sheet-last-sync-time');
  const btnDisconnect = document.getElementById('btn-disconnect');

  let allJobsList = [];
  let currentFilter = null;
  let searchQuery = '';

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
   * Formats ISO timestamp into friendly relative time.
   */
  function formatRelativeTime(dateStr) {
    if (!dateStr) return '';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      const diffSec = Math.floor((Date.now() - d.getTime()) / 1000);

      if (diffSec < 60) return 'Just now';
      if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
      if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
      if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
      return `${Math.floor(diffSec / 604800)}w ago`;
    } catch (e) {
      return '';
    }
  }

  /**
   * Checks if an applied job is older than 7 days without update.
   */
  function isFollowupDue(job) {
    if ((job.status || '').toLowerCase() !== 'applied') return false;
    if (!job.dateSaved) return false;
    try {
      const d = new Date(job.dateSaved);
      if (isNaN(d.getTime())) return false;
      const days = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
      return days >= 7;
    } catch (e) {
      return false;
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
   * Filters and renders recent jobs matching stage and search query.
   */
  function renderRecentJobs() {
    let displayJobs = allJobsList;

    // Filter by stage
    if (currentFilter) {
      displayJobs = displayJobs.filter(j => (j.status || 'Saved').toLowerCase() === currentFilter.toLowerCase());
    }

    // Filter by search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      displayJobs = displayJobs.filter(j =>
        (j.role || '').toLowerCase().includes(q) ||
        (j.company || '').toLowerCase().includes(q) ||
        (j.location || '').toLowerCase().includes(q) ||
        (j.notes || '').toLowerCase().includes(q)
      );
    }

    if (!displayJobs || displayJobs.length === 0) {
      let emptyMsg = 'No jobs tracked yet. Open any LinkedIn job posting to save it directly!';
      if (searchQuery) {
        emptyMsg = `No jobs matching "${searchQuery}".`;
      } else if (currentFilter) {
        emptyMsg = `No applications currently marked as "${currentFilter}".`;
      }

      recentJobsList.innerHTML = `
        <div class="jt-empty-state">
          <p>${emptyMsg}</p>
        </div>
      `;
      return;
    }

    recentJobsList.innerHTML = displayJobs.slice(0, 15).map(job => {
      const statusClass = `tag-${(job.status || 'saved').toLowerCase()}`;
      const relativeTime = formatRelativeTime(job.dateSaved);
      const followupBadge = isFollowupDue(job)
        ? `<span class="jt-badge-followup" title="Applied over 7 days ago. Consider reaching out!">Follow-up?</span>`
        : '';

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
          <div class="jt-job-item-tags">
            <span class="jt-status-tag ${statusClass}">${escapeHtml(job.status || 'Saved')}</span>
            ${followupBadge}
            ${relativeTime ? `<span class="jt-job-date">${relativeTime}</span>` : ''}
          </div>
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

  // Setup Instant Search Input
  if (inputJobSearch) {
    inputJobSearch.addEventListener('input', () => {
      searchQuery = inputJobSearch.value.trim();
      if (btnClearSearch) {
        btnClearSearch.style.display = searchQuery ? 'block' : 'none';
      }
      renderRecentJobs();
    });
  }

  if (btnClearSearch) {
    btnClearSearch.addEventListener('click', () => {
      inputJobSearch.value = '';
      searchQuery = '';
      btnClearSearch.style.display = 'none';
      renderRecentJobs();
      inputJobSearch.focus();
    });
  }

  // Setup Funnel Step Filter Click
  funnelSteps.forEach(step => {
    step.addEventListener('click', () => {
      const filter = step.getAttribute('data-filter');
      if (currentFilter === filter) {
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
   * Exports all saved jobs to a clean CSV file.
   */
  function exportJobsToCsv() {
    if (!allJobsList || allJobsList.length === 0) {
      alert('No jobs to export. Save a LinkedIn job first!');
      return;
    }

    const headers = ['Date Saved', 'Role', 'Company', 'Location', 'Job Link', 'Status', 'Notes'];
    const csvRows = [headers.join(',')];

    allJobsList.forEach(job => {
      const row = [
        `"${(job.dateSaved || '').replace(/"/g, '""')}"`,
        `"${(job.role || '').replace(/"/g, '""')}"`,
        `"${(job.company || '').replace(/"/g, '""')}"`,
        `"${(job.location || '').replace(/"/g, '""')}"`,
        `"${(job.jobLink || '').replace(/"/g, '""')}"`,
        `"${(job.status || 'Saved').replace(/"/g, '""')}"`,
        `"${(job.notes || '').replace(/"/g, '""')}"`
      ];
      csvRows.push(row.join(','));
    });

    const blob = new Blob([csvRows.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `job-tracker-ln-export-${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setStatusMessage(`Exported ${allJobsList.length} jobs to CSV.`);
  }

  if (btnExportCsv) btnExportCsv.addEventListener('click', exportJobsToCsv);
  if (btnExportCsvSettings) btnExportCsvSettings.addEventListener('click', exportJobsToCsv);

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

        if (sheetLastSyncTime) {
          if (settings.lastSync) {
            sheetLastSyncTime.textContent = `Last synced: ${formatRelativeTime(settings.lastSync) || 'Just now'}`;
          } else {
            sheetLastSyncTime.textContent = 'Ready to sync';
          }
        }
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

      if (chrome.runtime.lastError) {
        const errorText = chrome.runtime.lastError.message || 'Could not connect to background service.';
        setStatusMessage(errorText, true);
        alert(errorText);
        return;
      }

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

        if (chrome.runtime.lastError) {
          const errorText = chrome.runtime.lastError.message || 'Could not connect to background service.';
          setStatusMessage(errorText, true);
          alert(errorText);
          return;
        }

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
   * Refreshes local dedup cache and data from connected Google Sheet.
   * Handles modifications, new statuses, and purged/deleted rows.
   */
  let isSyncing = false;
  function triggerSync() {
    if (isSyncing) return;
    isSyncing = true;

    const allSyncButtons = [
      btnSyncHeader,
      btnSyncActivity,
      btnSyncCache
    ].filter(Boolean);

    allSyncButtons.forEach(btn => {
      btn.classList.add('is-syncing');
      btn.disabled = true;
    });

    setStatusMessage('Syncing with Google Sheet (updating changes & deletions)...');

    chrome.runtime.sendMessage({ action: 'SYNC_SHEET' }, (res) => {
      isSyncing = false;
      allSyncButtons.forEach(btn => {
        btn.classList.remove('is-syncing');
        btn.disabled = false;
      });

      if (chrome.runtime.lastError) {
        setStatusMessage(chrome.runtime.lastError.message || 'Sync failed.', true);
        return;
      }

      if (res && res.success) {
        const count = res.count || 0;
        setStatusMessage(`✓ Synced with Sheet! ${count} active job${count === 1 ? '' : 's'} indexed.`);
        refreshStatus();
      } else {
        setStatusMessage(res?.error || 'Sync failed. Check your Sheet connection.', true);
      }
    });
  }

  if (btnSyncHeader) btnSyncHeader.addEventListener('click', triggerSync);
  if (btnSyncActivity) btnSyncActivity.addEventListener('click', triggerSync);
  if (btnSyncCache) btnSyncCache.addEventListener('click', triggerSync);

  /**
   * Disconnects active sheet and clears session.
   */
  if (btnDisconnect) {
    btnDisconnect.addEventListener('click', () => {
      const confirmed = confirm('Disconnect Google Sheet and clear local tracker cache? Your Google Sheet itself will NOT be deleted.');
      if (!confirmed) return;

      chrome.runtime.sendMessage({ action: 'DISCONNECT' }, () => {
        if (chrome.runtime.lastError) {
          setStatusMessage(chrome.runtime.lastError.message, true);
          return;
        }
        setStatusMessage('Disconnected Google Sheet.');
        refreshStatus();
        switchTab('home');
      });
    });
  }

  // Initial load
  refreshStatus();
});
