let anime_info = false;

let animeName;

function waitForElement(selector, callback) {
    const elem = document.querySelector(selector);
    if (elem) {
        callback(elem);
        return;
    }

    const observer = new MutationObserver(() => {
        const elem = document.querySelector(selector);
        if (elem) {
            observer.disconnect();
            callback(elem);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

waitForElement("div.titles h1", (elem) => {
    animeName = elem.textContent;
    console.warn("[WARN]{info: Invalied name}", animeName);
});

DataManage({ name: animeName }).then(info => {
  if (!info || info.error) {
    console.error(`[ERROR]{source: DataManage}: ${info}`);
     sendDebugInfo(`[ERROR]{source: DataManage}: ${info}`);
    return;
  }

  const anime_info = info.saved;
  console.debug("[DEBUG]: ANIME IN DATA:", anime_info);
  sendDebugInfo(`[DEBUG]: ANIME IN DATA: ${anime_info}`);
});

async function sendDebugInfo(message = '') {
    try {
        const response = await fetch('http://localhost:3000/debug-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json','x-script': 'content.js' },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('[ERROR]{source: background, info: Invalied debugInfo sending}:', error);
        return { status: 'error', error };
    }
}

async function ping(info) {
  try {
    const response = await fetch('http://localhost:3000/ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-script': 'content.js' },
      body: JSON.stringify({ info: info }),
    });
    if (!response.ok) {
      console.error(`[ERROR]{source: server, status: ${response.status}.`);
      sendDebugInfo(`[ERROR]{source: server, status: ${response.status}.`);
    }
  } catch (err) {
    console.error('[ERROR]{source: server, info: Invalied connection}:', err);
    sendDebugInfo(`[ERROR]{source: server, info: Invalied connection}: ${err}`);
  }
}


async function getSerieLongTime(anime_name) {
  try {
    const response = await fetch('http://localhost:3000/get-serie-long-time', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ info: anime_name }),
    });

    if (!response.ok) {
      console.info(`Ошибка при отправке данных на сервер: ${response.status}`);
      sendDebugInfo(`Ошибка при отправке данных на сервер: ${response.status}`)
      return null;
    }

    return await response.json();
  } catch (info) {
    console.error('[ERROR]{source: server}:', info);
    sendDebugInfo(`[ERROR]{source: server}: ${info}`);
    return null;
  }
}

async function DataManage(info) {
  try {
    const response = await fetch('http://localhost:3000/data-manage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ info: info }),
    });
    if (!response.ok) {
      console.info(`Ошибка при отправке данных на сервер: ${response.status}`);
      sendDebugInfo(`Ошибка при отправке данных на сервер: ${response.status}`)
      return null
    }

    return await response.json();
  } catch (info) {
    console.error(`[ERROR]{source: server, ${info}}:`);
    sendDebugInfo(`[ERROR]{source: server}: ${JSON.stringify(info)}`);
  }
}

function handlePlayerTime(currentTime, saved) {

  const isFirstEpisode = (getWathedAnimeNum() >= 1 || !getWathedAnimeNum());
  if ((currentTime >= 180 || anime_info) && isFirstEpisode && !saved) {
    const token = createToken();
    DataManage(token).then(data => {
      anime_info = data.saved
      console.debug("[DEBUG]{info: TOKEN SAVED}: ", anime_info);
      sendDebugInfo(`[DEBUG]{info: TOKEN SAVED}: ${anime_info}`);
    });
    return true;
  }
    
  return saved;
}

function anilibriaPlayerTrigger(event, saved) {
  try {
    let data = event.data;

    if (typeof data === "string") data = JSON.parse(data);

    if (data.key === "kodik_player_time_update" || data.key === "kodik_player_duration_update")
      return handlePlayerTime(data.value, saved);

    console.warn("[WARN]{source: Anilibria-Player, info: Unknown data}:", data);
    sendDebugInfo(`[WARN]{source: Anilibria-Player, info: Unknown data}: ${JSON.stringify(data)}`);
    return saved;

  } catch (e) {
    console.warn("[WARN]{source: Anilibria-Player, info: Invalid data}:", event.data);
    sendDebugInfo(`[WARN]{source: Anilibria-Player, info: Invalid data}: ${String(event.data)}`);
    return saved;
  }
}


function otherPlayerTrigger(event, saved) {
  const data = typeof event.data == "string" ? null : event.data;
  
  if (data?.key == "kodik_player_time_update") {
    return handlePlayerTime(data.value, saved);
  }

  return saved;
}

let saved = false;

window.addEventListener("message", function (event) {
  const trigger = document.querySelector(
    ".css-1byiruc-control .css-1xpn73m .css-12t1xcb-singleValue"
  );

  const isAnilibria = trigger?.textContent?.trim().toLowerCase().includes("anilibria");

  saved = isAnilibria
    ? anilibriaPlayerTrigger(event, saved)
    : otherPlayerTrigger(event, saved);
});

function createToken() {
  const token = {
    name: animeName,
    series_cnt: document.querySelector(".content-main-info .categories-list:nth-child(9) div").textContent,
    watched_series: getWathedAnimeNum(),
    expire_time: Date.now() + 1000 * 60 * 60 * 24 * 7
  }

  return token;
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('div.Yqy0');

  if (target) {
    saved = false
    const token = createToken()
    DataManage(token).then(info => {
      anime_info = info.saved;
      console.log("[DEBUG]{info: TOKEN SAVED}: ", anime_info);
      sendDebugInfo(`[DEBUG]{info: TOKEN SAVED}: ${anime_info}`);
    })
  }
});

function getWathedAnimeNum() {
  let watched_series = 0;

  if (!document.querySelector('div.Yqy0')) {
    return undefined
  }

  document.querySelectorAll('div.Yqy0 .Y56k').forEach(el => {
    if (el.classList.contains('oVgn')) watched_series++
  })

  return watched_series
}