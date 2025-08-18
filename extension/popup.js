const githHubUrl = "https://github.com/Q-Vortex/shikimory-auto-checker?tab=readme-ov-file";

async function sendDebugInfo(message = '') {
  try {
    await fetch('http://localhost:3000/debug-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-script': 'popup.js' },
      body: JSON.stringify({ message })
    });
  } catch (error) {
    console.info('Ошибка при отправке debugInfo:', error?.message ?? error);
  }
}

async function ping(info = '') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2000);
  try {
    const response = await fetch('http://localhost:3000/ping', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-script': 'popup.js'
      },
      body: JSON.stringify({ info }),
      signal: controller.signal
    });

    clearTimeout(timeout);
    if (!response.ok) return false;
    const text = await response.text();
    return text.trim() === 'OK';
  } catch (err) {
    clearTimeout(timeout);
    console.info('Ошибка соединения с сервером:', err?.message ?? err);
    await sendDebugInfo(`Ошибка соединения с сервером: ${err?.message ?? err}`);
    return false;
  }
}

async function fetchDebugInfo() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 3000); // 3s
  try {
    const response = await fetch('http://localhost:3000/debug-info', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) {
      throw new Error(`Ошибка сервера: ${response.status}`);
    }
    const data = await response.json();
    renderDebugLogs(data.logs || []);
  } catch (err) {
    clearTimeout(timeout);
    console.info('Ошибка при получении debug-info:', err?.message ?? err);
    await sendDebugInfo(`[ERROR] {source: debug-info}: ${err?.message ?? err}`);
    renderDebugLogs([`[ERROR]: ${err?.message ?? err}`]);
  }
}

function renderDebugLogs(logs) {
  const container = document.querySelector('.console_info_container');
  if (!container) return;
  container.innerHTML = '';
  logs.forEach(log => {
    const h4 = document.createElement('h4');
    h4.className = 'info';
    h4.textContent = String(log);
    container.appendChild(h4);
  });
}

function safeQuery(selector) {
  return document.querySelector(selector);
}

function bindHeaderButtons() {
  const buttons = document.querySelectorAll('.header_btn');
  if (!buttons || buttons.length === 0) return;

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('a'));
      btn.classList.add('a');

      document.querySelectorAll('.container').forEach(cont => cont.classList.remove('a'));

      if (btn.classList.contains('info')) {
        const el = safeQuery('.info_container'); if (el) el.classList.add('a');
      } else if (btn.classList.contains('console')) {
        const el = safeQuery('.console_container'); if (el) el.classList.add('a');
      } else if (btn.classList.contains('updates')) {
        const el = safeQuery('.updates_container'); if (el) el.classList.add('a');
      }
    });
  });
}

async function updateServerStatusOnce() {
  const isAlive = await ping('quiet').catch(() => false);
  const statusEl = safeQuery('.serve_status_info');
  const indicatorEl = safeQuery('.indicator');
  const additionEl = safeQuery('.addition_info');

  if (isAlive) {
    if (statusEl) statusEl.textContent = "All is ok";
    if (indicatorEl) indicatorEl.style.background = 'green';
    if (additionEl) additionEl.textContent = "";
  } else {
    if (statusEl) statusEl.textContent = "Server stopped";
    if (indicatorEl) indicatorEl.style.background = 'red';
    if (additionEl) additionEl.innerHTML = `
      Please start the server<br>
      For more info visit my <a href='${githHubUrl}' target="_blank" rel="noopener noreferrer">GitHub</a>`;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    bindHeaderButtons();
    fetchDebugInfo();
    updateServerStatusOnce();

    const intervalId = setInterval(() => {
      updateServerStatusOnce();
      fetchDebugInfo();
    }, 3000);

    window.addEventListener('unload', () => clearInterval(intervalId));
  } catch (err) {
    console.error('Ошибка инициализации popup:', err);
    sendDebugInfo(`popup init error: ${err?.message ?? err}`);
  }
});
