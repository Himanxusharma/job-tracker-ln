# Functional Requirements Document (FRD)
## Job Tracker LN

**Version:** 1.0
**Status:** Draft
**Last Updated:** September 23, 2026

---

## 1. Purpose

This document defines the detailed functional behavior of each feature in Job Tracker LN v1, to guide implementation and QA.

---

## 2. Feature: Floating "Save Job" Button

### FR-1.1
The extension SHALL display a floating "Save Job" button on any LinkedIn URL matching a job detail view (e.g., `linkedin.com/jobs/view/*`).

### FR-1.2
The button SHALL NOT appear on LinkedIn pages that are not job detail views (e.g., feed, messaging, profile pages, job search list view without an opened detail).

### FR-1.3
The button SHALL be positioned so it does not obstruct core LinkedIn page elements (e.g., bottom-right corner, fixed position).

### FR-1.4
If the user has not connected a Google Sheet in Settings, clicking the button SHALL prompt the user to complete setup instead of attempting a save.

---

## 3. Feature: Job Data Capture

### FR-2.1
On button click, the extension SHALL extract the following fields from the current page:
- Role (job title)
- Company name
- Location
- Job Link (canonical URL of the posting)

### FR-2.2
The extension SHALL auto-generate a Date Saved value at the time of click (client-side timestamp).

### FR-2.3
If a field cannot be parsed from the page, the extension SHALL leave that field blank rather than omit the save entirely or guess a value.

### FR-2.4
The extension SHALL NOT capture any field not explicitly listed in FR-2.1/FR-2.2 (no salary, no recruiter info, no description text) in v1 scope.

---

## 4. Feature: Duplicate Detection

### FR-3.1
Before writing a new row, the extension SHALL check whether the current Job Link already exists in the connected sheet (via local cache, per TRD §5).

### FR-3.2
If a duplicate is found, the extension SHALL NOT create a new row, and SHALL instead show the user a toast indicating the job was already saved, including its current Status value.

### FR-3.3
Duplicate matching SHALL be based on a normalized Job Link (tracking parameters stripped) to avoid false negatives caused by URL query string variations.

---

## 5. Feature: Save Confirmation & Undo

### FR-4.1
On successful save, the extension SHALL display a toast confirming the save, including the Role and Company captured.

### FR-4.2
The confirmation toast SHALL include an "Undo" action, available for a fixed window after save (e.g., 5 seconds).

### FR-4.3
If "Undo" is clicked within the window, the extension SHALL remove the corresponding row from the connected Google Sheet and update the local dedup cache accordingly.

### FR-4.4
If the save fails (network/API error), the extension SHALL show an error toast and SHALL NOT show a false-positive success confirmation.

---

## 6. Feature: Google Sheet Connection (Settings)

### FR-5.1
The Settings page SHALL display the currently connected Google Sheet (shown as a link/URL).

### FR-5.2
The Settings page SHALL provide an "Edit" action allowing the user to change the connected sheet.

### FR-5.3
The Settings page SHALL provide a direct "open sheet" shortcut (external link icon) to view the sheet in a new tab.

### FR-5.4
The Settings page SHALL provide a "Log out" action that revokes the stored Google OAuth token and clears locally cached data.

### FR-5.5
On first-time setup (no sheet connected), the extension SHALL guide the user through either creating a new sheet or connecting an existing one.

### FR-5.6
If connecting an existing sheet that does not match the expected header schema, the extension SHALL prompt the user to confirm or adjust column mapping before enabling saves to that sheet.

---

## 7. Feature: Status Tracking

### FR-6.1
The Status column in the connected sheet SHALL be configured with a dropdown data validation containing exactly these values: `Saved, Applied, Interview, Offer, Accepted, Rejected, Archived`.

### FR-6.2
Every new row SHALL default to Status = `Saved` at time of creation.

### FR-6.3
Status updates SHALL be made by the user directly within Google Sheets (not within the extension UI) in v1.

### FR-6.4
The extension's documentation/help text SHALL clarify the intended distinction between `Rejected` (explicit "no" from employer) and `Archived` (user is no longer pursuing, no explicit rejection).

---

## 8. Feature: Supported Job Sites Display

### FR-7.1
The extension's main popup SHALL display a "Supported Job Sites" section listing currently supported platforms.

### FR-7.2
In v1, this section SHALL list LinkedIn only, with an accurate description (no reference to unsupported platforms).

---

## 9. Non-Functional Requirements

### FR-8.1 (Performance)
The Save action SHALL complete (DOM capture → API write → toast confirmation) within a reasonable perceived time (target: under 2 seconds under normal network conditions).

### FR-8.2 (Reliability)
The extension SHALL handle Google API failures gracefully without crashing the content script or leaving the page in a broken state.

### FR-8.3 (Privacy)
The extension SHALL NOT transmit any captured job data to any server other than Google's Sheets API.

### FR-8.4 (Compatibility)
The extension SHALL function on the current stable version of Chrome and SHALL comply with Manifest V3 requirements.

---

## 10. Explicit Exclusions (v1)

The following are explicitly NOT part of functional scope for this version, and SHALL NOT be implemented unless scope is revised:

- Support for Indeed, Lever, Greenhouse, or any platform other than LinkedIn
- Automatic status updates based on LinkedIn page state
- Salary, recruiter contact, or resume-version capture
- In-extension analytics/dashboard views
- Any paid or premium feature tier
- Any use of LinkedIn's official API for data capture
- Batch-saving from job list/search view (only job detail view is supported)

---

## 11. Acceptance Criteria Summary

| Feature | Acceptance Criteria |
|---|---|
| Save button | Appears only on LinkedIn job detail pages; absent elsewhere |
| Data capture | Role, Company, Location, Job Link, Date Saved populated correctly on save |
| Duplicate detection | Re-clicking save on an already-saved job does not create a second row |
| Undo | Clicking Undo within the toast window removes the row from the sheet |
| Settings | User can view, edit, and disconnect their linked sheet |
| Status dropdown | Dropdown in sheet shows exactly the 7 defined values, defaults to "Saved" |
| Data privacy | No job data observed leaving the browser except to Google's API |
