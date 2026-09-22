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

- ✅ One-click save from any LinkedIn job detail page
- ✅ Auto-captures Role, Company, Location, Job Link, and Date Saved
- ✅ Writes directly to the user's own Google Sheet (via Google OAuth)
- ✅ Duplicate detection (won't create a second row for a job already saved)
- ✅ Status tracking via dropdown: Saved → Applied → Interview → Offer → Accepted / Rejected / Archived
- ✅ Undo option immediately after saving
- ✅ Zero cost — no paid tier, no backend, no external API dependency

---

## Tech Approach (Summary)

| Layer | Approach |
|---|---|
| Job data capture | Content script reads the LinkedIn job DOM (no LinkedIn API) |
| Save trigger | Injected floating button on the job detail page |
| Storage | User's own Google Sheet, written via Google Sheets API |
| Auth | Google OAuth (user grants access once, in Settings) |
| Backend | None — all logic runs client-side in the extension |

See `TRD.md` for full technical detail.

---

## Sheet Schema

| Column | Description |
|---|---|
| Date Saved | Auto-timestamp on save |
| Role | Job title |
| Company | Company name |
| Location | City / Remote / Hybrid |
| Job Link | URL to the posting |
| Status | Dropdown: Saved, Applied, Interview, Offer, Accepted, Rejected, Archived |
| Notes | Free text |

---

## Project Documents

- [`PRD.md`](./PRD.md) — Product Requirements Document (what we're building and why)
- [`TRD.md`](./TRD.md) — Technical Requirements Document (how it's built)
- [`FRD.md`](./FRD.md) — Functional Requirements Document (detailed feature-by-feature behavior)

---

## Status

🚧 Early build — LinkedIn-only support currently. Additional job platforms (Indeed, Lever, Greenhouse) are a potential future phase, not committed in the current scope.

---

## Disclaimer

This extension is an independent utility and is not affiliated with, endorsed by, or connected to LinkedIn Corporation. It reads publicly visible page content in the user's own browser session and does not use LinkedIn's official API.
