/**
 * Job Tracker LN - Content Script
 * Injects floating "Save Job" button, search list badges,
 * draggable controls, interactive status/notes editor, and toast notifications.
 */

(function () {
  'use strict';

  let currentFloatingBtn = null;
  let currentInlineBtn = null;
  let currentPopover = null;
  let toastContainer = null;
  let lastCheckedUrl = '';
  let cachedSavedUrls = {};
  let isDragging = false;
  let dragStartY = 0;
  let initialBtnBottom = 84;
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
  function showToast({ title, message, variant = 'success', canUndo = false, onUndo = null, canAddNote = false, onAddNote = null, duration = 5000 }) {
    const container = getOrCreateToastContainer();
    const toast = document.createElement('div');
    toast.className = `jt-ln-toast jt-ln-toast-${variant}`;

    let iconSvg = ICONS.check;
    if (variant === 'warning') iconSvg = ICONS.alertCircle;
    if (variant === 'danger') iconSvg = ICONS.alertCircle;

    const noteButtonHtml = (canAddNote && onAddNote)
      ? `<button type="button" class="jt-ln-btn-note" aria-label="Add Note">${ICONS.edit}<span>Note</span></button>`
      : '';
    const undoButtonHtml = canUndo ? `<button type="button" class="jt-ln-btn-undo">Undo</button>` : '';

    toast.innerHTML = `
      <div class="jt-ln-toast-body">
        <div class="jt-ln-toast-icon">${iconSvg}</div>
        <div class="jt-ln-toast-content">
          <div class="jt-ln-toast-title">${title}</div>
          <div class="jt-ln-toast-desc">${message || ''}</div>
        </div>
        <div class="jt-ln-toast-actions">
          ${noteButtonHtml}
          ${undoButtonHtml}
          <button type="button" class="jt-ln-btn-close" aria-label="Close">${ICONS.x}</button>
        </div>
      </div>
      ${canUndo ? '<div class="jt-ln-toast-progress-track"><div class="jt-ln-toast-progress-bar"></div></div>' : ''}
    `;

    container.appendChild(toast);

    let dismissed = false;
    let timerId = null;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      if (timerId) clearTimeout(timerId);
      toast.classList.add('jt-ln-toast-out');
      setTimeout(() => {
        if (toast.parentNode) toast.parentNode.removeChild(toast);
      }, 200);
    };

    const closeBtn = toast.querySelector('.jt-ln-btn-close');
    if (closeBtn) closeBtn.addEventListener('click', dismiss);

    if (canAddNote && onAddNote) {
      const noteBtn = toast.querySelector('.jt-ln-btn-note');
      if (noteBtn) {
        noteBtn.addEventListener('click', () => {
          dismiss();
          onAddNote();
        });
      }
    }

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
      timerId = setTimeout(dismiss, duration);
    }
  }

  let popoverRepositionHandler = null;

  /**
   * Closes any open notes/status popover.
   */
  function closePopover() {
    if (popoverRepositionHandler) {
      window.removeEventListener('scroll', popoverRepositionHandler, true);
      window.removeEventListener('resize', popoverRepositionHandler);
      popoverRepositionHandler = null;
    }
    if (currentPopover && currentPopover.parentNode) {
      currentPopover.parentNode.removeChild(currentPopover);
      currentPopover = null;
    }
  }

  /**
   * Opens the Quick Notes & Inline Status editor popover.
   * Supports both pre-save (saving for the first time with note) and post-save (updating existing row).
   */
  function openNotesPopover(jobLink, currentStatus = 'Saved', currentNotes = '', rowIndex = null, sourceBtn = null) {
    closePopover();
    const anchorBtn = sourceBtn || currentInlineBtn || currentFloatingBtn;
    if (!anchorBtn) return;

    const isNewSave = !rowIndex;
    const popoverTitle = isNewSave ? 'Save Job with Details' : 'Update Application Status';
    const saveBtnLabel = isNewSave ? 'Save to Sheet' : 'Save Changes';

    const popover = document.createElement('div');
    popover.id = 'jt-ln-popover';

    const positionPopover = () => {
      if (!anchorBtn || !anchorBtn.isConnected) return;
      const rect = anchorBtn.getBoundingClientRect();
      const popoverWidth = 320;
      const popoverHeight = 290;

      let top = rect.bottom + 8;
      let left = rect.left;

      // Flip above button if not enough space below
      if (top + popoverHeight > window.innerHeight - 16) {
        top = Math.max(16, rect.top - popoverHeight - 8);
      }

      // Horizontal screen boundary check
      if (left + popoverWidth > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - popoverWidth - 16);
      }
      if (left < 16) {
        left = 16;
      }

      popover.style.top = `${Math.round(top)}px`;
      popover.style.left = `${Math.round(left)}px`;
    };

    positionPopover();
    popoverRepositionHandler = positionPopover;
    window.addEventListener('scroll', popoverRepositionHandler, { passive: true, capture: true });
    window.addEventListener('resize', popoverRepositionHandler, { passive: true });

    const optionsHtml = STATUS_OPTIONS.map(opt => `
      <option value="${opt}" ${opt === currentStatus ? 'selected' : ''}>${opt}</option>
    `).join('');

    popover.innerHTML = `
      <div class="jt-ln-popover-header">
        <span class="jt-ln-popover-title">${popoverTitle}</span>
        <button type="button" class="jt-ln-popover-close" aria-label="Close">${ICONS.x}</button>
      </div>
      <div class="jt-ln-popover-group">
        <label class="jt-ln-popover-label">Status Stage</label>
        <select class="jt-ln-popover-select" id="jt-popover-status">
          ${optionsHtml}
        </select>
      </div>
      <div class="jt-ln-popover-group">
        <label class="jt-ln-popover-label">Notes (Referral, salary, contact, interview details...)</label>
        <textarea class="jt-ln-popover-textarea" id="jt-popover-notes" placeholder="e.g. Referred by Sarah, round 1 next week...">${currentNotes || ''}</textarea>
      </div>
      <div class="jt-ln-popover-actions">
        <button type="button" class="jt-ln-popover-btn-cancel">Cancel</button>
        <button type="button" class="jt-ln-popover-btn-save">${saveBtnLabel}</button>
      </div>
    `;

    document.body.appendChild(popover);
    currentPopover = popover;

    const textarea = popover.querySelector('#jt-popover-notes');
    setTimeout(() => {
      if (textarea) textarea.focus();
    }, 60);

    const saveBtn = popover.querySelector('.jt-ln-popover-btn-save');

    // Shortcut Cmd/Ctrl + Enter to save quickly
    textarea?.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        saveBtn.click();
      }
    });

    popover.querySelector('.jt-ln-popover-close').addEventListener('click', closePopover);
    popover.querySelector('.jt-ln-popover-btn-cancel').addEventListener('click', closePopover);

    saveBtn.addEventListener('click', () => {
      const newStatus = popover.querySelector('#jt-popover-status').value;
      const newNotes = popover.querySelector('#jt-popover-notes').value.trim();

      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      if (isNewSave) {
        // Pre-save flow: Save job directly with custom status & notes
        const jobData = window.JobTrackerParser.parseCurrentJob();
        jobData.status = newStatus;
        jobData.notes = newNotes;

        setButtonState('loading');
        chrome.runtime.sendMessage({ action: 'SAVE_JOB', jobData }, (response) => {
          closePopover();
          if (response && response.success) {
            setButtonState('saved', newStatus, newNotes, response.rowIndex);
            const savedLink = jobData.jobLink;
            const newRowIndex = response.rowIndex;

            const anchor = currentInlineBtn || currentFloatingBtn;
            if (anchor) {
              const r = anchor.getBoundingClientRect();
              triggerParticleBurst(r.left + r.width / 2, r.top + r.height / 2);
            }

            showToast({
              title: 'Job Saved to Google Sheet',
              message: `${jobData.role || 'Job'} • ${jobData.company || 'Company'} (${newStatus})`,
              variant: 'success',
              canUndo: true,
              canAddNote: true,
              onAddNote: () => {
                openNotesPopover(savedLink, newStatus, newNotes, newRowIndex, anchor);
              },
              duration: 5000,
              onUndo: async () => {
                chrome.runtime.sendMessage({ action: 'UNDO_SAVE', jobLink: savedLink, rowIndex: newRowIndex }, (undoRes) => {
                  if (undoRes && undoRes.success) {
                    setButtonState('idle');
                    showToast({
                      title: 'Save Undone',
                      message: 'Removed from Google Sheet and tracker cache.',
                      variant: 'warning',
                      duration: 3000
                    });
                    syncSavedUrlsCache();
                  }
                });
              }
            });

            syncSavedUrlsCache();
          } else {
            setButtonState('idle');
            showToast({
              title: 'Save Failed',
              message: response?.error || 'Could not save to Google Sheet.',
              variant: 'danger'
            });
          }
        });
      } else {
        // Post-save flow: Update existing Google Sheet row
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
      }
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
      initialBtnBottom = isNaN(computedBottom) ? 84 : computedBottom;

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
   * Locates the action buttons row inside the job details card.
   */
  /**
   * Locates the action buttons row inside the job details card.
   * Guarantees target is a direct peer sibling in the main flex container,
   * completely preventing overlap with LinkedIn's native Save or Apply buttons.
   */
  function getJobActionBar() {
    const detailRoot = document.querySelector(
      '.scaffold-layout__detail, .jobs-search__job-details, .jobs-details__main-content, .job-details-jobs-unified-top-card, .jobs-unified-top-card, main, [class*="job-details"]'
    ) || document;

    // 1. Direct row container selectors
    const rowSelectors = [
      '.job-details-jobs-unified-top-card__action-buttons',
      '.jobs-unified-top-card__action-buttons',
      '[class*="action-buttons"]',
      '.job-details-jobs-unified-top-card__container--two-pane .mt5',
      '.job-details-jobs-unified-top-card .mt5',
      '.top-card-layout__entity-actions'
    ];

    let rowContainer = null;
    for (const sel of rowSelectors) {
      const el = detailRoot.querySelector(sel);
      if (el && el.querySelector('button, [class*="button"]')) {
        rowContainer = el;
        break;
      }
    }

    // 2. Identify Save button and Apply button in detailRoot
    const allButtons = Array.from(detailRoot.querySelectorAll('button:not(#jt-ln-inline-btn), a[class*="apply"]'));
    let saveBtn = null;
    let applyBtn = null;

    for (const btn of allButtons) {
      const text = (btn.innerText || btn.textContent || '').trim().toLowerCase();
      const aria = (btn.getAttribute('aria-label') || '').toLowerCase();
      const cls = (btn.className || '').toLowerCase();

      if (!saveBtn && (text === 'save' || aria.includes('save') || cls.includes('save'))) {
        saveBtn = btn;
      }
      if (!applyBtn && (text.includes('apply') || aria.includes('apply') || cls.includes('apply'))) {
        applyBtn = btn;
      }
    }

    const anchorBtn = saveBtn || applyBtn;
    if (!anchorBtn && !rowContainer) return null;

    // 3. If rowContainer not found via selectors, climb up from anchorBtn
    // until we reach the multi-button parent row (avoiding single button wrappers!)
    if (!rowContainer && anchorBtn) {
      let curr = anchorBtn.parentElement;
      while (curr && curr !== detailRoot && curr !== document.body) {
        const isButtonWrapper = curr.matches('[class*="save-button"], [class*="apply-button"], .artdeco-button');
        const childBtns = curr.querySelectorAll('button:not(#jt-ln-inline-btn), a[class*="button"]');
        if (!isButtonWrapper && childBtns.length >= 2) {
          rowContainer = curr;
          break;
        }
        curr = curr.parentElement;
      }
    }

    if (!rowContainer && anchorBtn) {
      rowContainer = anchorBtn.closest('[class*="actions"]') || anchorBtn.parentElement?.parentElement || anchorBtn.parentElement;
    }

    if (!rowContainer) return null;

    // 4. Enforce flexbox layout on rowContainer so it never overlaps or breaks across screen widths
    try {
      rowContainer.style.setProperty('display', 'flex', 'important');
      rowContainer.style.setProperty('flex-wrap', 'wrap', 'important');
      rowContainer.style.setProperty('align-items', 'center', 'important');
      rowContainer.style.setProperty('gap', '8px', 'important');
    } catch (e) {
      // ignore
    }

    // 5. Find the direct child of rowContainer that wraps the Save button (or Apply button)
    let siblingWrapper = null;
    const targetAnchor = saveBtn || applyBtn;
    if (targetAnchor) {
      let p = targetAnchor;
      while (p && p.parentElement && p.parentElement !== rowContainer) {
        p = p.parentElement;
      }
      if (p && p.parentElement === rowContainer) {
        siblingWrapper = p;
      }
    }

    return {
      container: rowContainer,
      target: siblingWrapper || rowContainer.lastElementChild
    };
  }

  /**
   * Injects or updates the inline "Save Job" button next to Apply/Save.
   */
  function renderInlineButton() {
    const isDetail = window.JobTrackerParser?.isJobDetailView();
    const actionInfo = getJobActionBar();

    if (!isDetail || !actionInfo || !actionInfo.container) {
      if (currentInlineBtn && currentInlineBtn.parentNode) {
        currentInlineBtn.parentNode.removeChild(currentInlineBtn);
        currentInlineBtn = null;
      }
      return false;
    }

    if (!currentInlineBtn) {
      currentInlineBtn = document.createElement('button');
      currentInlineBtn.id = 'jt-ln-inline-btn';
      currentInlineBtn.type = 'button';
      currentInlineBtn.setAttribute('aria-label', 'Save job to Google Sheet');
      currentInlineBtn.innerHTML = `
        <span class="jt-ln-btn-main-action">${ICONS.bookmark}<span>Save Job</span></span>
        <span class="jt-ln-btn-pre-note" title="Save with custom note & status">${ICONS.edit}</span>
      `;

      currentInlineBtn.addEventListener('click', (e) => {
        // If clicking note icon, let note icon handler handle it
        if (e.target.closest('.jt-ln-btn-pre-note, .jt-ln-btn-edit-note')) return;
        e.stopPropagation();
        e.preventDefault();
        handleSaveClick();
      });

      const preNoteBtn = currentInlineBtn.querySelector('.jt-ln-btn-pre-note');
      if (preNoteBtn) {
        preNoteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          const currentUrl = window.JobTrackerParser.normalizeJobUrl(window.location.href);
          openNotesPopover(currentUrl, 'Saved', '', null, currentInlineBtn);
        });
      }
    }

    const target = actionInfo.target;
    // Insert directly as a sibling of the top-level button wrapper
    if (target && target.nextElementSibling !== currentInlineBtn) {
      target.insertAdjacentElement('afterend', currentInlineBtn);
    } else if (!actionInfo.container.contains(currentInlineBtn)) {
      actionInfo.container.appendChild(currentInlineBtn);
    }

    return true;
  }

  /**
   * Checks if current active job is already saved in sheet/cache.
   * @param {boolean} [force=false] Force check even if URL has not changed (e.g. on manual sheet sync)
   */
  function checkCurrentJobStatus(force = false) {
    const isDetail = window.JobTrackerParser?.isJobDetailView();
    if (!isDetail) return;

    const currentUrl = window.JobTrackerParser.normalizeJobUrl(window.location.href);
    if (!currentUrl) return;

    if (force || currentUrl !== lastCheckedUrl) {
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
   * Main button renderer: moves the button directly into the job card header next to Save/Apply!
   * Completely removes any floating button to prevent overriding or blocking screen content.
   */
  function renderAllButtons() {
    // Remove any leftover floating button
    const oldFloatingBtn = document.getElementById('jt-ln-floating-btn');
    if (oldFloatingBtn && oldFloatingBtn.parentNode) {
      oldFloatingBtn.parentNode.removeChild(oldFloatingBtn);
    }
    currentFloatingBtn = null;

    const isDetail = window.JobTrackerParser?.isJobDetailView();
    if (!isDetail) {
      if (currentInlineBtn && currentInlineBtn.parentNode) {
        currentInlineBtn.parentNode.removeChild(currentInlineBtn);
        currentInlineBtn = null;
      }
      closePopover();
      return;
    }

    renderInlineButton();
    checkCurrentJobStatus();
  }

  /**
   * Updates button visual state across both floating and inline buttons.
   */
  function setButtonState(state, statusText = '', notes = '', rowIndex = null) {
    const buttons = [currentFloatingBtn, currentInlineBtn].filter(Boolean);
    if (buttons.length === 0) return;

    buttons.forEach(btn => {
      btn.classList.remove('jt-ln-btn-loading', 'jt-ln-btn-saved');
      const isFloating = btn.id === 'jt-ln-floating-btn';
      const dragHandle = isFloating ? `<span class="jt-ln-drag-handle" title="Drag to reposition">${ICONS.dragHandle}</span>` : '';

      if (state === 'loading') {
        btn.classList.add('jt-ln-btn-loading');
        btn.innerHTML = `${dragHandle}${ICONS.spinner}<span>Saving...</span>`;
      } else if (state === 'saved') {
        btn.classList.add('jt-ln-btn-saved');
        btn.innerHTML = `
          ${dragHandle}
          <span class="jt-ln-btn-main-action">${ICONS.check}<span>Saved (${statusText || 'In Sheet'})</span></span>
          <span class="jt-ln-btn-edit-note" title="Update status or add note">${ICONS.edit}</span>
        `;

        const editBtn = btn.querySelector('.jt-ln-btn-edit-note');
        if (editBtn) {
          editBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const currentUrl = window.JobTrackerParser.normalizeJobUrl(window.location.href);
            openNotesPopover(currentUrl, statusText, notes, rowIndex, btn);
          });
        }
      } else {
        btn.innerHTML = `
          ${dragHandle}
          <span class="jt-ln-btn-main-action">${ICONS.bookmark}<span>Save Job</span></span>
          <span class="jt-ln-btn-pre-note" title="Save with custom note & status">${ICONS.edit}</span>
        `;

        const preNoteBtn = btn.querySelector('.jt-ln-btn-pre-note');
        if (preNoteBtn) {
          preNoteBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            e.preventDefault();
            const currentUrl = window.JobTrackerParser.normalizeJobUrl(window.location.href);
            openNotesPopover(currentUrl, 'Saved', '', null, btn);
          });
        }
      }
    });
  }

  /**
   * Handles Save Job trigger.
   */
  async function handleSaveClick() {
    if (!window.JobTrackerParser) return;

    // If already saved, clicking opens status/notes editor
    const isSavedAlready = (currentFloatingBtn && currentFloatingBtn.classList.contains('jt-ln-btn-saved')) ||
                           (currentInlineBtn && currentInlineBtn.classList.contains('jt-ln-btn-saved'));
    if (isSavedAlready) {
      const currentUrl = window.JobTrackerParser.normalizeJobUrl(window.location.href);
      chrome.runtime.sendMessage({ action: 'CHECK_JOB_STATUS', jobLink: currentUrl }, (res) => {
        if (res && res.savedJob) {
          openNotesPopover(currentUrl, res.status || 'Saved', res.savedJob.notes || '', res.savedJob.rowIndex, currentInlineBtn || currentFloatingBtn);
        }
      });
      return;
    }

    setButtonState('loading');
    const jobData = window.JobTrackerParser.parseCurrentJob(currentInlineBtn || currentFloatingBtn);

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

            const anchorBtn = currentInlineBtn || currentFloatingBtn;
            if (anchorBtn) {
              const rect = anchorBtn.getBoundingClientRect();
              triggerParticleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2);
            }

            showToast({
              title: 'Job Saved to Google Sheet',
              message: `${jobData.role || 'Role'} • ${jobData.company || 'Company'}`,
              variant: 'success',
              canUndo: true,
              canAddNote: true,
              onAddNote: () => {
                openNotesPopover(savedLink, 'Saved', '', rowIndex, anchorBtn);
              },
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

  // Background Command and Sync Listener
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === 'TRIGGER_SAVE_SHORTCUT') {
      handleSaveClick();
    }
    if (message.action === 'SYNC_COMPLETE') {
      checkCurrentJobStatus(true);
      updateSearchListBadges();
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
        renderAllButtons();
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
      renderAllButtons();
      syncSavedUrlsCache();
    });
  } else {
    renderAllButtons();
    syncSavedUrlsCache();
  }

  window.addEventListener('popstate', () => {
    setTimeout(() => {
      renderAllButtons();
      syncSavedUrlsCache();
    }, 200);
  });
})();
