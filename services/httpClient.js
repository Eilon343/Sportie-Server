const { XMLHttpRequest } = require('xmlhttprequest');

// Glues a base URL, path, and query params together into one URL string.
// Skips params that are undefined/null/empty so they don't end up in the query.
function buildUrl(baseURL, path, params) {
    let url = baseURL + path;
    if (params) {
        const qs = Object.entries(params)
            .filter(([, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
            .join('&');
        if (qs) url += `?${qs}`;
    }
    return url;
}

// Does a GET request and resolves with the parsed JSON. Rejects on bad status or invalid JSON.
function getJSON(url, headers = {}) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        for (const [key, value] of Object.entries(headers)) {
            xhr.setRequestHeader(key, value);
        }
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    resolve(JSON.parse(xhr.responseText));
                } catch (e) {
                    reject(new Error('Invalid JSON response: ' + e.message));
                }
            } else {
                reject(new Error(`Request failed (${xhr.status}): ${xhr.responseText}`));
            }
        };
        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send();
    });
}

module.exports = { buildUrl, getJSON };
