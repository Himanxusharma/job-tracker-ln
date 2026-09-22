/**
 * Job Tracker LN - DOM Parser
 * Resilient multi-selector extraction for LinkedIn job details,
 * roles, locations, and trimmed company profile URLs.
 */

(function () {
  'use strict';

  function cleanText(text) {
    if (!text) return '';
    return text.replace(/\s+/g, ' ').trim();
  }

  function normalizeJobUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    try {
      const url = new URL(rawUrl, window.location.origin);

      const directMatch = url.pathname.match(/\/jobs\/view\/(\d+)/i);
      if (directMatch && directMatch[1]) {
        return `https://www.linkedin.com/jobs/view/${directMatch[1]}/`;
      }

      const currentJobId = url.searchParams.get('currentJobId') || url.searchParams.get('jobId');
      if (currentJobId && /^\d+$/.test(currentJobId)) {
        return `https://www.linkedin.com/jobs/view/${currentJobId}/`;
      }

      // Check for link inside active job card in search view
      const activeLink = document.querySelector('.jobs-search-results-list__list-item--active a[href*="/jobs/view/"], .jobs-search__job-details a[href*="/jobs/view/"]');
      if (activeLink && activeLink.href) {
        const nestedMatch = activeLink.href.match(/\/jobs\/view\/(\d+)/i);
        if (nestedMatch && nestedMatch[1]) {
          return `https://www.linkedin.com/jobs/view/${nestedMatch[1]}/`;
        }
      }

      const trackingParams = [
        'trk', 'trackingId', 'refId', 'midSig', 'origin', 'originalSubdomain',
        'position', 'pageNum', 'lipi', 'licu', 'midToken', 'trkInfo', 'authType'
      ];
      trackingParams.forEach(param => url.searchParams.delete(param));
      return url.origin + url.pathname.replace(/\/+$/, '') + (url.search ? url.search : '');
    } catch (e) {
      return (rawUrl || '').trim();
    }
  }

  /**
   * Normalizes LinkedIn company URLs to canonical: https://www.linkedin.com/company/<slug>/
   */
  function normalizeCompanyUrl(rawUrl) {
    if (!rawUrl || typeof rawUrl !== 'string') return '';
    try {
      const url = new URL(rawUrl, window.location.origin);
      const match = url.pathname.match(/\/company\/([a-zA-Z0-9-_]+)/i);
      if (match && match[1]) {
        return `https://www.linkedin.com/company/${match[1]}/`;
      }
      return url.origin + url.pathname.replace(/\/+$/, '') + '/';
    } catch (e) {
      return (rawUrl || '').trim();
    }
  }

  /**
   * Validates if a text string is a credible job title (role).
   * Strictly filters out feedback questions, navigation items, and UI controls.
   */
  function isValidRole(text) {
    if (!text || typeof text !== 'string') return false;
    const clean = cleanText(text);
    if (clean.length < 2 || clean.length > 120) return false;
    if (clean.includes('?')) return false; // Questions like "Are these results helpful?" are NEVER job titles
    if (/^(search|preferences|jobs|feed|messaging|notifications|home|network|manage|details|about the job|overview|filter|alerts)$/i.test(clean)) return false;
    if (/\b(helpful|feedback|results|responses|similar jobs|people you can reach out to|qualifications|insights|learn more|sign in|join now|apply|easy apply|save job|saved)\b/i.test(clean)) return false;
    return true;
  }

  /**
   * Validates if a text string is a credible company name.
   */
  function isValidCompany(text) {
    if (!text || typeof text !== 'string') return false;
    const clean = cleanText(text);
    if (clean.length < 2 || clean.length > 100) return false;
    if (clean.includes('?')) return false;
    if (/^(apply|save|saved|search|preferences|manage|details|about the job|feedback|helpful|filter|alerts)$/i.test(clean)) return false;
    return true;
  }

  /**
   * Validates if a text segment is a credible location.
   */
  function isValidLocation(text) {
    if (!text || typeof text !== 'string') return false;
    const clean = cleanText(text);
    if (clean.length < 2 || clean.length > 100) return false;
    if (clean.includes('?')) return false;
    // Exclude timestamps, applicant counts, promotional text, feedback, networking counters
    if (/\b(reposted|promoted|responses|managed|easy apply|applicants?|hours?|days?|weeks?|months?|years?|ago|clicked|alumni|school|connections|verified|feedback|helpful|insights|apply)\b/i.test(clean)) {
      return false;
    }
    return true;
  }

  /**
   * Scans document for the Job Title (Role)
   */
  function extractRole(container) {
    const inlineBtn = document.getElementById('jt-ln-inline-btn');
    const headerCard = inlineBtn
      ? (inlineBtn.closest('div[style*="display: flex"], [class*="top-card"], [class*="detail"], main') || inlineBtn.parentElement)
      : null;

    const detailsPane = document.querySelector(
      '.scaffold-layout__detail, .jobs-search__job-details, .jobs-details__main-content, .job-view-layout, [class*="job-details"]'
    );

    const searchScopes = [headerCard, container, detailsPane, document].filter(Boolean);

    // 1. Modern LinkedIn 2025/2026: Anchor linking directly to the job posting in the header
    for (const scope of searchScopes) {
      const jobLinks = Array.from(scope.querySelectorAll('a[href*="/jobs/view/"]'));
      for (const a of jobLinks) {
        let text = cleanText(a.innerText || a.textContent);
        text = text.split('\n')[0].replace(/\s*(?:verified(?:\s*badge)?|promoted)$/i, '').trim();
        if (isValidRole(text)) {
          return text;
        }
      }
    }

    // 2. Structured & semantic job title selectors
    const selectors = [
      '.job-details-jobs-unified-top-card__job-title h1',
      '.job-details-jobs-unified-top-card__job-title h2',
      '.job-details-jobs-unified-top-card__job-title a',
      '.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title h1',
      '.jobs-unified-top-card__job-title h2',
      '.jobs-unified-top-card__job-title a',
      '.jobs-unified-top-card__job-title',
      '[class*="job-title"] h1',
      '[class*="job-title"] h2',
      '[class*="job-title"] a',
      '[class*="job-title"]',
      '.jobs-details__main-content h1',
      '.jobs-search__job-details h1',
      '.top-card-layout__title',
      'h1.t-24',
      'h1'
    ];

    for (const scope of searchScopes) {
      for (const sel of selectors) {
        const el = scope.querySelector(sel);
        if (el) {
          let text = cleanText(el.innerText || el.textContent);
          text = text.split('\n')[0].replace(/\s*(?:verified(?:\s*badge)?|promoted)$/i, '').trim();
          if (isValidRole(text)) {
            return text;
          }
        }
      }
    }

    // 3. Fallback: active job card in search results list on the left
    const activeCard = document.querySelector(
      '.jobs-search-results-list__list-item--active, li.jobs-search-results-list__list-item--selected, li[class*="selected"], li[class*="active"]'
    );
    if (activeCard) {
      const cardLinks = Array.from(activeCard.querySelectorAll('a[href*="/jobs/view/"], .job-card-list__title--link, [class*="job-card-list__title"]'));
      for (const a of cardLinks) {
        let text = cleanText(a.innerText || a.textContent);
        text = text.split('\n')[0].replace(/\s*(?:verified(?:\s*badge)?|promoted)$/i, '').trim();
        if (isValidRole(text)) {
          return text;
        }
      }
    }

    // 4. Fallback: "Project Role : <Name>" from "About the job" section if present
    for (const scope of searchScopes) {
      const fullText = scope.innerText || scope.textContent || '';
      const projectRoleMatch = fullText.match(/Project\s*Role\s*:\s*([^\n\r.]+)/i);
      if (projectRoleMatch && isValidRole(projectRoleMatch[1])) {
        return cleanText(projectRoleMatch[1]);
      }
    }

    // 5. Fallback: document.title patterns
    const docTitle = document.title || '';
    const hireMatch = docTitle.match(/^(.+?)\s+hiring\s+(.+?)\s+in\s+([^|]+?)(?:\s*\|\s*LinkedIn)?$/i);
    if (hireMatch && isValidRole(hireMatch[2])) {
      return cleanText(hireMatch[2]);
    }
    const dashMatch = docTitle.match(/^(.+?)\s+-\s+([^|]+?)(?:\s*\|\s*LinkedIn)?$/i);
    if (dashMatch && isValidRole(dashMatch[1])) {
      return cleanText(dashMatch[1]);
    }
    const inMatch = docTitle.match(/^(.+?)\s+in\s+([^|]+?)(?:\s*\|\s*LinkedIn)?$/i);
    if (inMatch && isValidRole(inMatch[1])) {
      return cleanText(inMatch[1]);
    }

    return '';
  }

  /**
   * Scans document for Company Name and trimmed Company Profile URL
   */
  function extractCompanyInfo(container) {
    const inlineBtn = document.getElementById('jt-ln-inline-btn');
    const headerCard = inlineBtn
      ? (inlineBtn.closest('div[style*="display: flex"], [class*="top-card"], [class*="detail"], main') || inlineBtn.parentElement)
      : null;

    const detailsPane = document.querySelector(
      '.scaffold-layout__detail, .jobs-search__job-details, .jobs-details__main-content, .job-view-layout, [class*="job-details"]'
    );

    const searchScopes = [headerCard, container, detailsPane, document].filter(Boolean);

    let name = '';
    let url = '';

    // 1. Look for company profile anchors: a[href*="/company/"]
    for (const scope of searchScopes) {
      const companyAnchors = Array.from(scope.querySelectorAll('a[href*="/company/"]'));
      for (const a of companyAnchors) {
        if (!url && a.href) {
          url = normalizeCompanyUrl(a.href);
        }
        if (!name) {
          const txt = cleanText(a.innerText || a.textContent);
          if (isValidCompany(txt)) {
            name = txt;
          }
        }
        if (name && url) break;
      }
      if (name && url) break;
    }

    // 2. Check aria-label="Company, <Name>." (common in modern LinkedIn header figures)
    if (!name) {
      for (const scope of searchScopes) {
        const companyAria = scope.querySelector('[aria-label^="Company,"]');
        if (companyAria) {
          const label = companyAria.getAttribute('aria-label') || '';
          const m = label.match(/Company,\s*([^.]+)/i);
          if (m && isValidCompany(m[1])) {
            name = cleanText(m[1]);
            break;
          }
        }
      }
    }

    // 3. Fallback: check active job card on the left sidebar
    if (!url || !name) {
      const activeCard = document.querySelector(
        '.jobs-search-results-list__list-item--active, li.jobs-search-results-list__list-item--selected, li[class*="selected"], li[class*="active"]'
      );
      if (activeCard) {
        if (!url) {
          const cLink = activeCard.querySelector('a[href*="/company/"]');
          if (cLink && cLink.href) url = normalizeCompanyUrl(cLink.href);
        }
        if (!name) {
          const sub = activeCard.querySelector('.artdeco-entity-lockup__subtitle, [class*="company-name"], [class*="subtitle"]');
          if (sub) {
            const txt = cleanText(sub.innerText || sub.textContent);
            if (isValidCompany(txt)) name = txt;
          }
        }
      }
    }

    // 4. Fallback: document.title
    if (!name) {
      const docTitle = document.title || '';
      const hireMatch = docTitle.match(/^(.+?)\s+hiring\s+/i);
      if (hireMatch && isValidCompany(hireMatch[1])) {
        name = cleanText(hireMatch[1]);
      } else {
        const dashMatch = docTitle.match(/-\s+([^|]+?)(?:\s*\|\s*LinkedIn)?$/i);
        if (dashMatch && isValidCompany(dashMatch[1])) {
          name = cleanText(dashMatch[1]);
        }
      }
    }

    return { name, url };
  }

  /**
   * Scans document for Location (e.g. "Gurugram, Haryana, India (On-site)")
   */
  function extractLocation(container) {
    const inlineBtn = document.getElementById('jt-ln-inline-btn');
    const headerCard = inlineBtn
      ? (inlineBtn.closest('div[style*="display: flex"], [class*="top-card"], [class*="detail"], main') || inlineBtn.parentElement)
      : null;

    const detailsPane = document.querySelector(
      '.scaffold-layout__detail, .jobs-search__job-details, .jobs-details__main-content, .job-view-layout, [class*="job-details"]'
    );

    const searchScopes = [headerCard, container, detailsPane, document].filter(Boolean);

    let location = '';
    let workplaceType = '';

    // Step 0: Detect workplace type badge (e.g. On-site, Hybrid, Remote)
    for (const scope of searchScopes) {
      const badgeElements = Array.from(scope.querySelectorAll('span, a, div'));
      for (const el of badgeElements) {
        if (el.children.length > 1) continue;
        const txt = cleanText(el.innerText || el.textContent);
        if (/^(On-site|Hybrid|Remote)$/i.test(txt)) {
          workplaceType = txt;
          break;
        }
      }
      if (workplaceType) break;
    }

    // Step 1: Scan paragraphs, divs, and spans containing middle dot '·' or '•'
    // Format: "Gurugram, Haryana, India · Reposted 3 weeks ago · Over 100 people clicked apply"
    for (const scope of searchScopes) {
      const candidates = Array.from(scope.querySelectorAll('p, div, span'));
      for (const el of candidates) {
        if (el.children.length > 8 && el.tagName === 'DIV') continue;
        const text = cleanText(el.innerText || el.textContent);
        if (text.includes('·') || text.includes('•')) {
          const parts = text.split(/[·•]/).map(p => cleanText(p)).filter(Boolean);
          for (const part of parts) {
            if (isValidLocation(part)) {
              location = part;
              break;
            }
          }
        }
        if (location) break;
      }
      if (location) break;
    }

    // Step 2: Check individual spans inside candidate paragraphs or top card
    if (!location) {
      for (const scope of searchScopes) {
        const spans = Array.from(scope.querySelectorAll('p span, div span'));
        for (const s of spans) {
          const txt = cleanText(s.innerText || s.textContent);
          if (txt.includes(',') && isValidLocation(txt)) {
            location = txt;
            break;
          }
        }
        if (location) break;
      }
    }

    // Step 3: Traditional bullet & workplace selectors
    if (!location) {
      const selectors = [
        '.job-details-jobs-unified-top-card__bullet',
        '.jobs-unified-top-card__bullet',
        '.topcard__flavor--bullet',
        'span[class*="workplace-type"]',
        '.job-details-jobs-unified-top-card__workplace-type'
      ];
      for (const scope of searchScopes) {
        for (const sel of selectors) {
          const el = scope.querySelector(sel);
          if (el) {
            let txt = cleanText(el.innerText || el.textContent);
            if (txt.includes('·')) txt = txt.split('·')[0].trim();
            if (isValidLocation(txt)) {
              location = txt;
              break;
            }
          }
        }
        if (location) break;
      }
    }

    // Step 4: Check active job card on the left sidebar
    if (!location) {
      const activeCard = document.querySelector(
        '.jobs-search-results-list__list-item--active, li.jobs-search-results-list__list-item--selected, li[class*="selected"], li[class*="active"]'
      );
      if (activeCard) {
        const items = Array.from(activeCard.querySelectorAll('.job-card-container__metadata-item, [class*="metadata"], [class*="caption"], li, span'));
        for (const it of items) {
          let txt = cleanText(it.innerText || it.textContent);
          if (txt.includes('·')) txt = txt.split('·')[0].trim();
          if (isValidLocation(txt) && !txt.toLowerCase().includes('connections') && !txt.toLowerCase().includes('viewed')) {
            location = txt;
            break;
          }
        }
      }
    }

    // Step 5: document.title fallback
    if (!location) {
      const docTitle = document.title || '';
      const hireMatch = docTitle.match(/\bin\s+([^|]+?)(?:\s*\|\s*LinkedIn)?$/i);
      if (hireMatch && isValidLocation(hireMatch[1])) {
        location = cleanText(hireMatch[1]);
      }
    }

    // Append workplaceType if not already part of location (e.g. "Gurugram, Haryana, India (On-site)")
    if (location && workplaceType && !location.toLowerCase().includes(workplaceType.toLowerCase())) {
      location = `${location} (${workplaceType})`;
    } else if (!location && workplaceType) {
      location = workplaceType;
    }

    return location || '';
  }

  /**
   * Checks if current page is showing an active job detail view
   */
  function isJobDetailView() {
    const path = window.location.pathname;
    const search = window.location.search;

    // Direct job URL
    if (/\/jobs\/view\/\d+/i.test(path)) return true;

    // Search or collection view with an active job open in URL query
    if (search.includes('currentJobId=') || search.includes('jobId=')) {
      return true;
    }

    // Direct standalone layout or 2-pane search details pane
    const jobDetailsSelectors = [
      '.job-details-jobs-unified-top-card',
      '.jobs-details__main-content',
      '.jobs-search__job-details',
      '.jobs-details',
      '.job-view-layout',
      '[class*="job-details"]',
      '.jobs-description',
      '.jobs-apply-button',
      '#jt-ln-inline-btn'
    ];

    for (const sel of jobDetailsSelectors) {
      if (document.querySelector(sel)) return true;
    }

    return false;
  }

  /**
   * Extracts complete job record from the active job detail pane
   * @param {HTMLElement} [contextEl] Optional element (e.g. clicked inline button)
   */
  function parseCurrentJob(contextEl) {
    const inlineBtn = (contextEl && contextEl.nodeType === 1) ? contextEl : document.getElementById('jt-ln-inline-btn');
    const headerCard = inlineBtn
      ? (inlineBtn.closest('div[style*="display: flex"], [class*="top-card"], [class*="detail"], main') || inlineBtn.parentElement)
      : null;

    const container = headerCard || document.querySelector(
      '.scaffold-layout__detail, .jobs-search__job-details, .jobs-details__main-content, .job-view-layout, main'
    ) || document;

    let role = extractRole(container);
    const companyInfo = extractCompanyInfo(container);
    let company = companyInfo.name;
    let companyUrl = companyInfo.url;
    let location = extractLocation(container);
    const jobLink = normalizeJobUrl(window.location.href);

    // Document title fallback if any field was not found via DOM
    if (!role || !company || !location) {
      const docTitle = document.title || '';
      // Pattern 1: "<Company> hiring <Role> in <Location> | LinkedIn"
      const hireMatch = docTitle.match(/^(.+?)\s+hiring\s+(.+?)\s+in\s+([^|]+?)(?:\s*\|\s*LinkedIn)?$/i);
      if (hireMatch) {
        if (!company && isValidCompany(hireMatch[1])) company = cleanText(hireMatch[1]);
        if (!role && isValidRole(hireMatch[2])) role = cleanText(hireMatch[2]);
        if (!location && isValidLocation(hireMatch[3])) location = cleanText(hireMatch[3]);
      } else {
        // Pattern 2: "<Role> - <Company> | LinkedIn"
        const dashMatch = docTitle.match(/^(.+?)\s+-\s+([^|]+?)(?:\s*\|\s*LinkedIn)?$/i);
        if (dashMatch) {
          if (!role && isValidRole(dashMatch[1])) role = cleanText(dashMatch[1]);
          if (!company && isValidCompany(dashMatch[2])) company = cleanText(dashMatch[2]);
        }
      }
    }

    return {
      role: role || '',
      company: company || '',
      companyUrl: companyUrl || '',
      location: location || '',
      jobLink: jobLink || '',
      dateSaved: new Date().toISOString()
    };
  }

  window.JobTrackerParser = {
    isJobDetailView,
    parseCurrentJob,
    normalizeJobUrl,
    normalizeCompanyUrl
  };
})();
