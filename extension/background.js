// Creative OS Extension — Background Service Worker

const COS_BASE_URL = 'http://localhost:3000';

// Auth token storage
let authToken = null;

// On install: open portal for first-time setup
chrome.runtime.onInstalled.addListener(({ reason }) => {
    if (reason === 'install') {
        chrome.tabs.create({ url: `${COS_BASE_URL}/login` });
    }
});

// Fetch auth token from Creative OS portal
async function fetchAuthToken() {
    try {
        const res = await fetch(`${COS_BASE_URL}/api/auth/extension-token`, {
            credentials: 'include',
        });
        if (!res.ok) return null;
        const data = await res.json();
        authToken = data.token;
        await chrome.storage.local.set({ authToken: data.token, expiresAt: data.expires_at });
        return data.token;
    } catch {
        return null;
    }
}

// Load token from storage on startup
chrome.runtime.onStartup.addListener(async () => {
    const stored = await chrome.storage.local.get(['authToken', 'expiresAt']);
    if (stored.authToken) {
        authToken = stored.authToken;
    }
});

// Message handler
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const handle = async () => {
        switch (message.type) {
            case 'GET_TOKEN': {
                const stored = await chrome.storage.local.get(['authToken', 'expiresAt']);
                if (!stored.authToken) {
                    const token = await fetchAuthToken();
                    sendResponse({ token });
                } else {
                    sendResponse({ token: stored.authToken });
                }
                break;
            }

            case 'LOGIN': {
                const token = await fetchAuthToken();
                sendResponse({ success: !!token });
                break;
            }

            case 'LOGOUT': {
                authToken = null;
                await chrome.storage.local.remove(['authToken', 'expiresAt']);
                sendResponse({ success: true });
                break;
            }

            case 'GET_TASKS': {
                const stored = await chrome.storage.local.get(['authToken']);
                if (!stored.authToken) {
                    sendResponse({ tasks: [], error: 'Non autenticato' });
                    break;
                }
                try {
                    const res = await fetch(`${COS_BASE_URL}/api/tasks`, {
                        headers: { 'Authorization': `Bearer ${stored.authToken}` },
                    });
                    if (!res.ok) throw new Error('Unauthorized');
                    const data = await res.json();
                    sendResponse({ tasks: data.tasks || [] });
                } catch {
                    sendResponse({ tasks: [], error: 'Errore nel recupero task' });
                }
                break;
            }

            case 'CREATE_TASK': {
                const stored = await chrome.storage.local.get(['authToken']);
                if (!stored.authToken) {
                    sendResponse({ success: false, error: 'Non autenticato' });
                    break;
                }
                try {
                    const res = await fetch(`${COS_BASE_URL}/api/ai`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${stored.authToken}`,
                        },
                        body: JSON.stringify({
                            messages: [{
                                role: 'user',
                                content: `Crea un task: ${message.title}${message.deadline ? ` entro il ${message.deadline}` : ''}`
                            }]
                        }),
                    });
                    sendResponse({ success: res.ok });
                } catch {
                    sendResponse({ success: false });
                }
                break;
            }

            case 'GET_PAGE_CONTEXT': {
                // Returns current tab context for content scripts
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    const url = tabs[0]?.url || '';
                    let context = 'unknown';
                    if (url.includes('canva.com')) context = 'canva';
                    else if (url.includes('drive.google.com')) context = 'drive';
                    else if (url.includes('mail.google.com')) context = 'gmail';
                    else if (url.includes('figma.com')) context = 'figma';
                    sendResponse({ context, url });
                });
                return true; // Keep channel open for async
            }

            default:
                sendResponse({ error: 'Comando sconosciuto' });
        }
    };

    handle();
    return true; // Keep message channel open for async
});

// Periodic token refresh (every 45 minutes)
chrome.alarms.create('tokenRefresh', { periodInMinutes: 45 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
    if (alarm.name === 'tokenRefresh') {
        await fetchAuthToken();
    }
});
