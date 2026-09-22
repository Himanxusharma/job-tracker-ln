# Product Requirements Document (PRD)
## Job Tracker LN

**Version:** 1.0
**Status:** Draft
**Owner:** Product Team
**Last Updated:** September 23, 2026

---

## 1. Overview

Job Tracker LN is a free Chrome extension that lets job seekers save LinkedIn job postings into their own Google Sheet with a single click, removing the manual effort of copy-pasting job details into a spreadsheet while job hunting.

---

## 2. Problem Statement

Job seekers actively applying to multiple roles typically rely on browser bookmarks, sticky notes, or manually maintained spreadsheets to track postings they're interested in or have applied to. This process is:

- **Time-consuming** — manually copying title, company, location, and link for every job
- **Error-prone** — details get missed, links go stale, duplicate entries happen
- **Disorganized** — no consistent view of application status across dozens of roles
- **Fragmented** — tracking lives across bookmarks, notes apps, and memory

Existing job-tracker tools often lock user data inside a proprietary dashboard, require paid subscriptions, or depend on official platform APIs that are difficult or impossible for independent developers to access (LinkedIn's official API is not practically available for this use case).

---

## 3. Goals

### 3.1 Primary Goals
- Let users save a LinkedIn job posting to a personal Google Sheet in one click
- Eliminate manual data entry for core job details
- Give users full ownership of their data (their own Google Sheet, not a proprietary database)
- Keep the tool completely free, with no backend infrastructure cost

### 3.2 Non-Goals (for this phase)
- Support for platforms other than LinkedIn (Indeed, Lever, Greenhouse are explicitly out of scope for v1)
- Automatic application-status detection
- Resume/cover letter management
- Any paid/premium tier
- Any use of LinkedIn's official API

---

## 4. Target Users

| Persona | Need |
|---|---|
| Active job seeker | Tracking many applications across roles/companies without losing track |
| Recent graduate / career changer | Needs a simple, low-effort way to stay organized without building their own system |
| Recruiter / career coach | Managing candidate-facing job pipelines lightly, without dedicated ATS tooling |

---

## 5. User Stories

1. **As a job seeker**, I want to save a job I'm viewing on LinkedIn with one click, so I don't have to manually copy its details.
2. **As a job seeker**, I want my saved jobs to go into a Google Sheet I already use, so I'm not locked into a new app.
3. **As a job seeker**, I want to be warned if I try to save a job I already saved, so my sheet doesn't fill with duplicates.
4. **As a job seeker**, I want to update a job's status (Applied, Interview, Offer, etc.) easily, so I can see my whole pipeline at a glance.
5. **As a job seeker**, I want to undo a save immediately if I clicked the wrong job, so I don't have to manually delete rows.
6. **As a user**, I want to connect my own Google Sheet once in settings, so all future saves go to the right place automatically.

---

## 6. Key Features (Scope for v1)

| Feature | Priority |
|---|---|
| Floating "Save Job" button on LinkedIn job detail pages | P0 |
| Auto-capture of Role, Company, Location, Job Link, Date Saved | P0 |
| Write to user's connected Google Sheet via OAuth | P0 |
| Duplicate detection (by Job Link) | P0 |
| Status dropdown in sheet (Saved, Applied, Interview, Offer, Accepted, Rejected, Archived) | P0 |
| Undo save (toast, short window) | P1 |
| Settings page — connect/change Google Sheet | P0 |
| Confirmation toast on save | P1 |

---

## 7. Out of Scope (v1)

- Multi-platform support (Indeed, Lever, Greenhouse)
- Salary capture
- Recruiter contact capture
- Analytics/dashboard views
- AI-based resume/job matching
- Notifications/reminders
- Paid tier of any kind

---

## 8. Success Metrics

| Metric | Target (early stage) |
|---|---|
| Extension installs | Baseline tracking, no hard target for v1 |
| % of installs that connect a Google Sheet | > 70% |
| Jobs saved per active user per week | Directional signal of usefulness |
| Duplicate-save rate (should be low, confirming dedup works) | < 5% of saves |
| Uninstall rate in first 7 days | As low as possible; monitor for friction points |

---

## 9. Constraints

- No use of LinkedIn's official API (not accessible for this use case)
- No backend server / no recurring infrastructure cost
- No paid features in current phase
- Must work within Chrome Extension Manifest V3 policies
- Must rely only on user's own Google account (OAuth) for storage

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| LinkedIn changes page DOM structure, breaking data capture | Keep content-script selectors modular and easy to patch; monitor for breakage |
| Chrome Web Store policy concerns around scraping | Ensure extension only reads visible, user-facing page content in the user's own session; no automation of LinkedIn actions |
| Users confused about Status values (e.g., Archived vs Rejected) | Add tooltip/help text clarifying each status |
| Google OAuth token issues (expiry, revocation) | Handle gracefully with reconnect prompt in Settings |

---

## 11. Open Questions

- Should the Save button appear on job list/scroll view (batch-save) in a future phase, or remain detail-view-only (current decision: detail-view-only for v1)?
- Should "Archived" vs "Rejected" have clarifying tooltip copy at launch? (Recommended: yes)
