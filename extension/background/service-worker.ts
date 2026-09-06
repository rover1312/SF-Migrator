// Background Service Worker for SF-Migrator Extension
// Handles OAuth callbacks, API requests, and communication between popup/options

chrome.runtime.onInstalled.addListener((details) => {
  console.log('SF-Migrator extension installed', details);
  
  // Set default migration count
  chrome.storage.local.set({ migrationCount: 0 });
});

// Handle OAuth redirect
chrome.identity.onRedirectReceived.addListener((details) => {
  const url = new URL(details.url);
  const hashParams = new URLSearchParams(url.hash.substring(1));
  
  const accessToken = hashParams.get('access_token');
  const refreshToken = hashParams.get('refresh_token');
  const instanceUrl = hashParams.get('instance_url');
  
  if (accessToken) {
    // Store tokens securely
    chrome.storage.local.set({
      salesforceAccessToken: accessToken,
      salesforceRefreshToken: refreshToken,
      salesforceInstanceUrl: instanceUrl,
    });
    
    // Notify the options page
    chrome.runtime.sendMessage({
      type: 'OAUTH_SUCCESS',
      payload: { accessToken, refreshToken, instanceUrl },
    });
  } else {
    chrome.runtime.sendMessage({
      type: 'OAUTH_ERROR',
      payload: { error: 'Failed to obtain access token' },
    });
  }
});

// Handle messages from popup or options page
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Message received:', message);
  
  switch (message.type) {
    case 'GET_STORED_CREDENTIALS':
      chrome.storage.local.get([
        'salesforceAccessToken',
        'salesforceRefreshToken',
        'salesforceInstanceUrl',
      ], (result) => {
        sendResponse(result);
      });
      return true; // Keep channel open for async response
    
    case 'CLEAR_CREDENTIALS':
      chrome.storage.local.remove([
        'salesforceAccessToken',
        'salesforceRefreshToken',
        'salesforceInstanceUrl',
      ], () => {
        sendResponse({ success: true });
      });
      return true;
    
    case 'OPEN_SALESFORCE_OAUTH':
      handleOAuthLogin(message.payload)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ error: error.message }));
      return true;
    
    case 'MAKE_SALESFORCE_REQUEST':
      makeSalesforceRequest(message.payload)
        .then((result) => sendResponse(result))
        .catch((error) => sendResponse({ error: error.message }));
      return true;
    
    default:
      sendResponse({ error: 'Unknown message type' });
  }
});

// Handle OAuth login flow
async function handleOAuthLogin(payload: { loginUrl: string; clientId: string; redirectUri: string }) {
  const { loginUrl, clientId, redirectUri } = payload;
  
  const authUrl = `${loginUrl}/services/oauth2/authorize` +
    `?response_type=token` +
    `&client_id=${clientId}` +
    `&redirect_uri=${redirectUri}` +
    `&scope=full refresh_token`;
  
  try {
    const redirectUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl,
      interactive: true,
    });
    
    return { success: true, redirectUrl };
  } catch (error) {
    throw new Error(`OAuth flow failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Make authenticated request to Salesforce
async function makeSalesforceRequest(payload: { endpoint: string; method?: string; body?: any }) {
  const { endpoint, method = 'GET', body } = payload;
  
  // Get stored credentials
  const credentials = await new Promise<any>((resolve) => {
    chrome.storage.local.get([
      'salesforceAccessToken',
      'salesforceInstanceUrl',
    ], resolve);
  });
  
  if (!credentials.salesforceAccessToken || !credentials.salesforceInstanceUrl) {
    throw new Error('No Salesforce credentials found. Please authenticate first.');
  }
  
  const url = `${credentials.salesforceInstanceUrl}${endpoint}`;
  
  const response = await fetch(url, {
    method,
    headers: {
      'Authorization': `Bearer ${credentials.salesforceAccessToken}`,
      'Content-Type': 'application/json',
      ...(method !== 'GET' && body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`Salesforce API error: ${response.status} - ${errorData.message || response.statusText}`);
  }
  
  return response.json();
}

// Periodic token refresh (if needed)
chrome.alarms?.create('refreshToken', { periodInMinutes: 30 });

chrome.alarms?.onAlarm.addListener((alarm) => {
  if (alarm.name === 'refreshToken') {
    // Check if token needs refresh and refresh if necessary
    // This would be implemented based on your specific requirements
    console.log('Checking for token refresh...');
  }
});
