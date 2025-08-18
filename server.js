const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { validateData } = require('./manage_data');
const { check_auto_startup } = require('./auto_startup')
const app = express();
const port = 3000;

const APP_DIR = path.dirname(process.execPath);
const DATA_DIR = path.join(APP_DIR, 'data');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

const DATA_FILE = path.join(DATA_DIR, 'data.json');
const LOG_FILE = path.join(DATA_DIR, 'log.txt');

app.use(cors({
  origin: '*'
}));

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-script');
  next();
});

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

function manage_log(message) {
  fs.appendFile(LOG_FILE, message + '\n', err => {
    if (err) console.error('Ошибка записи в лог:', err);
  });
}

function clear_log() {
  fs.writeFile(LOG_FILE, '', err => {
    if (err) {
      console.error('Ошибка записи в лог:', err);
    }
  });
}

app.post('/ping', async (req, res) => {
  const data = req.body;
  if (data.info == 'quiet')
    return res.status(200).send('OK');
  
  console.log('[PING]', data, req.headers['x-script']);
  manage_log(`[PING] ${JSON.stringify(data)} ${req.headers['x-script']}`)
  res.status(200).send('OK');
});

app.post('/debug-info', (req, res) => {
  const { message } = req.body;
  
  if (message) {
    manage_log(message, req.headers['x-script'])
    res.json({ status: 'OK', saved: true });
  } else {
    fs.readFile(LOG_FILE, 'utf-8', (err, data) => {
      if (err) {
        if (err.code === 'ENOENT') {
            return res.json({ status: 'OK', logs: [] });
        }
        return res.status(500).json({ status: 'error', error: err.message });
      }

      const data_linse = data.split('\n').filter(Boolean)
      const lines = data_linse.slice(data_linse.length - 20, data_linse.length);
      res.json({ status: 'OK', logs: lines });
    });
  }
});

app.post('/data-manage', (req, res) => {
  const info = req.body.info;

  let data = readData();

  if (!info || !info.name) {
    console.error("[ERR]: MISSING DATA")
    manage_log("[ERR]: MISSING DATA")
    return res.status(400).json({ error: 'Некорректные данные' });
  }

  if (!info.series_cnt || !info.watched_series || !info.expire_time) {
    console.warn("[WARN]: MISSING ADDITION INFO")
    manage_log("[WARN]: MISSING ADDITION INFO")
    return res.json({ status: 'OK', saved: !!data[info.name] });
  }

  if (!data[info.name]) {
    data[info.name] = {
      series_cnt: info.series_cnt,
      watched_series: info.watched_series,
      expire_time: info.expire_time
    }
    console.info("[DEBUG]: ADD DATA INFO")
    manage_log("[DEBUG]: ADD DATA INFO")
  } else {
    data[info.name].watched_series = info.watched_series
    data[info.name].expire_time = info.expire_time
    console.info("[DEBUG]: UPDATE DATA INFO")
    manage_log("[DEBUG]: UPDATE DATA INFO")
  }

  writeData(data);
  validateData(info.name)
  res.json({ status: 'OK', saved: !!data[info.name] });
});

app.listen(port, () => {
  clear_log()
  validateData()
  check_auto_startup()

  console.log(`Сервер запущен и слушает:\nhttp://localhost:${port}`);
});
