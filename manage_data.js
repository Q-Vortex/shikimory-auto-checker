const fs = require('fs');
const parse = require('./parser');
const path = require('path');

const APP_DIR = path.dirname(process.execPath);
const DATA_DIR = path.join(APP_DIR, 'data');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const DATA_FILE = path.join(DATA_DIR, 'data.json');

function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}, null, 2));
  }

  let content = fs.readFileSync(DATA_FILE, 'utf8').trim();
  if (!content) return {};

  try {
    return JSON.parse(content);
  } catch (err) {
    console.error('Ошибка парсинга JSON:', err);
    return {};
  }
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function sendDebugInfo(message = '') {
    try {
        const response = await fetch('http://localhost:3000/debug-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-script': 'manage_data.js' },
            body: JSON.stringify({ message })
        });

        const data = await response.text();
        return data;
    } catch (error) {
        console.error('Ошибка при отправке debugInfo:', error);
        return { status: 'error', error };
    }
}

async function validateData(AnimeName) {
  const data = readData()
  
  if (!AnimeName) {
    for (anime in data) {
      if (anime.expire_time <= Date.now()) {
        await parse.removeAnime(anime)
        delete data[anime]
        writeData(data)
        console.log("[REMOVE]{cause: expiration}: ", anime)
        sendDebugInfo("[REMOVE]{cause: expiration}: ", anime)
        continue
      }

      if (Number(data[anime].watched_series) == Number(data[anime].series_cnt)) {
        const status = await parse.getAnimeStatus(anime)
        if (status == 'Просмотрено' || status == 'Completed') {
          await parse.setAnimeStatus(anime, 'rewatching')
          data[anime].watched_series = 0;
          writeData(data)
          console.log("[SET]{status: rewatching}: ", anime)
          sendDebugInfo("[SET]{status: rewatching}: ", anime)
          continue
        }

        await parse.setAnimeStatus(anime, 'completed')
        console.log("[SET]{status: completed}: ", anime)
        sendDebugInfo("[SET]{status: completed}: ", anime)
        continue
      }

      const parsed_seazons_num = await parse.getWathedEpisodesNum(anime)
      if (data[anime].watched_series >= 1 &&  parsed_seazons_num != data[anime].watched_series) {
        const status = await parse.getAnimeStatus(anime)
        if (status == 'Смотрю' || status == 'Watching') {
          await parse.IncrementSeriesNum(anime, Number(data[anime].watched_series));
          console.info(`[INCREASED]{target: ${data[anime].watched_series}}: ${anime}`)
          sendDebugInfo(`[INCREASED]{target: ${data[anime].watched_series}}: ${anime}`)
          continue
        }

        if (status == 'Пересматриваю' || status == 'Rewatching') {
          await parse.IncrementSeriesNum(anime, Number(data[anime].watched_series));
          console.info(`[INCREASED]{target: ${data[anime].watched_series}}: ${anime}`)
          sendDebugInfo(`[INCREASED]{target: ${data[anime].watched_series}}: ${anime}`)
          continue
        }
        
        await parse.setAnimeStatus(anime, 'watching')
        console.info("[SET]{status: watching}: ", anime)
        sendDebugInfo("[SET]{status: watching}: ", anime)
        continue
      }
    }
    console.info("[DEBUG]: Data validation finished")
    sendDebugInfo("[DEBUG]: Data validation finished")
  } else {
    anime = AnimeName
    if (anime.expire_time <= Date.now()) {
      await parse.removeAnime(anime)
      delete data[anime]
      writeData(data)
      console.log("[REMOVE]{cause: expiration}: ", anime)
      sendDebugInfo("[REMOVE]{cause: expiration}: ", anime)
      return
    }

    if (Number(data[anime].watched_series) == Number(data[anime].series_cnt)) {
      const status = await parse.getAnimeStatus(anime)
      if (status == 'Просмотрено' || status == 'Completed') {
        await parse.setAnimeStatus(anime, 'rewatching')
        data[anime].watched_series = 0;
        writeData(data)
        console.log("[SET]{status: rewatching}: ", anime)
        sendDebugInfo("[SET]{status: rewatching}: ", anime)
        return
      }

      await parse.setAnimeStatus(anime, 'completed')
      console.log("[SET]{status: completed}: ", anime)
      sendDebugInfo("[SET]{status: completed}: ", anime)
      return
    }

    const parsed_seazons_num = await parse.getWathedEpisodesNum(anime)
    if (data[anime].watched_series >= 1 && parsed_seazons_num != data[anime].watched_series) {
      const status = await parse.getAnimeStatus(anime)
      if (status == 'Смотрю' || status == 'Watching') {
        await parse.IncrementSeriesNum(anime, Number(data[anime].watched_series));
        console.log(`[INCREASED]{target: ${data[anime].watched_series}}: ${anime}`)
        sendDebugInfo(`[INCREASED]{target: ${data[anime].watched_series}}: ${anime}`)
        return
      }

      if (status == 'Пересматриваю' || status == 'Rewatching') {
        await parse.IncrementSeriesNum(anime, Number(data[anime].watched_series));
        console.log(`[INCREASED]{target: ${data[anime].watched_series}}: ${anime}`)
        sendDebugInfo(`[INCREASED]{target: ${data[anime].watched_series}}: ${anime}`)
        return
      }
      
      await parse.setAnimeStatus(anime, 'watching')
      console.log("[SET]{status: watching}: ", anime)
      sendDebugInfo("[SET]{status: watching}: ", anime)
      return
    }    
  }
  return
}

module.exports = { validateData }