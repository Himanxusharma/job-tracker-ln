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
- ⚡ **One-Click Native Save:** A sleek 32px pill button fits natively alongside LinkedIn's Apply and Save buttons.
- 🎯 **Automated Data Capture:** Instantly captures Role, Company, Location, Date Saved, Canonical Job Link, and Company Profile URL.
- 🔄 **Live Two-Way Google Sheets Sync:** Instant manual refresh button pulls recent edits and purges rows deleted directly in Google Sheets.
- ⌨️ **Keyboard Shortcut (`Alt+S` / `Option+S`):** 1-press instant save directly from your keyboard.
- 📝 **Quick Notes & Status Switcher:** Add personal notes (referrals, recruiter contacts) and update stages on the fly directly on LinkedIn.
- 📈 **Interactive Application Funnel:** Visualize conversion rates (*Saved → Applied → Interview → Offer → Accepted*) and filter applications with 1 click.
- 🔍 **Instant Fuzzy Search:** Filter saved opportunities in real time by role, company, location, or notes.
- 📥 **1-Click CSV Export:** Backup and export your entire job tracker to CSV anytime for Notion, Excel, or offline records.
- 🤖 **Auto-Detect Easy Apply:** Automatically detects when a LinkedIn "Application submitted" dialog appears and marks the job as `Applied`.
- 🚫 **Duplicate Detection:** Prevents accidental re-saving with real-time cached URL lookups.
- ↩️ **5-Second Undo Toast:** Accidental click? A 5-second countdown toast lets you undo and removes the entry instantly from both cache and sheet.
- 🔒 **100% Data Sovereignty & Zero Telemetry:** No third-party servers, no middleman database, no ads. All data flows directly and exclusively between your browser and your private Google account.

---

## Permissions Justification

| Permission | Technical Requirement | Plain-English Reason for Review Team |
|---|---|---|
| `storage` | `chrome.storage.local` | Required to store user settings (connected Google Sheet ID) and a local URL index to detect duplicate job saves instantly without redundant network latency. |
| `identity` | `chrome.identity.getAuthToken` | Required to securely authenticate with Google OAuth 2.0 so the extension can write rows directly into the user's personal Google Sheet. |
| `tabs` | `chrome.tabs.query` & `sendMessage` | Required to check the active tab's URL on LinkedIn, refresh the save button status, and trigger the `Alt+S` keyboard shortcut. |
| `host_permissions: https://*.linkedin.com/jobs/*` | Content Script Injection | Required to inject the inline "Save Job" button and read visible job details on LinkedIn job posting views. |
| `host_permissions: https://sheets.googleapis.com/*` | REST API Calls | Required to communicate directly with Google Sheets API v4 to append job rows, initialize status validation dropdowns, and handle row deletion on undo. |
| `host_permissions: https://www.googleapis.com/*` | OAuth Endpoints | Required to verify authorization tokens with Google APIs. |

---

## Google Cloud Console OAuth Configuration

When publishing to the Chrome Web Store:
1. In the [Google Cloud Console](https://console.cloud.google.com/), navigate to **APIs & Services > Credentials**.
2. Under **OAuth 2.0 Client IDs**, select (or create) the Client ID for this extension:
   - Application type: **Chrome extension**
   - Item ID / Extension ID: Enter the Extension ID assigned by the Chrome Web Store Developer Dashboard.
3. In `manifest.json`, verify that `"oauth2.client_id"` matches this Client ID.
4. On the **OAuth consent screen**, set the Publishing status to **In production** (or add your test accounts during beta testing).

---

## Privacy Policy & Single Purpose

### Single Purpose Declaration
Job Tracker LN has a single purpose: to allow job seekers to record LinkedIn job listings directly into their own Google Sheets spreadsheet.

### Data Collection & Usage Disclosure
- **Personal Data Collected:** None. The extension does not collect or transmit user email addresses, browsing history, or identities to any external third-party servers.
- **Third-Party Transmission:** No data is transmitted to the developer or any analytics service. Job information is sent solely and directly to Google's official Sheets API (`sheets.googleapis.com`) using OAuth tokens granted by the user.
- **Storage:** OAuth credentials and local dedup caches are stored strictly on the user's local machine via Chrome's secure sandboxed storage.

---

## Packaging for Chrome Web Store

To generate the distribution ZIP package for the Chrome Developer Dashboard, run:
```bash
zip -r job-tracker-ln-v1.0.0.zip . -x "*.git*" "*.DS_Store*" "*node_modules*" "*test*" "*Docs*" "scripts*" "CHROMEWEBSTORE.md"
```

---

## Version History

### 1.0.0 (September 2026)
- Initial production release for LinkedIn job tracking.
- Manifest V3 compliant service worker architecture.
- 32px native inline pill button in LinkedIn action bar matching native design.
- Automatic Google Sheet setup with status dropdown validation and 8-column schema (including Company URL).
- Two-way live manual Google Sheets sync with deleted row purge.
- Interactive pipeline funnel, instant search, and CSV export.
- Local dedup cache and 5-second undo toast functionality.
- UI-UX Pro Max WCAG AAA high-contrast interface.
