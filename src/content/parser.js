/**
 * Job Tracker LN - DOM Parser
 * Resilient multi-selector extraction for LinkedIn job details.
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
   * Scans document for the Job Title (Role)
   */
  function extractRole(container) {
    const root = container || document;
    const selectors = [
      '.job-details-jobs-unified-top-card__job-title h1',
      '.job-details-jobs-unified-top-card__job-title',
      'h1.job-details-jobs-unified-top-card__job-title',
      '.jobs-unified-top-card__job-title',
      '.jobs-details__main-content h1',
      '.jobs-search__job-details h1',
      'h1.t-24.t-bold',
      'h1.t-24',
      'h1[class*="job-title"]',
      '.jobs-search__job-details--title',
      '.top-card-layout__title',
      'h1[tabindex="-1"]'
    ];

    for (const selector of selectors) {
      const el = root.querySelector(selector) || document.querySelector(selector);
      if (el) {
        const text = cleanText(el.innerText || el.textContent);
        if (text && text.length > 1) return text;
      }
    }

    // Try any h1 inside the job detail container or document
    const h1 = (container && container.querySelector('h1')) || document.querySelector('.jobs-search__job-details h1, .jobs-details h1, main h1, h1');
    if (h1) {
      const text = cleanText(h1.innerText || h1.textContent);
      if (text && text.length > 1 && !/feed|messaging|notifications|search/i.test(text)) return text;
    }

    return '';
  }

  /**
   * Scans document for the Company Name
   */
  function extractCompany(container) {
    const root = container || document;
    const selectors = [
      '.job-details-jobs-unified-top-card__company-name a',
      '.job-details-jobs-unified-top-card__company-name',
      '.jobs-unified-top-card__company-name a',
      '.jobs-unified-top-card__company-name',
      '.job-details-jobs-unified-top-card__primary-description a[href*="/company/"]',
      'a[href*="/company/"]',
      '.topcard__flavor--black-link',
      '[class*="company-name"]'
    ];

    for (const selector of selectors) {
      const el = root.querySelector(selector) || document.querySelector(selector);
      if (el) {
        const text = cleanText(el.innerText || el.textContent);
        if (text && text.length > 0 && !text.toLowerCase().includes('feedback')) return text;
      }
    }
    return '';
  }

  /**
   * Scans document for Location (e.g. "San Francisco, CA (Hybrid)")
   */
  function extractLocation(container) {
    const root = container || document;
    const selectors = [
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__bullet',
      '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
      '.job-details-jobs-unified-top-card__primary-description span:nth-of-type(1)',
      '.jobs-unified-top-card__primary-description span:nth-of-type(1)',
      '.topcard__flavor--bullet',
      'span[class*="workplace-type"]',
      '.job-details-jobs-unified-top-card__workplace-type',
      '[class*="job-details"] [class*="bullet"]'
    ];

    for (const selector of selectors) {
      const el = root.querySelector(selector) || document.querySelector(selector);
      if (el) {
        const text = cleanText(el.innerText || el.textContent);
        if (text && text.length > 1 && !text.toLowerCase().includes('alumni')) return text;
      }
    }

    // Secondary fallback: search primary description container for text near company
    const primaryDesc = root.querySelector('.job-details-jobs-unified-top-card__primary-description, [class*="primary-description"]') || document.querySelector('.job-details-jobs-unified-top-card__primary-description, [class*="primary-description"]');
    if (primaryDesc) {
      const spans = Array.from(primaryDesc.querySelectorAll('span, div.tvm__text'));
      for (const s of spans) {
        const txt = cleanText(s.innerText || s.textContent);
        if (txt && !txt.includes('·') && txt.length > 2 && !/applicants|reposted|hours|days|weeks|ago/i.test(txt)) {
          return txt;
        }
      }
    }

    return '';
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
      '.jobs-apply-button'
    ];

    for (const sel of jobDetailsSelectors) {
      if (document.querySelector(sel)) return true;
    }

    return false;
  }

  /**
   * Extracts complete job record from the active job detail pane
   */
  function parseCurrentJob() {
    // Find job details root container if present, or fallback to document
    const container = document.querySelector(
      '.jobs-search__job-details, .jobs-details__main-content, .job-view-layout, main'
    ) || document;

    let role = extractRole(container);
    let company = extractCompany(container);
    let location = extractLocation(container);
    const jobLink = normalizeJobUrl(window.location.href);

    // Document title fallback if any field was not found via DOM
    if (!role || !company || !location) {
      const docTitle = document.title || '';
      // Pattern 1: "<Company> hiring <Role> in <Location> | LinkedIn"
      const hireMatch = docTitle.match(/^(.+?)\s+hiring\s+(.+?)\s+in\s+([^|]+?)(?:\s*\|\s*LinkedIn)?$/i);
      if (hireMatch) {
        if (!company) company = cleanText(hireMatch[1]);
        if (!role) role = cleanText(hireMatch[2]);
        if (!location) location = cleanText(hireMatch[3]);
      } else {
        // Pattern 2: "<Role> - <Company> | LinkedIn"
        const dashMatch = docTitle.match(/^(.+?)\s+-\s+([^|]+?)(?:\s*\|\s*LinkedIn)?$/i);
        if (dashMatch) {
          if (!role) role = cleanText(dashMatch[1]);
          if (!company) company = cleanText(dashMatch[2]);
        }
      }
    }

    return {
      role,
      company,
      location,
      jobLink,
      dateSaved: new Date().toISOString()
    };
  }

  window.JobTrackerParser = {
    isJobDetailView,
    parseCurrentJob,
    normalizeJobUrl
  };
})();
