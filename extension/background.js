async function ping(info) {
  try {
    const response = await fetch('http://localhost:3000/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-script': 'background.js' },
      body: JSON.stringify({ info: info }),
    });
    if (!response.ok) {
      sendDebugInfo(`[ERROR]{source: background, status: ${response.status}.`);
      console.error(`[ERROR]{source: background, status: ${response.status}.`);
    }

    return await response
  } catch (err) {
    console.error('[ERROR]{source: server, info: Invalied connection}:', err);
    sendDebugInfo(`[ERROR]{source: server, info: Invalied connection}: ${err}`);
  }
}

async function sendDebugInfo(message = '') {
    try {
        const response = await fetch('http://localhost:3000/debug-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-script': 'background.js' },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[ERROR]{source: background, info: Invalied debugInfo sending}:', error);
        return { status: 'error', error };
    }
}


function setIconStatus(isAlive) {
  chrome.action.setIcon({
    path: isAlive ? {
      16: "icons/icon16.png",
      48: "icons/icon48.png",
      128: "icons/icon128.png"
    } : {
      16: "icons/icon16-error.png",
      48: "icons/icon48-error.png",
      128: "icons/icon128-error.png"
    }
  });
}

setInterval(async () => {
  const alive = await ping('quiet');
  setIconStatus(alive);
}, 5000);