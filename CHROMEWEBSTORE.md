# Chrome Web Store Listing & Compliance Document

## Extension Details

- **Name:** Job Tracker LN
- **Summary:** Save LinkedIn job postings directly to your personal Google Sheet with one click.
- **Category:** Productivity / Workflow
- **Version:** 1.0.0
- **Manifest Version:** 3

---

## Detailed Description

Tired of juggling open browser tabs, disorganized bookmarks, and copy-pasting job titles, companies, and links into spreadsheets?

**Job Tracker LN** is a free, privacy-first Chrome Extension that lets you track LinkedIn job postings directly in your own Google Sheet with a single click.

### Key Features:
- ⚡ **One-Click Save:** A sleek, non-intrusive "Save Job" button appears on LinkedIn job detail pages.
- 🎯 **Automated Data Capture:** Instantly extracts Job Title (Role), Company Name, Location, Date Saved, and the Canonical Job Link.
- 🚫 **Duplicate Detection:** Prevents clutter by warning you if a position is already saved and displays its current status.
- ↩️ **5-Second Undo:** Accidental click? A 5-second countdown toast lets you undo and removes the entry instantly.
- 📊 **Status Tracking in Google Sheets:** Pre-configured with clean dropdown status validation: *Saved, Applied, Interview, Offer, Accepted, Rejected, Archived*.
- 🔒 **100% Data Ownership & Zero Telemetry:** No third-party database, no middleman server, no ads. All data flows directly and exclusively between your browser and your private Google account.

---

## Permissions Justification

| Permission | Technical Requirement | Plain-English Reason for Review Team |
|---|---|---|
| `storage` | `chrome.storage.local` | Required to store user settings (connected Google Sheet ID) and a local URL index to detect duplicate job saves instantly without redundant network latency. |
| `identity` | `chrome.identity.getAuthToken` | Required to securely authenticate with Google OAuth 2.0 so the extension can write rows directly into the user's personal Google Sheet. |
| `tabs` | `chrome.tabs.query` | Required to check the active tab's URL on LinkedIn and refresh the save button status when navigating between postings. |
| `host_permissions: https://*.linkedin.com/jobs/*` | Content Script Injection | Required to inject the floating "Save Job" button and read visible job details on LinkedIn job posting views. |
| `host_permissions: https://sheets.googleapis.com/*` | REST API Calls | Required to communicate directly with the Google Sheets API v4 to append job rows, initialize status validation dropdowns, and handle row deletion on undo. |
| `host_permissions: https://www.googleapis.com/*` | OAuth Endpoints | Required to verify authorization tokens with Google APIs. |

---

## Privacy Policy & Single Purpose

### Single Purpose Declaration
Job Tracker LN has a single purpose: to allow job seekers to record LinkedIn job listings directly into their own Google Sheets spreadsheet.

### Data Collection & Usage Disclosure
- **Personal Data Collected:** None. The extension does not collect or transmit user email addresses, browsing history, or identities to any external third-party servers.
- **Third-Party Transmission:** No data is transmitted to the developer or any analytics service. Job information is sent solely and directly to Google's official Sheets API (`sheets.googleapis.com`) using OAuth tokens granted by the user.
- **Storage:** OAuth credentials and local dedup caches are stored strictly on the user's local machine via Chrome's secure sandboxed storage.

---

## Version History

### 1.0.0 (September 2026)
- Initial production release for LinkedIn job tracking.
- Manifest V3 compliant service worker architecture.
- Automatic Google Sheet setup with status dropdown validation.
- Local dedup cache and 5-second undo toast functionality.
- UI-UX Pro Max WCAG AAA high-contrast interface.
