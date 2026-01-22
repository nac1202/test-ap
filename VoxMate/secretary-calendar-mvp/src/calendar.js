const CLIENT_ID = '267334877108-tj9cm551im3pd3069jor5jl2h0r8hhqg.apps.googleusercontent.com';
const API_KEY = 'AIzaSyDGA5tiaCb1vHltFJm0w4QmBapI_kxlLYQ';
const DISCOVERY_DOC = 'https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest';
const SCOPES = 'https://www.googleapis.com/auth/calendar.events';

let tokenClient;
let gapiInited = false;
let gisInited = false;

export async function initCalendar() {
    return new Promise((resolve, reject) => {
        // Wait for scripts to load if they haven't already
        const checkLibs = setInterval(() => {
            if (typeof gapi !== 'undefined' && typeof google !== 'undefined') {
                clearInterval(checkLibs);
                initializeGapiClient().then(() => {
                    gapiInited = true;
                    maybeResolve();
                }).catch(reject);

                tokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: '', // defined later per request
                });
                gisInited = true;
                maybeResolve();
            }
        }, 100);

        function maybeResolve() {
            if (gapiInited && gisInited) {
                // Check for stored token
                const storedToken = localStorage.getItem('gapi_token');
                const storedTime = localStorage.getItem('gapi_token_time');
                if (storedToken && storedTime) {
                    const now = new Date().getTime();
                    const age = (now - parseInt(storedTime)) / 1000;
                    // Token usually good for 3600s. Let's use 3500s buffer.
                    if (age < 3500) {
                        try {
                            const token = JSON.parse(storedToken);
                            gapi.client.setToken(token);
                            console.log("Restored token from storage");
                        } catch (e) {
                            console.warn("Failed to parse stored token", e);
                        }
                    } else {
                        console.log("Stored token expired");
                        localStorage.removeItem('gapi_token');
                        localStorage.removeItem('gapi_token_time');
                    }
                }
                resolve();
            }
        }
    });
}

async function initializeGapiClient() {
    await new Promise((resolve, reject) => {
        gapi.load('client', { callback: resolve, onerror: reject });
    });
    await gapi.client.init({
        apiKey: API_KEY,
        discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/calendar/v3/rest'],
    });
}

export function handleAuthClick() {
    return new Promise((resolve, reject) => {
        tokenClient.callback = async (resp) => {
            if (resp.error) {
                reject(resp);
            }
            // Manually set the token for gapi.client
            gapi.client.setToken(resp);

            // Save to localStorage
            localStorage.setItem('gapi_token', JSON.stringify(resp));
            localStorage.setItem('gapi_token_time', new Date().getTime().toString());

            resolve(resp);
        };
        if (gapi.client.getToken() === null) {
            tokenClient.requestAccessToken({ prompt: 'consent' });
        } else {
            tokenClient.requestAccessToken({ prompt: '' });
        }
    });
}

export function handleSignoutClick() {
    const token = gapi.client.getToken();
    if (token !== null) {
        google.accounts.oauth2.revoke(token.access_token);
        gapi.client.setToken('');
        localStorage.removeItem('gapi_token');
        localStorage.removeItem('gapi_token_time');
    }
}

export async function listEvents(timeMin, timeMax) {
    const response = await gapi.client.calendar.events.list({
        'calendarId': 'primary',
        'timeMin': timeMin,
        'timeMax': timeMax,
        'showDeleted': false,
        'singleEvents': true,
        'orderBy': 'startTime',
    });
    return response.result.items;
}

export async function createEvent(eventData) {
    return await gapi.client.calendar.events.insert({
        'calendarId': 'primary',
        'resource': eventData,
    });
}

export async function updateEvent(eventId, eventData) {
    return await gapi.client.calendar.events.update({
        'calendarId': 'primary',
        'eventId': eventId,
        'resource': eventData
    });
}
export async function deleteEvent(eventId) {
    return await gapi.client.calendar.events.delete({
        'calendarId': 'primary',
        'eventId': eventId
    });
}

export async function fetchAllEvents(timeMin, timeMax) {
    let events = [];
    let pageToken = null;
    do {
        try {
            const response = await gapi.client.calendar.events.list({
                'calendarId': 'primary',
                'timeMin': timeMin,
                'timeMax': timeMax,
                'showDeleted': false,
                'singleEvents': true,
                'orderBy': 'startTime',
                'maxResults': 2500,
                'pageToken': pageToken
            });
            const items = response.result.items;
            if (items && items.length > 0) {
                events = events.concat(items);
            }
            pageToken = response.result.nextPageToken;
        } catch (e) {
            console.error("Error fetching events page", e);
            throw e;
        }
    } while (pageToken);
    return events;
}
