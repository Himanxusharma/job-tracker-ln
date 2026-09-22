# Job Tracker LN

A lightweight Chrome extension that saves LinkedIn job postings directly into your own Google Sheet — with one click, no copy-pasting, no third-party database, no cost.

---

## What it does

While browsing job listings on LinkedIn, a floating **Save Job** button appears on the job detail view. Clicking it captures the job's core details (Role, Company, Location, Job Link) and appends them as a new row in a Google Sheet that you own and control. You track application status (Saved, Applied, Interview, Offer, Accepted, Rejected, Archived) manually in the sheet using a built-in dropdown.

No LinkedIn API access is used. No backend server is used. No user data is stored anywhere except the user's own Google Sheet.

---

## Why it exists

Job searching involves juggling dozens of open tabs, bookmarks, and half-remembered application statuses. Job Tracker LN removes the friction of manually copying job details into a spreadsheet, while keeping the user in full ownership of their data (a Google Sheet, not a locked proprietary dashboard).

---

## Core Features

- ✅ One-click save from any LinkedIn job detail page (sleek 32px button alongside Apply & Save)
- ✅ Auto-captures Role, Company, Location, Job Link, Date Saved, and Canonical Company LinkedIn URL
- ✅ Writes directly to the user's own Google Sheet (via Google OAuth 2.0)
- ✅ Two-way Sheet Sync: live manual refresh pulls edits and purges rows deleted directly in Google Sheets
- ✅ Keyboard shortcut (`Alt+S` or `Option+S`) for rapid 1-press saving
- ✅ Duplicate detection (won't create a second row for a job already saved)
- ✅ Status tracking via dropdown: Saved → Applied → Interview → Offer → Accepted / Rejected / Archived
- ✅ Quick Notes & Status popover directly on LinkedIn
- ✅ Auto-detects "Easy Apply" submissions and updates stage to `Applied`
- ✅ Interactive Pipeline Funnel, Conversion Rate analytics, and Instant Fuzzy Search in popup
- ✅ 1-Click CSV data export
- ✅ 5-second undo toast immediately after saving
- ✅ Zero cost — no paid tier, no backend, no external API dependency

---

## Tech Approach (Summary)

| Layer | Approach |
|---|---|
| Job data capture | Resilient content script DOM parser (handles modern obfuscated LinkedIn classes) |
| Save trigger | Injected 32px pill button in the native action bar + `Alt+S` shortcut |
| Storage | User's own Google Sheet, written via Google Sheets API v4 |
| Auth | Google OAuth 2.0 via `chrome.identity` (direct to Google) |
| Backend | None — 100% client-side serverless extension |

---

## Sheet Schema (8 Columns)

| Column | Header | Description |
|---|---|---|
| A | Date Saved | Auto-timestamp on save (`YYYY-MM-DD HH:mm`) |
| B | Role | Extracted job title |
| C | Company | Extracted company name |
| D | Location | Clean location (e.g. `Gurugram, India (On-site)`) |
| E | Job Link | Normalized canonical job URL (`https://www.linkedin.com/jobs/view/<id>/`) |
| F | Status | Dropdown: `Saved`, `Applied`, `Interview`, `Offer`, `Accepted`, `Rejected`, `Archived` |
| G | Notes | Custom user notes (referrals, salary, recruiter info) |
| H | Company URL | Canonical LinkedIn company profile link (`https://www.linkedin.com/company/<slug>/`) |

---

## Project Documents

- [`Docs/PRD.md`](./Docs/PRD.md) — Product Requirements Document (what we're building and why)
- [`Docs/TRD.md`](./Docs/TRD.md) — Technical Requirements Document (how it's built)
- [`Docs/FRD.md`](./Docs/FRD.md) — Functional Requirements Document (detailed feature-by-feature behavior)
- [`CHROMEWEBSTORE.md`](./CHROMEWEBSTORE.md) — Chrome Web Store submission & compliance package

---

## Status

🚀 Production Ready — Manifest V3 compliant, 100% pass rate on test suites (172/172 checks). Tested on modern LinkedIn responsive layouts.

---

## Disclaimer

This extension is an independent utility and is not affiliated with, endorsed by, or connected to LinkedIn Corporation. It reads publicly visible page content in the user's own browser session and does not use LinkedIn's official API.
