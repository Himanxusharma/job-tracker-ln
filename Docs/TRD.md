# Technical Requirements Document (TRD)
## Job Tracker LN

**Version:** 1.0
**Status:** Draft
**Last Updated:** September 23, 2026

---

## 1. Architecture Overview

The extension is fully client-side. There is no backend server, no proxy, and no LinkedIn API dependency. All data flows directly between the user's browser and their own Google account.

```
┌─────────────────────────────┐
│   LinkedIn Job Detail Page  │
│                              │
│   [Content Script]           │
│   - Reads visible DOM        │
│   - Injects "Save Job" btn   │
└──────────────┬───────────────┘
               │ extracted job data
               ▼
┌─────────────────────────────┐
│   Extension Background /     │
│   Service Worker (MV3)       │
│   - Dedup check               │
│   - Auth token handling       │
└──────────────┬───────────────┘
               │ Sheets API call (OAuth)
               ▼
┌─────────────────────────────┐
│   User's Google Sheet         │
│   (via Google Sheets API)     │
└─────────────────────────────┘
```

No component of this system calls the LinkedIn API. No component sends job data to any Anthropic/Resumary/third-party server.

---

## 2. Platform & Environment

- **Extension type:** Chrome Extension, Manifest V3
- **Target browser:** Chrome (Chromium-based browsers as stretch, e.g., Edge, Brave)
- **Languages:** JavaScript (or TypeScript), HTML, CSS
- **Storage:** `chrome.storage.local` for extension settings/cache; Google Sheets as the source of truth for job data
- **Permissions required:**
  - `activeTab` / host permission scoped to `*.linkedin.com/jobs/*`
  - `identity` (for Google OAuth)
  - `storage`

---

## 3. Components

### 3.1 Content Script (`content.js`)
- Runs only on `linkedin.com/jobs/*` matching URLs
- Responsibilities:
  - Detect when a job detail view is rendered
  - Parse DOM for: Role (job title), Company, Location, Job Link (`window.location.href` or canonical job URL)
  - Inject the floating "Save Job" button into the page
  - Handle click event → send extracted data to background script
  - Display toast UI (success / duplicate / undo)

**DOM Parsing Approach:**
- Use resilient selectors (e.g., attribute-based or semantic role selectors) rather than brittle class names where possible, since LinkedIn's class names change frequently with deploys
- Fallback: if a field cannot be reliably parsed, leave it blank rather than capturing incorrect data — better an empty cell the user fills in than wrong data

### 3.2 Background / Service Worker (`background.js`)
- Responsibilities:
  - Receive job data payload from content script
  - Check for duplicates (see §5)
  - Manage Google OAuth token (obtain, refresh, handle expiry)
  - Call Google Sheets API to append row
  - Return success/failure to content script for toast display

### 3.3 Popup / Settings UI
- Built with plain HTML/CSS/JS (or a lightweight framework)
- Screens:
  - **Main/Home** — "Supported Job Sites" (LinkedIn), status indicator
  - **Settings** — Connect/View/Edit linked Google Sheet, Log out
- Settings persists the connected Sheet ID in `chrome.storage.local`

---

## 4. Authentication

- **Method:** Google OAuth 2.0 via `chrome.identity.getAuthToken()`
- **Scopes required:**
  - `https://www.googleapis.com/auth/spreadsheets` (read/write to the specific sheet)
  - Optionally scoped further to `spreadsheets.file` scope if only extension-created sheets need access (reduces permission footprint)
- **Token handling:**
  - Token cached via `chrome.identity` token cache
  - On expiry, silently refresh; if refresh fails, prompt user to reconnect via Settings
- **No credentials, tokens, or job data are ever sent to any server owned by the extension developer.** All Google API calls are made directly from the extension's background context to Google's API endpoints.

---

## 5. Duplicate Detection

- **Key:** Job Link (URL), normalized (strip tracking query parameters, e.g., `?trk=...`)
- **Approach (no backend, so no server-side index):**
  - Maintain a local cache (`chrome.storage.local`) of previously saved Job Links, synced periodically from the Sheet (read `Job Link` column on extension load / Settings open)
  - On save attempt: check local cache first (fast, no API call) → if not found, optionally do a live check against the Sheet before writing (safety net in case of multi-device use)
  - If duplicate found: show toast with existing status instead of appending a new row

---

## 6. Data Write Flow

1. User clicks "Save Job" button on LinkedIn job detail page
2. Content script extracts: Role, Company, Location, Job Link
3. Content script adds: Date Saved (client-side timestamp), default Status = "Saved", Notes = "" (empty)
4. Payload sent to background script
5. Background script checks local dedup cache
   - If duplicate → return duplicate response → content script shows "already saved" toast
   - If new → proceed
6. Background script calls `spreadsheets.values.append` on the user's connected Sheet ID, target range (e.g., `Sheet1!A:G`)
7. On success → update local dedup cache → content script shows success toast with Undo option
8. If Undo clicked within the toast window (e.g., 5 seconds) → background script calls a delete/clear on the just-added row (via row index returned from the append response, or a matching lookup by Job Link + Date Saved)

---

## 7. Google Sheets Schema (Row Structure)

| Column | Field | Type |
|---|---|---|
| A | Date Saved | Timestamp (ISO or locale string) |
| B | Role | Text |
| C | Company | Text |
| D | Location | Text |
| E | Job Link | URL (text) |
| F | Status | Text (Data Validation dropdown) |
| G | Notes | Text |

**Data Validation (Status column):** Configured once when the sheet is created/initialized by the extension, using Sheets API `setDataValidation` with the values: `Saved, Applied, Interview, Offer, Accepted, Rejected, Archived`

---

## 8. Sheet Initialization

- On first connect (Settings → "Create new sheet" or "Connect existing sheet"):
  - If new: extension creates a sheet via Sheets API, writes header row, applies Status column dropdown validation, freezes header row
  - If existing: extension validates the sheet has the expected header row; if not, prompts user to confirm column mapping or offers to append the required headers

---

## 9. Error Handling

| Scenario | Handling |
|---|---|
| DOM parsing fails (field not found) | Leave field blank, still attempt save with partial data, log locally for debugging |
| Google API call fails (network, quota, auth) | Show error toast ("Couldn't save — try again"), do not silently fail |
| OAuth token expired/revoked | Prompt reconnect flow via Settings |
| User not on a job detail page | Save button does not render at all |
| Sheet deleted/inaccessible after being connected | Detect failed write (403/404), prompt user to reconnect a sheet in Settings |

---

## 10. Performance Considerations

- Content script should not degrade LinkedIn page load — DOM observation should use lightweight `MutationObserver` scoped to the job detail container, not polling
- Dedup cache lookups happen client-side (fast) before any network call
- Sheets API calls are async and non-blocking to the UI

---

## 11. Security & Privacy

- No job data or user data is transmitted to any server other than Google's own APIs
- OAuth token stored only in Chrome's secure identity storage, never in plain `localStorage`
- Extension requests the minimum necessary scopes
- No tracking/analytics SDK collecting job search behavior in v1 (if added later, must be disclosed in privacy policy and Chrome Web Store listing)

---

## 12. Out of Scope (Technical)

- No LinkedIn API integration
- No backend server, database, or hosting infrastructure
- No support for browsers without `chrome.identity` support in current phase
- No offline queueing of saves (requires active network connection to write to Sheets)
