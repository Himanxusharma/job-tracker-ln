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
   * Scans document for the Job Title (Role)
   */
  function extractRole(container) {
    const detailsPane = document.querySelector(
      '.scaffold-layout__detail, .jobs-search__job-details, .jobs-details__main-content, .job-view-layout, [class*="job-details"]'
    ) || container || document;

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
      '.jobs-details__main-content h2',
      '.jobs-search__job-details h1',
      '.jobs-search__job-details h2',
      'h1.t-24',
      'h2.t-24',
      '.t-24.t-bold',
      'h1',
      'h2',
      '.t-24',
      '.top-card-layout__title'
    ];

    for (const sel of selectors) {
      const el = detailsPane.querySelector(sel);
      if (el) {
        let text = cleanText(el.innerText || el.textContent);
        if (text && text.length > 1 && !/^(search|preferences|jobs|feed|messaging|notifications|home|network|manage|details)$/i.test(text.trim())) {
          text = text.split('\n')[0].trim();
          text = text.replace(/\s*(?:verified(?:\s*badge)?|promoted)$/i, '').trim();
          if (text.length > 1) return text;
        }
      }
    }

    // Fallback: active job card in search results list on the left
    const activeCard = document.querySelector(
      '.jobs-search-results-list__list-item--active, li.jobs-search-results-list__list-item--selected, li[class*="selected"], li[class*="active"]'
    );
    if (activeCard) {
      const link = activeCard.querySelector('a[href*="/jobs/view/"], .job-card-list__title--link, [class*="job-card-list__title"]');
      if (link) {
        let text = cleanText(link.innerText || link.textContent);
        if (text && text.length > 1) return text.split('\n')[0].trim();
      }
    }

    return '';
  }

  /**
   * Scans document for Company Name and trimmed Company Profile URL
   */
  function extractCompanyInfo(container) {
    const detailsPane = document.querySelector(
      '.scaffold-layout__detail, .jobs-search__job-details, .jobs-details__main-content, .job-view-layout, [class*="job-details"]'
    ) || container || document;

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

    let name = '';
    let url = '';

    for (const sel of selectors) {
      const el = detailsPane.querySelector(sel) || document.querySelector(sel);
      if (el) {
        if (!name) {
          const txt = cleanText(el.innerText || el.textContent);
          if (txt && !txt.toLowerCase().includes('feedback')) {
            name = txt;
          }
        }
        if (!url) {
          if (el.tagName === 'A' && el.href) {
            url = normalizeCompanyUrl(el.href);
          } else {
            const a = el.querySelector('a[href*="/company/"]');
            if (a && a.href) url = normalizeCompanyUrl(a.href);
          }
        }
      }
      if (name && url) break;
    }

    // Fallback: check active job card on left for company link
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
          const sub = activeCard.querySelector('.artdeco-entity-lockup__subtitle, [class*="company-name"]');
          if (sub) name = cleanText(sub.innerText || sub.textContent);
        }
      }
    }

    return { name, url };
  }

  /**
   * Scans document for Location (e.g. "Gurugram, Haryana, India")
   */
  function extractLocation(container) {
    const detailsPane = document.querySelector(
      '.scaffold-layout__detail, .jobs-search__job-details, .jobs-details__main-content, .job-view-layout, [class*="job-details"]'
    ) || container || document;

    // 1. Check primary description text nodes (e.g. "Gurugram, Haryana, India · Reposted 3 weeks ago")
    const primaryDesc = detailsPane.querySelector(
      '.job-details-jobs-unified-top-card__primary-description-container, .job-details-jobs-unified-top-card__primary-description, [class*="primary-description"]'
    ) || document.querySelector('.job-details-jobs-unified-top-card__primary-description-container, [class*="primary-description"]');

    if (primaryDesc) {
      const spans = Array.from(primaryDesc.querySelectorAll('span, div.tvm__text, div'));
      for (const s of spans) {
        let txt = cleanText(s.innerText || s.textContent);
        if (!txt) continue;

        // Take the segment before '·' which is the location!
        if (txt.includes('·')) {
          const parts = txt.split('·').map(p => cleanText(p)).filter(Boolean);
          for (const part of parts) {
            if (!/applicants|reposted|hours|days|weeks|months|ago|promoted|responses|easy apply|managed|click|alumni|feedback/i.test(part) && part.length > 2) {
              return part;
            }
          }
        } else if (txt.length > 2 && !/applicants|reposted|hours|days|weeks|months|ago|promoted|responses|feedback|managed|click|alumni/i.test(txt)) {
          if (txt.includes(',') || /remote|hybrid|on-site/i.test(txt)) {
            return txt;
          }
        }
      }
    }

    // 2. Direct bullet/location selectors
    const selectors = [
      '.job-details-jobs-unified-top-card__bullet',
      '.jobs-unified-top-card__bullet',
      '.job-details-jobs-unified-top-card__primary-description-container .tvm__text',
      '.topcard__flavor--bullet',
      'span[class*="workplace-type"]',
      '.job-details-jobs-unified-top-card__workplace-type'
    ];

    for (const sel of selectors) {
      const el = detailsPane.querySelector(sel) || document.querySelector(sel);
      if (el) {
        let text = cleanText(el.innerText || el.textContent);
        if (text && text.length > 1 && !text.toLowerCase().includes('alumni')) {
          if (text.includes('·')) text = text.split('·')[0].trim();
          return text;
        }
      }
    }

    // 3. Fallback: check active job card on the left
    const activeCard = document.querySelector(
      '.jobs-search-results-list__list-item--active, li.jobs-search-results-list__list-item--selected, li[class*="selected"], li[class*="active"]'
    );
    if (activeCard) {
      const locEl = activeCard.querySelector('.job-card-container__metadata-item, .job-card-container__metadata-wrapper, [class*="metadata"]');
      if (locEl) {
        let text = cleanText(locEl.innerText || locEl.textContent);
        if (text && text.length > 1) {
          if (text.includes('·')) text = text.split('·')[0].trim();
          return text;
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
