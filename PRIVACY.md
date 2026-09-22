# Privacy Policy for Job Tracker LN

**Last updated:** September 23, 2026

**Job Tracker LN** ("we", "our", or "the extension") is a privacy-first browser extension designed to help job seekers save and manage LinkedIn job listings directly in their own Google Sheet.

We believe that your personal job search data belongs solely to you. This Privacy Policy outlines our principles and clarifies that **we do not collect, sell, or transmit your personal data to any external server or third party.**

---

## 1. Single Purpose Declaration
The sole purpose of Job Tracker LN is to allow users to capture publicly visible job information (such as job title, company name, location, and URL) from LinkedIn job postings and record them into a private Google Sheets document owned and controlled by the user.

---

## 2. Data We Access and How It Is Used

When you use Job Tracker LN, the extension interacts with the following information:

| Data Type | Purpose | Storage Location |
|---|---|---|
| **LinkedIn Job Posting Details** (Role, Company, Location, Job URL) | Extracted only when you click "Save Job" or trigger the save keyboard shortcut (`Alt+S`). | Appended directly as a row in your personal Google Sheet. |
| **Google Sheet ID & Settings** | Allows the extension to know which Google Sheet to write to. | Stored locally in your browser via `chrome.storage.local`. |
| **Local URL Deduplication Cache** | Prevents duplicate saves by keeping an index of previously saved URLs. | Stored locally in your browser via `chrome.storage.local`. |
| **Google OAuth 2.0 Access Token** | Used to authorize direct write requests to the Google Sheets API v4. | Managed securely by Google's `chrome.identity` API in your browser session. |

---

## 3. Data Storage & Ownership (100% Client-Side)
- **No External Servers:** Job Tracker LN has **no backend servers, databases, or analytics engines**.
- **Direct-to-Google Communication:** All data transmissions occur strictly between your web browser and official Google APIs (`https://sheets.googleapis.com/*`).
- **You Own Your Data:** Your job listings reside entirely within your own Google account. We have zero access to your Google account, your spreadsheets, or your LinkedIn profile.

---

## 4. Third-Party Services
Job Tracker LN integrates directly with:
- **Google Sheets API v4:** Subject to [Google's Privacy Policy](https://policies.google.com/privacy). We only request the minimum permission (`https://www.googleapis.com/auth/spreadsheets`) required to create and update the Job Tracker spreadsheet you authorize.
- **LinkedIn:** The extension reads visible DOM elements on LinkedIn job pages in your active browser session. It does not access private LinkedIn messages, connections, or account credentials.

---

## 5. Telemetry & Tracking
- **No Analytics:** We do not use Google Analytics, Mixpanel, Sentry, or any tracking telemetry.
- **No Cookies:** We do not set or read any tracking cookies.
- **No Advertising:** We do not display ads or monetize user data in any way.

---

## 6. User Control & Data Deletion
- **Export Data:** You can export your saved data anytime via the **1-Click CSV Export** button in the extension popup, or directly through Google Sheets.
- **Delete Data:** You can delete rows directly in Google Sheets, use the **Undo** button within 5 seconds of saving, or click **Disconnect Sheet** in the extension settings to wipe all local cache.
- **Revoke Access:** You can revoke the extension's access to your Google account at any time at [Google Account Permissions](https://myaccount.google.com/permissions).

---

## 7. Contact
If you have any questions or feedback regarding this Privacy Policy or Job Tracker LN, please open an issue on the official GitHub repository:
- **GitHub Repository:** [https://github.com/Himanxusharma/job-tracker-ln](https://github.com/Himanxusharma/job-tracker-ln)
