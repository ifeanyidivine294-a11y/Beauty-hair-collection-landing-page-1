/**
 * Google Sheets Integration for Beauty Hair Collection — Customer Leads
 */

const SPREADSHEET_TITLE = 'BEAUTY HAIR COLLECTION — CUSTOMER LEADS';
const EXPECTED_COLUMNS = [
  'Lead ID',
  'Full Name',
  'Email Address',
  'Phone Number',
  'Submission Date',
  'Submission Time',
  'Lead Source',
  'Submission Status'
];

export interface LeadSubmission {
  fullName: string;
  email: string;
  phone: string;
  leadSource?: string;
}

export interface StoredLead extends LeadSubmission {
  leadId: string;
  submissionDate: string;
  submissionTime: string;
  syncedToSheets: boolean;
}

// Local persistence key
const LOCAL_LEADS_KEY = 'bhc_leads_storage';

export const getStoredLeads = (): StoredLead[] => {
  try {
    const raw = localStorage.getItem(LOCAL_LEADS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLeadLocally = (lead: StoredLead) => {
  try {
    const existing = getStoredLeads();
    existing.unshift(lead);
    localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(existing));
  } catch (err) {
    console.warn('Could not save lead to localStorage:', err);
  }
};

export const markLeadSynced = (leadId: string) => {
  try {
    const existing = getStoredLeads();
    const updated = existing.map(l => l.leadId === leadId ? { ...l, syncedToSheets: true } : l);
    localStorage.setItem(LOCAL_LEADS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Could not update lead in localStorage:', err);
  }
};

// Find existing spreadsheet by title in user's Google Drive
export const findOrCreateSpreadsheet = async (accessToken: string): Promise<{ id: string; url: string }> => {
  try {
    // 1. Search Google Drive for an existing spreadsheet with title
    const searchUrl = `https://www.googleapis.com/drive/v3/files?q=(name%3D'${encodeURIComponent(
      SPREADSHEET_TITLE
    )}'+or+name%3D'${encodeURIComponent(
      'Beauty Hair Collection — Customer Leads'
    )}')+and+mimeType%3D'application/vnd.google-apps.spreadsheet'+and+trashed%3Dfalse&fields=files(id,name,webViewLink)`;

    const searchRes = await fetch(searchUrl, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    if (searchRes.ok) {
      const searchData = await searchRes.json();
      if (searchData.files && searchData.files.length > 0) {
        const file = searchData.files[0];
        return {
          id: file.id,
          url: file.webViewLink || `https://docs.google.com/spreadsheets/d/${file.id}/edit`
        };
      }
    }

    // 2. Not found, create a new spreadsheet with the required columns
    const createUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
    const createRes = await fetch(createUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        properties: {
          title: SPREADSHEET_TITLE
        },
        sheets: [
          {
            properties: {
              title: 'Customer Leads',
              gridProperties: {
                frozenRowCount: 1
              }
            },
            data: [
              {
                startRow: 0,
                startColumn: 0,
                rowData: [
                  {
                    values: EXPECTED_COLUMNS.map(col => ({
                      userEnteredValue: { stringValue: col },
                      userEnteredFormat: {
                        textFormat: { bold: true, fontSize: 11, foregroundColorStyle: { rgbColor: { red: 0.22, green: 0.15, blue: 0.20 } } },
                        backgroundColorStyle: { rgbColor: { red: 0.97, green: 0.91, blue: 0.93 } }
                      }
                    }))
                  }
                ]
              }
            ]
          }
        ]
      })
    });

    if (!createRes.ok) {
      const errData = await createRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Failed to create spreadsheet (${createRes.status})`);
    }

    const newSheet = await createRes.json();
    return {
      id: newSheet.spreadsheetId,
      url: newSheet.spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${newSheet.spreadsheetId}/edit`
    };
  } catch (error) {
    console.error('Error finding or creating Google spreadsheet:', error);
    throw error;
  }
};

// Append a new lead as a row in the spreadsheet
export const appendLeadToGoogleSheet = async (
  accessToken: string,
  spreadsheetId: string,
  lead: LeadSubmission
): Promise<{ success: boolean; leadId: string; updatedRange?: string }> => {
  const now = new Date();
  
  // Format Lead ID: e.g. BHC-LEAD-20261111-9842
  const randomSuffix = Math.floor(1000 + Math.random() * 9000);
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const leadId = `BHC-LEAD-${dateStr}-${randomSuffix}`;

  const submissionDate = now.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });

  const submissionTime = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const rowValues = [
    leadId,
    lead.fullName.trim(),
    lead.email.trim(),
    lead.phone.trim(),
    submissionDate,
    submissionTime,
    lead.leadSource || 'Landing Page (Free Wig Buying Guide)',
    'Verified (Active Lead)'
  ];

  const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A1:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`;

  const response = await fetch(appendUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      values: [rowValues]
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `Failed to append lead to Google Sheet (${response.status})`);
  }

  const result = await response.json();
  return {
    success: true,
    leadId,
    updatedRange: result.updates?.updatedRange
  };
};
