/**
 * Job Tracker LN - Content Script
 * Injects floating "Save Job" button and interactive toast notification system.
 */

(function () {
  'use strict';

  let currentFloatingBtn = null;
  let toastContainer = null;
  let lastCheckedUrl = '';
  let activeUndoTimer = null;

  // SVG Icons (Lucide-style vectors for crisp rendering)
  const ICONS = {
    bookmark: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>
      </svg>
    `,
    check: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 6 9 17l-5-5"/>
      </svg>
    `,
    spinner: `
      <svg class="jt-ln-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
      </svg>
    `,
    alertCircle: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    `,
    x: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M18 6 6 18M6 6l12 12"/>
      </svg>
    `
  };

  /**
   * Initializes or gets the toast notification container.
   */
  function getOrCreateToastContainer() {
    if (!toastContainer || !document.body.contains(toastContainer)) {
      toastContainer = document.createElement('div');
      toastContainer.id = 'jt-ln-toast-container';
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  /**
   * Shows a modern floating toast notification.
   */
  function showToast({ title, message, variant = 'success', canUndo = false, onUndo = null, duration = 5000 }) {
    const container = getOrCreateToastContainer();
    const toast = document.createElement('div');
    toast.className = `jt-ln-toast jt-ln-toast-${variant}`;

    let iconSvg = ICONS.check;
    if (variant === 'warning') iconSvg = ICONS.alertCircle;
    if (variant === 'danger') iconSvg = ICONS.alertCircle;

    const undoButtonHtml = canUndo ? `<button type="button" class="jt-ln-btn-undo">Undo</button>` : '';

    toast.innerHTML = `
      <div class="jt-ln-toast-body">
        <div class="jt-ln-toast-icon">${iconSvg}</div>
        <div class="jt-ln-toast-content">
          <div class="jt-ln-toast-title">${title}</div>
          <div class="jt-ln-toast-desc">${message || ''}</div>
        </div>
        <div class="jt-ln-toast-actions">
          ${undoButtonHtml}
          <button type="button" class="jt-ln-btn-close" aria-label="Close">${ICONS.x}</button>
        </div>
      </div>
      ${canUndo ? '<div class="jt-ln-toast-progress-track"><div class="jt-ln-toast-progress-bar"></div></div>' : ''}
    `;

    container.appendChild(toast);

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      toast.classList.add('jt-ln-toast-out');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    };

    const closeBtn = toast.querySelector('.jt-ln-btn-close');
    if (closeBtn) closeBtn.addEventListener('click', dismiss);

    if (canUndo && onUndo) {
      const undoBtn = toast.querySelector('.jt-ln-btn-undo');
      if (undoBtn) {
        undoBtn.addEventListener('click', async () => {
          undoBtn.disabled = true;
          undoBtn.textContent = 'Undoing...';
          dismiss();
          await onUndo();
        });
      }
    }

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }
  }

  /**
   * Injects or updates the floating "Save Job" button.
   */
  async function renderFloatingButton() {
    const isDetail = window.JobTrackerParser.isJobDetailView();

    if (!isDetail) {
      if (currentFloatingBtn && currentFloatingBtn.parentNode) {
        currentFloatingBtn.parentNode.removeChild(currentFloatingBtn);
        currentFloatingBtn = null;
      }
      return;
    }

    const currentUrl = window.JobTrackerParser.normalizeJobUrl(window.location.href);

    if (!currentFloatingBtn || !document.body.contains(currentFloatingBtn)) {
      currentFloatingBtn = document.createElement('button');
      currentFloatingBtn.id = 'jt-ln-floating-btn';
      currentFloatingBtn.type = 'button';
      currentFloatingBtn.innerHTML = `${ICONS.bookmark}<span>Save Job</span>`;
      currentFloatingBtn.addEventListener('click', handleSaveClick);
      document.body.appendChild(currentFloatingBtn);
    }

    // Check if the current job is already saved
    if (currentUrl && currentUrl !== lastCheckedUrl) {
      lastCheckedUrl = currentUrl;
      try {
        chrome.runtime.sendMessage(
          { action: 'CHECK_JOB_STATUS', jobLink: currentUrl },
          (response) => {
            if (response && response.isSaved) {
              setButtonState('saved', response.status || 'Saved');
            } else {
              setButtonState('idle');
            }
          }
        );
      } catch (err) {
        // Extension context invalidated / reloading
      }
    }
  }

  /**
   * Updates button visual state.
   */
  function setButtonState(state, statusText = '') {
    if (!currentFloatingBtn) return;

    currentFloatingBtn.classList.remove('jt-ln-btn-loading', 'jt-ln-btn-saved');

    if (state === 'loading') {
      currentFloatingBtn.classList.add('jt-ln-btn-loading');
      currentFloatingBtn.innerHTML = `${ICONS.spinner}<span>Saving...</span>`;
    } else if (state === 'saved') {
      currentFloatingBtn.classList.add('jt-ln-btn-saved');
      currentFloatingBtn.innerHTML = `${ICONS.check}<span>Saved (${statusText || 'In Sheet'})</span>`;
    } else {
      currentFloatingBtn.innerHTML = `${ICONS.bookmark}<span>Save Job</span>`;
    }
  }

  /**
   * Handles Save Job button click.
   */
  async function handleSaveClick() {
    if (!window.JobTrackerParser) return;

    setButtonState('loading');
    const jobData = window.JobTrackerParser.parseCurrentJob();

    try {
      chrome.runtime.sendMessage(
        { action: 'SAVE_JOB', jobData },
        (response) => {
          if (chrome.runtime.lastError) {
            setButtonState('idle');
            showToast({
              title: 'Connection Error',
              message: 'Could not connect to extension background service.',
              variant: 'danger'
            });
            return;
          }

          if (!response) {
            setButtonState('idle');
            showToast({
              title: 'Save Failed',
              message: 'No response received. Please try again.',
              variant: 'danger'
            });
            return;
          }

          if (response.unconfigured) {
            setButtonState('idle');
            showToast({
              title: 'Setup Required',
              message: 'Please click the Job Tracker LN extension icon to connect your Google Sheet.',
              variant: 'warning'
            });
            return;
          }

          if (response.duplicate) {
            const existingStatus = response.existingJob?.status || 'Saved';
            setButtonState('saved', existingStatus);
            showToast({
              title: 'Job Already Saved',
              message: `${jobData.role || 'Job'} at ${jobData.company || 'Company'} is already tracked (Status: ${existingStatus}).`,
              variant: 'warning',
              duration: 4000
            });
            return;
          }

          if (response.success) {
            setButtonState('saved', 'Saved');
            const savedLink = jobData.jobLink;
            const rowIndex = response.rowIndex;

            showToast({
              title: 'Job Saved to Google Sheet',
              message: `${jobData.role || 'Role'} • ${jobData.company || 'Company'}`,
              variant: 'success',
              canUndo: true,
              duration: 5000,
              onUndo: async () => {
                chrome.runtime.sendMessage(
                  { action: 'UNDO_SAVE', jobLink: savedLink, rowIndex },
                  (undoRes) => {
                    if (undoRes && undoRes.success) {
                      setButtonState('idle');
                      showToast({
                        title: 'Save Undone',
                        message: 'Removed from Google Sheet and tracker cache.',
                        variant: 'warning',
                        duration: 3000
                      });
                    } else {
                      showToast({
                        title: 'Undo Failed',
                        message: undoRes?.error || 'Could not remove row from sheet.',
                        variant: 'danger'
                      });
                    }
                  }
                );
              }
            });
            return;
          }

          // Error case
          setButtonState('idle');
          showToast({
            title: "Couldn't Save Job",
            message: response.error || 'An error occurred while writing to Google Sheets.',
            variant: 'danger'
          });
        }
      );
    } catch (err) {
      setButtonState('idle');
      showToast({
        title: 'Error',
        message: err.message || 'Unexpected error occurred.',
        variant: 'danger'
      });
    }
  }

  // Observe SPA navigation and DOM changes on LinkedIn
  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      requestAnimationFrame(renderFloatingButton);
    }, 150);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Initial check on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderFloatingButton);
  } else {
    renderFloatingButton();
  }

  // Also listen for URL popstate / pushState changes
  window.addEventListener('popstate', () => {
    setTimeout(renderFloatingButton, 200);
  });
})();
