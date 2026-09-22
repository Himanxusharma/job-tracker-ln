/**
 * Job Tracker LN - Google Sheets API Client (v4)
 * Handles sheet creation, header formatting, dropdown data validation,
 * row appending, row deletion (undo), and dedup cache synchronization.
 */

import { normalizeJobUrl } from '../utils/url-normalizer.js';

const STATUS_OPTIONS = [
  'Saved',
  'Applied',
  'Interview',
  'Offer',
  'Accepted',
  'Rejected',
  'Archived'
];

const HEADERS = [
  'Date Saved',
  'Role',
  'Company',
  'Location',
  'Job Link',
  'Status',
  'Notes',
  'Company URL'
];

/**
 * Helper to make authenticated requests to Google APIs.
 */
async function sheetsFetch(url, token, options = {}) {
  const headers = {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  const response = await fetch(url, {
    ...options,
    headers
  });

  const text = await response.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {
    // raw text
  }

  if (!response.ok) {
    let errorMsg = json?.error?.message;
    if (response.status === 401) {
      errorMsg = 'Google authentication session expired. Please reconnect in extension settings.';
    } else if (response.status === 403) {
      errorMsg = 'Access denied. Make sure your Google account has editor permissions for this spreadsheet.';
    } else if (response.status === 404) {
      errorMsg = 'Google Sheet not found (404). It may have been deleted or moved. Please connect or create a sheet in settings.';
    } else if (response.status === 429) {
      errorMsg = 'Google Sheets rate limit exceeded. Please wait a few seconds and try again.';
    } else if (!errorMsg) {
      errorMsg = `Google Sheets API Error (${response.status}): ${text.slice(0, 100)}`;
    }

    const error = new Error(errorMsg);
    error.status = response.status;
    error.details = json?.error;
    throw error;
  }

  return json;
}

/**
 * Creates a new dedicated Google Sheet for Job Tracker LN.
 * Includes formatted headers, frozen top row, and Status dropdown validation.
 */
export async function createJobTrackerSheet(token) {
  const sheetBody = {
    properties: {
      title: 'Job Tracker LN'
    },
    sheets: [
      {
        properties: {
          title: 'Jobs',
          gridProperties: {
            frozenRowCount: 1,
            columnCount: 8
          }
        }
      }
    ]
  };

  const createdSheet = await sheetsFetch(
    'https://sheets.googleapis.com/v4/spreadsheets',
    token,
    {
      method: 'POST',
      body: JSON.stringify(sheetBody)
    }
  );

  const sheetId = createdSheet.spreadsheetId;
  const sheetUrl = createdSheet.spreadsheetUrl;
  const tabId = createdSheet.sheets[0].properties.sheetId;

  // Setup headers, colors, and dropdown validation via batchUpdate
  const batchUpdateRequest = {
    requests: [
      // 1. Write Header Row values
      {
        pasteData: {
          data: HEADERS.join(','),
          type: 'PASTE_NORMAL',
          delimiter: ',',
          coordinate: {
            sheetId: tabId,
            rowIndex: 0,
            columnIndex: 0
          }
        }
      },
      // 2. Format Header Row (LinkedIn Blue #0A66C2, Bold White Text)
      {
        repeatCell: {
          range: {
            sheetId: tabId,
            startRowIndex: 0,
            endRowIndex: 1,
            startColumnIndex: 0,
            endColumnIndex: 8
          },
          cell: {
            userEnteredFormat: {
              backgroundColor: {
                red: 10 / 255,
                green: 102 / 255,
                blue: 194 / 255
              },
              textFormat: {
                foregroundColor: { red: 1, green: 1, blue: 1 },
                bold: true,
                fontSize: 11
              },
              horizontalAlignment: 'CENTER'
            }
          },
          fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
        }
      },
      // 3. Set Status Column Data Validation Dropdown (Column F = index 5)
      {
        setDataValidation: {
          range: {
            sheetId: tabId,
            startRowIndex: 1,
            startColumnIndex: 5,
            endColumnIndex: 6
          },
          rule: {
            condition: {
              type: 'ONE_OF_LIST',
              values: STATUS_OPTIONS.map(opt => ({ userEnteredValue: opt }))
            },
            inputMessage: 'Select current application status',
            strict: true,
            showCustomUi: true
          }
        }
      },
      // 4. Set Column Widths for comfortable readability
      {
        updateDimensionProperties: {
          range: {
            sheetId: tabId,
            dimension: 'COLUMNS',
            startIndex: 0,
            endIndex: 1
          },
          properties: { pixelSize: 130 },
          fields: 'pixelSize'
        }
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: tabId,
            dimension: 'COLUMNS',
            startIndex: 1,
            endIndex: 4
          },
          properties: { pixelSize: 190 },
          fields: 'pixelSize'
        }
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: tabId,
            dimension: 'COLUMNS',
            startIndex: 4,
            endIndex: 5
          },
          properties: { pixelSize: 240 },
          fields: 'pixelSize'
        }
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: tabId,
            dimension: 'COLUMNS',
            startIndex: 5,
            endIndex: 7
          },
          properties: { pixelSize: 140 },
          fields: 'pixelSize'
        }
      },
      {
        updateDimensionProperties: {
          range: {
            sheetId: tabId,
            dimension: 'COLUMNS',
            startIndex: 7,
            endIndex: 8
          },
          properties: { pixelSize: 220 },
          fields: 'pixelSize'
        }
      }
    ]
  };

  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
    token,
    {
      method: 'POST',
      body: JSON.stringify(batchUpdateRequest)
    }
  );

  return {
    sheetId,
    sheetUrl,
    sheetTitle: 'Job Tracker LN'
  };
}

/**
 * Appends a job posting to the sheet.
 */
export async function appendJobRow(token, sheetId, jobData) {
  // Format Date: e.g. "Sep 23, 2026"
  const now = new Date(jobData.dateSaved || Date.now());
  const dateFormatted = now.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  const rowValues = [
    dateFormatted,
    jobData.role || '',
    jobData.company || '',
    jobData.location || '',
    jobData.jobLink || '',
    jobData.status || 'Saved',
    jobData.notes || '',
    jobData.companyUrl || ''
  ];

  // Use OVERWRITE so it writes into existing empty grid rows without inheriting header styling
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/A:H:append?valueInputOption=USER_ENTERED&insertDataOption=OVERWRITE`;
  const result = await sheetsFetch(url, token, {
    method: 'POST',
    body: JSON.stringify({
      values: [rowValues]
    })
  });

  // Extract appended row number from updatedRange (e.g., "'Jobs'!A2:H2")
  let rowIndex = null;
  const updatedRange = result.updates?.updatedRange || '';
  const match = updatedRange.match(/!A(\d+):/i);
  if (match && match[1]) {
    rowIndex = parseInt(match[1], 10);
  }

  // Ensure data row has clean styling (white background, dark readable text, normal weight) and dropdown validation
  if (rowIndex && rowIndex >= 2) {
    try {
      const meta = await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, token);
      const tabProp = meta.sheets?.[0]?.properties;
      const tabId = tabProp?.sheetId || 0;
      const currentCols = tabProp?.gridProperties?.columnCount || 0;

      const requests = [];

      // If sheet only had 7 columns from older version, expand to 8 and set Company URL header
      if (currentCols < 8) {
        requests.push({
          updateSheetProperties: {
            properties: {
              sheetId: tabId,
              gridProperties: { columnCount: 8 }
            },
            fields: 'gridProperties.columnCount'
          }
        });
        requests.push({
          pasteData: {
            data: 'Company URL',
            type: 'PASTE_NORMAL',
            delimiter: ',',
            coordinate: {
              sheetId: tabId,
              rowIndex: 0,
              columnIndex: 7
            }
          }
        });
        requests.push({
          updateDimensionProperties: {
            range: {
              sheetId: tabId,
              dimension: 'COLUMNS',
              startIndex: 7,
              endIndex: 8
            },
            properties: { pixelSize: 220 },
            fields: 'pixelSize'
          }
        });
      }

      await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, token, {
        method: 'POST',
        body: JSON.stringify({
          requests: [
            ...requests,
            {
              repeatCell: {
                range: {
                  sheetId: tabId,
                  startRowIndex: rowIndex - 1,
                  endRowIndex: rowIndex,
                  startColumnIndex: 0,
                  endColumnIndex: 8
                },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 1, green: 1, blue: 1 },
                    textFormat: {
                      foregroundColor: { red: 17 / 255, green: 24 / 255, blue: 39 / 255 },
                      bold: false,
                      fontSize: 10
                    },
                    horizontalAlignment: 'LEFT',
                    verticalAlignment: 'MIDDLE'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
              }
            },
            {
              setDataValidation: {
                range: {
                  sheetId: tabId,
                  startRowIndex: rowIndex - 1,
                  endRowIndex: rowIndex,
                  startColumnIndex: 5,
                  endColumnIndex: 6
                },
                rule: {
                  condition: {
                    type: 'ONE_OF_LIST',
                    values: STATUS_OPTIONS.map(opt => ({ userEnteredValue: opt }))
                  },
                  inputMessage: 'Select current application status',
                  strict: false,
                  showCustomUi: true
                }
              }
            }
          ]
        })
      });
    } catch (fmtErr) {
      console.warn('Row format batchUpdate non-fatal warning:', fmtErr);
    }
  }

  return {
    success: true,
    updatedRange,
    rowIndex
  };
}

/**
 * Removes a row by row index (1-based), used for the 5-second Undo feature.
 */
export async function deleteJobRow(token, sheetId, rowIndex) {
  if (!rowIndex || rowIndex < 2) {
    throw new Error('Invalid row index for deletion');
  }

  // Get first sheet tab ID
  const meta = await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, token);
  const tabId = meta.sheets[0].properties.sheetId;

  const deleteRequest = {
    requests: [
      {
        deleteDimension: {
          range: {
            sheetId: tabId,
            dimension: 'ROWS',
            startIndex: rowIndex - 1, // 0-based inclusive
            endIndex: rowIndex        // 0-based exclusive
          }
        }
      }
    ]
  };

  await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
    token,
    {
      method: 'POST',
      body: JSON.stringify(deleteRequest)
    }
  );

  return { success: true };
}

/**
 * Verifies and configures an existing user-provided sheet.
 */
export async function verifyAndSetupSheet(token, sheetId) {
  const meta = await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=properties.title,sheets.properties`, token);
  const sheetTitle = meta.properties.title || 'Connected Sheet';
  const tabId = meta.sheets[0].properties.sheetId;
  const tabTitle = meta.sheets[0].properties.title;

  // Check top row
  const valuesRes = await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabTitle)}!A1:G1`, token);
  const row1 = valuesRes.values?.[0] || [];

  const hasHeaders = row1.length >= 5 && row1.some(c => /role|job|title|company/i.test(String(c)));

  if (!hasHeaders) {
    // Inject headers and formatting if empty
    const batchUpdateRequest = {
      requests: [
        {
          pasteData: {
            data: HEADERS.join(','),
            type: 'PASTE_NORMAL',
            delimiter: ',',
            coordinate: {
              sheetId: tabId,
              rowIndex: 0,
              columnIndex: 0
            }
          }
        },
        {
          setDataValidation: {
            range: {
              sheetId: tabId,
              startRowIndex: 1,
              startColumnIndex: 5,
              endColumnIndex: 6
            },
            rule: {
              condition: {
                type: 'ONE_OF_LIST',
                values: STATUS_OPTIONS.map(opt => ({ userEnteredValue: opt }))
              },
              inputMessage: 'Select current application status',
              strict: true,
              showCustomUi: true
            }
          }
        }
      ]
    };

    await sheetsFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
      token,
      {
        method: 'POST',
        body: JSON.stringify(batchUpdateRequest)
      }
    );
  }

  // Always ensure clean data formatting and dropdown validation across existing rows
  await repairSheetFormatting(token, sheetId);

  return {
    sheetId,
    sheetUrl: `https://docs.google.com/spreadsheets/d/${sheetId}/edit`,
    sheetTitle
  };
}

/**
 * Repairs sheet formatting: ensures row 1 is blue header, and rows 2..end
 * are clean data rows with working Status dropdown validation.
 */
export async function repairSheetFormatting(token, sheetId) {
  try {
    const meta = await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, token);
    const tabProp = meta.sheets?.[0]?.properties;
    const tabId = tabProp?.sheetId || 0;
    const currentCols = tabProp?.gridProperties?.columnCount || 0;

    const requests = [];

    // Ensure at least 8 columns in the sheet grid
    if (currentCols < 8) {
      requests.push({
        updateSheetProperties: {
          properties: {
            sheetId: tabId,
            gridProperties: { columnCount: 8 }
          },
          fields: 'gridProperties.columnCount'
        }
      });
    }

    // 1. Ensure all 8 header values are set
    requests.push({
      pasteData: {
        data: HEADERS.join(','),
        type: 'PASTE_NORMAL',
        delimiter: ',',
        coordinate: {
          sheetId: tabId,
          rowIndex: 0,
          columnIndex: 0
        }
      }
    });

    // 2. Format Header Row 1 (LinkedIn Blue #0A66C2, Bold White Text, Centered)
    requests.push({
      repeatCell: {
        range: {
          sheetId: tabId,
          startRowIndex: 0,
          endRowIndex: 1,
          startColumnIndex: 0,
          endColumnIndex: 8
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: {
              red: 10 / 255,
              green: 102 / 255,
              blue: 194 / 255
            },
            textFormat: {
              foregroundColor: { red: 1, green: 1, blue: 1 },
              bold: true,
              fontSize: 11
            },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    });

    // 3. Format Data Rows (Rows 2..500) with clean white background and dark text
    requests.push({
      repeatCell: {
        range: {
          sheetId: tabId,
          startRowIndex: 1,
          endRowIndex: 500,
          startColumnIndex: 0,
          endColumnIndex: 8
        },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 1, green: 1, blue: 1 },
            textFormat: {
              foregroundColor: { red: 17 / 255, green: 24 / 255, blue: 39 / 255 },
              bold: false,
              fontSize: 10
            },
            horizontalAlignment: 'LEFT',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    });

    // 4. Apply Status dropdown validation across all data rows (Column F = index 5, rows 2..500)
    requests.push({
      setDataValidation: {
        range: {
          sheetId: tabId,
          startRowIndex: 1,
          endRowIndex: 500,
          startColumnIndex: 5,
          endColumnIndex: 6
        },
        rule: {
          condition: {
            type: 'ONE_OF_LIST',
            values: STATUS_OPTIONS.map(opt => ({ userEnteredValue: opt }))
          },
          inputMessage: 'Select current application status',
          strict: false,
          showCustomUi: true
        }
      }
    });

    // 5. Ensure column width for Column H (Company URL)
    requests.push({
      updateDimensionProperties: {
        range: {
          sheetId: tabId,
          dimension: 'COLUMNS',
          startIndex: 7,
          endIndex: 8
        },
        properties: { pixelSize: 220 },
        fields: 'pixelSize'
      }
    });

    await sheetsFetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`,
      token,
      {
        method: 'POST',
        body: JSON.stringify({ requests })
      }
    );
  } catch (err) {
    console.warn('repairSheetFormatting non-fatal warning:', err);
  }
}

/**
 * Reads all existing jobs from the connected sheet to initialize/sync local dedup cache.
 */
export async function fetchAllSheetJobs(token, sheetId) {
  const meta = await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, token);
  const tabTitle = meta.sheets[0].properties.title;

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(tabTitle)}!A2:H`;
  const result = await sheetsFetch(url, token);
  const rows = result.values || [];

  const jobMap = {};
  rows.forEach((row, idx) => {
    const dateSaved = row[0] || '';
    const role = row[1] || '';
    const company = row[2] || '';
    const location = row[3] || '';
    const jobLink = (row[4] || '').trim();
    const status = row[5] || 'Saved';
    const notes = row[6] || '';
    const companyUrl = row[7] || '';
    const rowIndex = idx + 2;

    if (jobLink) {
      const canonicalKey = normalizeJobUrl(jobLink) || jobLink;
      jobMap[canonicalKey] = {
        dateSaved,
        role,
        company,
        companyUrl,
        location,
        status,
        notes,
        rowIndex,
        jobLink: canonicalKey
      };
    }
  });

  return jobMap;
}

/**
 * Updates Status and Notes for a specific job row.
 */
export async function updateJobStatusAndNotes(token, sheetId, rowIndex, status, notes, jobLink = '') {
  const meta = await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties`, token);
  const tabTitle = meta.sheets[0].properties.title;

  let targetRow = rowIndex;

  // Fallback: If rowIndex is not provided or outdated, look up by jobLink
  if (!targetRow && jobLink) {
    const existingJobs = await fetchAllSheetJobs(token, sheetId);
    if (existingJobs[jobLink] && existingJobs[jobLink].rowIndex) {
      targetRow = existingJobs[jobLink].rowIndex;
    }
  }

  if (!targetRow || targetRow < 2) {
    throw new Error('Could not determine target row for update in Google Sheets.');
  }

  const range = `${encodeURIComponent(tabTitle)}!F${targetRow}:G${targetRow}`;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?valueInputOption=USER_ENTERED`;

  await sheetsFetch(url, token, {
    method: 'PUT',
    body: JSON.stringify({
      range,
      majorDimension: 'ROWS',
      values: [[status || 'Saved', notes || '']]
    })
  });

  return { success: true, rowIndex: targetRow };
}
