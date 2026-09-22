/**
 * Job Tracker LN - URL Normalizer
 * Normalizes LinkedIn job URLs by stripping tracking parameters,
 * ensuring accurate duplicate detection across different navigation paths.
 */

/**
 * Normalizes a LinkedIn job URL.
 * Extracts the job ID and standardizes to https://www.linkedin.com/jobs/view/<jobId>/
 *
 * @param {string} rawUrl
 * @returns {string} Normalized canonical URL, or stripped URL if ID cannot be parsed.
 */
export function normalizeJobUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return '';
  }

  try {
    const url = new URL(rawUrl);

    // 1. Direct job detail view pattern: /jobs/view/<jobId>/...
    const directMatch = url.pathname.match(/\/jobs\/view\/(\d+)/i);
    if (directMatch && directMatch[1]) {
      return `https://www.linkedin.com/jobs/view/${directMatch[1]}/`;
    }

    // 2. Query parameter pattern: currentJobId=<jobId> (search / collections / recommended)
    const currentJobId = url.searchParams.get('currentJobId');
    if (currentJobId && /^\d+$/.test(currentJobId)) {
      return `https://www.linkedin.com/jobs/view/${currentJobId}/`;
    }

    // 3. Alternate path pattern: /jobs/collections/.../?currentJobId=<jobId>
    const jobIdParam = url.searchParams.get('jobId');
    if (jobIdParam && /^\d+$/.test(jobIdParam)) {
      return `https://www.linkedin.com/jobs/view/${jobIdParam}/`;
    }

    // Fallback: Remove known tracking and session query parameters
    const trackingParams = [
      'trk', 'trackingId', 'refId', 'midSig', 'origin', 'originalSubdomain',
      'position', 'pageNum', 'lipi', 'licu', 'midToken', 'trkInfo', 'authType'
    ];
    trackingParams.forEach(param => url.searchParams.delete(param));

    // Strip trailing slash variations
    return url.origin + url.pathname.replace(/\/+$/, '') + (url.search ? url.search : '');
  } catch (err) {
    // If not a parseable URL, return trimmed original string
    return rawUrl.trim();
  }
}

/**
 * Normalizes a LinkedIn company URL to canonical format:
 * https://www.linkedin.com/company/<slug>/
 *
 * @param {string} rawUrl
 * @returns {string} Normalized canonical company URL, or empty string if invalid.
 */
export function normalizeCompanyUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return '';
  }

  try {
    const url = new URL(rawUrl, 'https://www.linkedin.com');
    const match = url.pathname.match(/\/company\/([a-zA-Z0-9-_]+)/i);
    if (match && match[1]) {
      return `https://www.linkedin.com/company/${match[1]}/`;
    }
    return url.origin + url.pathname.replace(/\/+$/, '') + '/';
  } catch (err) {
    return rawUrl.trim();
  }
}

