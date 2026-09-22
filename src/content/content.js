/**
 * Job Tracker LN - Content Script
 * Injects floating "Save Job" button, search list badges,
 * draggable controls, interactive status/notes editor, and toast notifications.
 */

(function () {
  'use strict';

  let currentFloatingBtn = null;
  let currentPopover = null;
  let toastContainer = null;
  let lastCheckedUrl = '';
  let cachedSavedUrls = {};
  let isDragging = false;
  let dragStartY = 0;
  let initialBtnBottom = 24;
  let hasMoved = false;

  const STATUS_OPTIONS = [
    'Saved',
    'Applied',
    'Interview',
    'Offer',
    'Accepted',
    'Rejected',
    'Archived'
  ];

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
    `,
    edit: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
      </svg>
    `,
    dragHandle: `
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/>
        <circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>
      </svg>
    `
  };

  /**
   * Spawns a celebratory canvas particle burst.
   */
  function triggerParticleBurst(originX, originY) {
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '2147483647';
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);

    const ctx = canvas.getContext('2d');
    const colors = ['#10B981', '#38BDF8', '#F59E0B', '#34D399', '#60A5FA'];
    const particles = [];
    const count = 28;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
      const speed = 3.5 + Math.random() * 4.5;
      particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        size: 3 + Math.random() * 3,
        color: colors[Math.floor(Math.random() * colors.length)],
        alpha: 1,
        decay: 0.022 + Math.random() * 0.02
      });
    }

    const startTime = performance.now();
    function animate(now) {
      const elapsed = now - startTime;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      let alive = false;
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.14; // subtle gravity
        p.alpha -= p.decay;
        if (p.alpha > 0) {
          alive = true;
          ctx.globalAlpha = Math.max(0, p.alpha);
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      if (alive && elapsed < 850) {
        requestAnimationFrame(animate);
      } else {
        if (canvas.parentNode) canvas.parentNode.removeChild(canvas);
      }
    }

    requestAnimationFrame(animate);
  }

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
  function showToast({ title, message, variant = 'success', canUndo = false, onUndo = null, onEdit = null, duration = 5000 }) {
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
   * Closes any open notes/status popover.
   */
  function closePopover() {
    if (currentPopover && currentPopover.parentNode) {
      currentPopover.parentNode.removeChild(currentPopover);
      currentPopover = null;
    }
  }

  /**
   * Opens the Quick Notes & Inline Status editor popover.
   */
  function openNotesPopover(jobLink, currentStatus = 'Saved', currentNotes = '', rowIndex = null) {
    closePopover();
    if (!currentFloatingBtn) return;

    const popover = document.createElement('div');
    popover.id = 'jt-ln-popover';

    const rect = currentFloatingBtn.getBoundingClientRect();
    const bottomOffset = window.innerHeight - rect.top + 8;
    popover.style.bottom = `${bottomOffset}px`;
    popover.style.right = '24px';

    const optionsHtml = STATUS_OPTIONS.map(opt => `
      <option value="${opt}" ${opt === currentStatus ? 'selected' : ''}>${opt}</option>
    `).join('');

    popover.innerHTML = `
      <div class="jt-ln-popover-header">
        <span class="jt-ln-popover-title">Update Application Status</span>
        <button type="button" class="jt-ln-popover-close" aria-label="Close">${ICONS.x}</button>
      </div>
      <div class="jt-ln-popover-group">
        <label class="jt-ln-popover-label">Status Stage</label>
        <select class="jt-ln-popover-select" id="jt-popover-status">
          ${optionsHtml}
        </select>
      </div>
      <div class="jt-ln-popover-group">
        <label class="jt-ln-popover-label">Notes (Referral, salary, contact, etc.)</label>
        <textarea class="jt-ln-popover-textarea" id="jt-popover-notes" placeholder="e.g. Referred by Sarah, round 1 next week...">${currentNotes || ''}</textarea>
      </div>
      <div class="jt-ln-popover-actions">
        <button type="button" class="jt-ln-popover-btn-cancel">Cancel</button>
        <button type="button" class="jt-ln-popover-btn-save">Save Changes</button>
      </div>
    `;

    document.body.appendChild(popover);
    currentPopover = popover;

    popover.querySelector('.jt-ln-popover-close').addEventListener('click', closePopover);
    popover.querySelector('.jt-ln-popover-btn-cancel').addEventListener('click', closePopover);

    const saveBtn = popover.querySelector('.jt-ln-popover-btn-save');
    saveBtn.addEventListener('click', () => {
      const newStatus = popover.querySelector('#jt-popover-status').value;
      const newNotes = popover.querySelector('#jt-popover-notes').value.trim();

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      chrome.runtime.sendMessage({
        action: 'UPDATE_JOB_DETAILS',
        jobLink,
        status: newStatus,
        notes: newNotes,
        rowIndex
      }, (res) => {
        closePopover();
        if (res && res.success) {
          setButtonState('saved', newStatus, newNotes, rowIndex);
          showToast({
            title: 'Job Updated',
            message: `Status marked as "${newStatus}". Synced to Google Sheet.`,
            variant: 'success',
            duration: 3500
          });
          syncSavedUrlsCache();
        } else {
          showToast({
            title: 'Update Failed',
            message: res?.error || 'Could not update Google Sheet row.',
            variant: 'danger'
          });
        }
      });
    });
  }

  /**
   * Configures drag-and-drop movement for the floating button.
   */
  function setupDraggable(btn) {
    btn.classList.add('jt-ln-draggable');

    // Retrieve saved vertical position
    chrome.storage?.local?.get('jt_btn_bottom', (data) => {
      if (data && data.jt_btn_bottom !== undefined) {
        btn.style.bottom = `${data.jt_btn_bottom}px`;
      }
    });

    const onMouseDown = (e) => {
      // Ignore click if clicking the edit note button
      if (e.target.closest('.jt-ln-btn-edit-note')) return;

      isDragging = true;
      hasMoved = false;
      dragStartY = e.clientY;
      const computedBottom = parseInt(window.getComputedStyle(btn).bottom, 10);
      initialBtnBottom = isNaN(computedBottom) ? 24 : computedBottom;

      btn.classList.add('jt-ln-dragging');
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaY = dragStartY - e.clientY;

      if (Math.abs(deltaY) > 5) {
        hasMoved = true;
      }

      if (hasMoved) {
        let newBottom = initialBtnBottom + deltaY;
        const maxBottom = window.innerHeight - 80;
        const minBottom = 20;

        if (newBottom < minBottom) newBottom = minBottom;
        if (newBottom > maxBottom) newBottom = maxBottom;

        btn.style.bottom = `${newBottom}px`;
      }
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      btn.classList.remove('jt-ln-dragging');
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);

      if (hasMoved) {
        const finalBottom = parseInt(btn.style.bottom, 10);
        chrome.storage?.local?.set({ jt_btn_bottom: finalBottom });
      }
    };

    btn.addEventListener('mousedown', onMouseDown);
  }

  /**
   * Injects or updates the floating "Save Job" button.
   */
  async function renderFloatingButton() {
    const isDetail = window.JobTrackerParser?.isJobDetailView();

    if (!isDetail) {
      if (currentFloatingBtn && currentFloatingBtn.parentNode) {
        currentFloatingBtn.parentNode.removeChild(currentFloatingBtn);
        currentFloatingBtn = null;
      }
      closePopover();
      return;
    }

    const currentUrl = window.JobTrackerParser.normalizeJobUrl(window.location.href);

    if (!currentFloatingBtn || !document.body.contains(currentFloatingBtn)) {
      currentFloatingBtn = document.createElement('button');
      currentFloatingBtn.id = 'jt-ln-floating-btn';
      currentFloatingBtn.type = 'button';
      currentFloatingBtn.innerHTML = `
        <span class="jt-ln-drag-handle" title="Drag to reposition">${ICONS.dragHandle}</span>
        ${ICONS.bookmark}<span>Save Job</span>
      `;

      currentFloatingBtn.addEventListener('click', (e) => {
        // Prevent click trigger if button was dragged
        if (hasMoved) {
          hasMoved = false;
          return;
        }
        handleSaveClick();
      });

      setupDraggable(currentFloatingBtn);
      document.body.appendChild(currentFloatingBtn);
    }

    // Check if the current job is already saved
    if (currentUrl && currentUrl !== lastCheckedUrl) {
      lastCheckedUrl = currentUrl;
      try {
        chrome.runtime.sendMessage(
          { action: 'CHECK_JOB_STATUS', jobLink: currentUrl },
          (response) => {
            if (chrome.runtime.lastError) return;
            if (response && response.isSaved) {
              setButtonState(
                'saved',
                response.status || 'Saved',
                response.savedJob?.notes || '',
                response.savedJob?.rowIndex
              );
            } else {
              setButtonState('idle');
            }
          }
        );
      } catch (err) {
        // Extension context invalidated / tab orphaned
      }
    }
  }

  /**
   * Updates button visual state.
   */
  function setButtonState(state, statusText = '', notes = '', rowIndex = null) {
    if (!currentFloatingBtn) return;

    currentFloatingBtn.classList.remove('jt-ln-btn-loading', 'jt-ln-btn-saved');

    if (state === 'loading') {
      currentFloatingBtn.classList.add('jt-ln-btn-loading');
      currentFloatingBtn.innerHTML = `
        <span class="jt-ln-drag-handle">${ICONS.dragHandle}</span>
        ${ICONS.spinner}<span>Saving...</span>
      `;
    } else if (state === 'saved') {
      currentFloatingBtn.classList.add('jt-ln-btn-saved');
      currentFloatingBtn.innerHTML = `
        <span class="jt-ln-drag-handle" title="Drag to reposition">${ICONS.dragHandle}</span>
        ${ICONS.check}<span>Saved (${statusText || 'In Sheet'})</span>
        <span class="jt-ln-btn-edit-note" title="Update status or add note">${ICONS.edit}</span>
      `;

      const editBtn = currentFloatingBtn.querySelector('.jt-ln-btn-edit-note');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const currentUrl = window.JobTrackerParser.normalizeJobUrl(window.location.href);
          openNotesPopover(currentUrl, statusText, notes, rowIndex);
        });
      }
    } else {
      currentFloatingBtn.innerHTML = `
        <span class="jt-ln-drag-handle" title="Drag to reposition">${ICONS.dragHandle}</span>
        ${ICONS.bookmark}<span>Save Job</span>
      `;
    }
  }

  /**
   * Handles Save Job trigger.
   */
  async function handleSaveClick() {
    if (!window.JobTrackerParser) return;

    // If already saved, clicking opens status/notes editor
    if (currentFloatingBtn && currentFloatingBtn.classList.contains('jt-ln-btn-saved')) {
      const currentUrl = window.JobTrackerParser.normalizeJobUrl(window.location.href);
      chrome.runtime.sendMessage({ action: 'CHECK_JOB_STATUS', jobLink: currentUrl }, (res) => {
        if (res && res.savedJob) {
          openNotesPopover(currentUrl, res.status || 'Saved', res.savedJob.notes || '', res.savedJob.rowIndex);
        }
      });
      return;
    }

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
            setButtonState('saved', existingStatus, response.existingJob?.notes, response.existingJob?.rowIndex);
            showToast({
              title: 'Job Already Saved',
              message: `${jobData.role || 'Job'} at ${jobData.company || 'Company'} is tracked (Status: ${existingStatus}).`,
              variant: 'warning',
              duration: 4000
            });
            syncSavedUrlsCache();
            return;
          }

          if (response.success) {
            setButtonState('saved', 'Saved', '', response.rowIndex);
            const savedLink = jobData.jobLink;
            const rowIndex = response.rowIndex;

            if (currentFloatingBtn) {
              const rect = currentFloatingBtn.getBoundingClientRect();
              triggerParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
            }

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
                      syncSavedUrlsCache();
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

            syncSavedUrlsCache();
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
      const isContextInvalidated = err.message && err.message.toLowerCase().includes('context invalidated');
      showToast({
        title: isContextInvalidated ? 'Extension Reloaded' : 'Error',
        message: isContextInvalidated
          ? 'The extension was updated. Please refresh this tab to continue.'
          : (err.message || 'Unexpected error occurred.'),
        variant: isContextInvalidated ? 'warning' : 'danger'
      });
    }
  }

  /**
   * Syncs the local URL index and badges search results list.
   */
  function syncSavedUrlsCache() {
    try {
      chrome.runtime.sendMessage({ action: 'GET_SAVED_URLS' }, (res) => {
        if (chrome.runtime.lastError) return;
        if (res && res.savedJobs) {
          cachedSavedUrls = res.savedJobs;
          renderSearchListBadges();
        }
      });
    } catch (e) {
      // Inactive context
    }
  }

  /**
   * Injects "Saved" badges on LinkedIn search list cards.
   */
  function renderSearchListBadges() {
    const listItems = document.querySelectorAll(
      '.jobs-search-results-list__list-item, .jobs-search-results__list-item, li[data-occludable-job-id]'
    );

    listItems.forEach(item => {
      if (item.querySelector('.jt-ln-list-badge')) return;

      const linkEl = item.querySelector('a[href*="/jobs/view/"]') || item.querySelector('a[data-control-name="job_card_title"]');
      let jobId = item.getAttribute('data-occludable-job-id');

      if (!jobId && linkEl && linkEl.href) {
        const m = linkEl.href.match(/\/jobs\/view\/(\d+)/i);
        if (m) jobId = m[1];
      }

      if (!jobId) return;

      const canonicalUrl = `https://www.linkedin.com/jobs/view/${jobId}/`;
      const savedInfo = cachedSavedUrls[canonicalUrl];

      if (savedInfo) {
        const badge = document.createElement('span');
        badge.className = 'jt-ln-list-badge';
        badge.innerHTML = `${ICONS.check} Saved (${savedInfo.status || 'Saved'})`;

        const targetContainer = item.querySelector('.artdeco-entity-lockup__subtitle, .job-card-container__primary-description, .base-search-card__subtitle') || item;
        targetContainer.appendChild(badge);
      }
    });
  }

  // Keyboard Shortcut Listener: Alt+S or Option+S
  window.addEventListener('keydown', (e) => {
    if (e.altKey && (e.code === 'KeyS' || e.key === 's' || e.key === 'S')) {
      e.preventDefault();
      handleSaveClick();
    }
  });

  // Background Command Listener (from chrome.commands)
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'TRIGGER_SAVE_SHORTCUT') {
      handleSaveClick();
    }
  });

  /**
   * Automatically detects LinkedIn "Easy Apply" successful submissions.
   */
  let lastSubmissionDetectedTime = 0;
  function checkEasyApplySubmission() {
    const now = Date.now();
    if (now - lastSubmissionDetectedTime < 4000) return; // Debounce

    const modal = document.querySelector('.artdeco-modal, .jobs-easy-apply-modal, [data-test-modal]');
    if (!modal) return;

    const text = (modal.innerText || modal.textContent || '').toLowerCase();
    if (text.includes('application was sent') || text.includes('application submitted') || text.includes('your application has been submitted')) {
      lastSubmissionDetectedTime = now;
      const currentUrl = window.JobTrackerParser?.normalizeJobUrl(window.location.href);
      if (!currentUrl) return;

      chrome.runtime.sendMessage({ action: 'CHECK_JOB_STATUS', jobLink: currentUrl }, (res) => {
        if (res && res.isSaved && res.status !== 'Applied' && res.status !== 'Interview' && res.status !== 'Offer' && res.status !== 'Accepted') {
          chrome.runtime.sendMessage({
            action: 'UPDATE_JOB_DETAILS',
            jobLink: currentUrl,
            status: 'Applied',
            notes: res.savedJob?.notes || '',
            rowIndex: res.savedJob?.rowIndex
          }, (updateRes) => {
            if (updateRes && updateRes.success) {
              setButtonState('saved', 'Applied', res.savedJob?.notes, res.savedJob?.rowIndex);
              showToast({
                title: '🎉 Application Sent!',
                message: 'Job status automatically updated to "Applied" in your Google Sheet.',
                variant: 'success',
                duration: 4500
              });
              syncSavedUrlsCache();
            }
          });
        }
      });
    }
  }

  // Observe SPA navigation and DOM changes on LinkedIn
  let debounceTimer = null;
  const observer = new MutationObserver(() => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      requestAnimationFrame(() => {
        renderFloatingButton();
        renderSearchListBadges();
        checkEasyApplySubmission();
      });
    }, 150);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      renderFloatingButton();
      syncSavedUrlsCache();
    });
  } else {
    renderFloatingButton();
    syncSavedUrlsCache();
  }

  window.addEventListener('popstate', () => {
    setTimeout(() => {
      renderFloatingButton();
      syncSavedUrlsCache();
    }, 200);
  });
})();
