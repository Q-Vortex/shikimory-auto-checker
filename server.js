const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { validateData } = require('./manage_data');
const git = require('isomorphic-git');

const app = express();
const port = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');
const LOG_FILE = path.join(__dirname, 'log.txt');
const REPO_DIR = path.resolve(__dirname, './build');
const REPO_URL = 'https://github.com/user/repo.git';

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
  if (!content) {
    return {};
  }

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
    if (err) {
      console.error('Ошибка записи в лог:', err);
    }
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

async function checkAndUpdateRepo() {
  try {
    if (!fs.existsSync(REPO_DIR)) {
      await git.clone({ fs, dir: REPO_DIR, url: REPO_URL });
      console.log('Repo cloned');
      return true;
    }

    await git.fetch({ fs, dir: REPO_DIR, url: REPO_URL });
    
    const status = await git.statusMatrix({ fs, dir: REPO_DIR });
    let hasChanges = false;
    for (const [file, , worktree, stage] of status) {
      if (worktree !== stage) {
        hasChanges = true;
        break;
      }
    }

    if (hasChanges) {
      console.log('Changes detected, pulling updates...');
      await git.pull({ fs, dir: REPO_DIR, url: REPO_URL, singleBranch: true, fastForwardOnly: true });
      return true;
    }

    console.log('No changes detected.');
    return false;
  } catch (err) {
    console.error('Error checking/updating repo:', err);
    return false;
  }
}

app.post('/check-updates', async (req, res) => {
  const updated = await checkAndUpdateRepo();
  if (updated) {
    res.json({ status: true });

    setTimeout(() => {
      exec('node server.js', (err, stdout, stderr) => {
        if (err) console.error(err);
        console.log(stdout);
        console.error(stderr);
        process.exit(0);
      });
    }, 1000);
  } else {
    res.json({ status: false });
  }
});

app.listen(port, () => {
  clear_log()
  validateData()
  console.log(`Сервер запущен и слушает:\nhttp://localhost:${port}`);
});
