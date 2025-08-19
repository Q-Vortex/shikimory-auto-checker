require('dotenv').config({ quiet: true });
const puppeteer = require('puppeteer');
const process = require('process');
const os = require("os");
const fs = require('fs');
const path = require("path");
const unzipper = require('unzipper');
const https = require('https');

const cookieString = process.env.COOKIE;

const BASE_DIR = process.pkg ? path.dirname(process.execPath) : __dirname;
const DATA_DIR = path.join(BASE_DIR, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const CHROME_URLS = {
  linux: 'https://storage.googleapis.com/chrome-for-testing-public/139.0.7258.68/linux64/chrome-linux64.zip',
  win32_64: 'https://storage.googleapis.com/chrome-for-testing-public/139.0.7258.68/win64/chrome-win64.zip',
  win32_32: 'https://storage.googleapis.com/chrome-for-testing-public/139.0.7258.68/win32/chrome-win32.zip',
  darwin_x86_64: 'https://storage.googleapis.com/chrome-for-testing-public/139.0.7258.68/mac-x64/chrome-mac-x64.zip',
  darwin_arm64: 'https://storage.googleapis.com/chrome-for-testing-public/139.0.7258.68/mac-arm64/chrome-mac-arm64.zip'
};

async function sendDebugInfo(message = '') {
    try {
        const response = await fetch('http://localhost:3000/debug-info', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-script': 'parser.js' },
            body: JSON.stringify({ message })
        });

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Ошибка при отправке debugInfo:', error);
        return { status: 'error', error };
    }
}

function parseCookies(cookieStr, domain) {
  if (!cookieStr) return [];
  return cookieStr.split(';').map(cookie => {
    const [name, ...rest] = cookie.trim().split('=');
    const value = rest.join('=');
    return {
      name,
      value,
      domain,
      path: '/',
      httpOnly: false,
      secure: false,
    };
  });
}

async function downloadChrome(systemType) {
  let url;
  let destPath = DATA_DIR;

  if (!fs.existsSync(destPath)) fs.mkdirSync(destPath, { recursive: true });

  switch (systemType) {
    case 'win32':
      url = os.arch() === 'x64' ? CHROME_URLS.win32_64 : CHROME_URLS.win32_32;
      break;
    case 'linux':
      url = CHROME_URLS.linux;
      break;
    case 'darwin':
      url = os.arch() === 'arm64' ? CHROME_URLS.darwin_arm64 : CHROME_URLS.darwin_x86_64;
      break;
    default:
      throw new Error('Unsupported system: ' + systemType);
  }

  const zipPath = path.join(DATA_DIR, 'chrome.zip');

  console.log(`Скачивание Chrome для ${systemType}...`);
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(zipPath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', reject);
  });

  console.log('Распаковка...');
  await fs.createReadStream(zipPath)
    .pipe(unzipper.Extract({ path: destPath }))
    .promise();

  fs.unlinkSync(zipPath);
  console.log(`Chrome установлен в ${destPath}`);
}

async function getBrowserExecutable() {
  const platform = os.platform();
  const arch = os.arch();

  let execPath;
  let downloadKey;

  if (platform === 'win32') {
    execPath = path.join(DATA_DIR, 'chrome-win64', 'chrome.exe');
    downloadKey = arch === 'x64' ? 'win32_64' : 'win32_32';
  } else if (platform === 'linux') {
    execPath = path.join(DATA_DIR, 'linux', 'chrome');
    downloadKey = 'linux';
  } else if (platform === 'darwin') {
    execPath = path.join(DATA_DIR, 'mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium');
    downloadKey = arch === 'arm64' ? 'darwin_arm64' : 'darwin_x86_64';
  } else {
    throw new Error('Unsupported platform: ' + platform);
  }

  if (!fs.existsSync(execPath)) {
    console.log('Браузер не найден, начинаю скачивание...');
    await downloadChrome(platform);
    console.log('Chrome скачан успешно!');
  }

  return execPath;
}

async function makeBrowser() {
  const executablePath = await getBrowserExecutable();

  console.log('Browser run on dir:', executablePath);

  return await puppeteer.launch({
    headless: true,
    executablePath,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--mute-audio'
    ]
  });
}


function sleep(ms) {
  return new Promise(param => setInterval(param, ms))
}

async function toPage(page, AnimeName) {
  await page.goto('https://shikimori.one', { waitUntil: 'networkidle2' });

  await page.waitForSelector('div.global-search label.field input', { timeout: 5000 });
  await page.waitForSelector('header.l-top_menu-v2', { timeout: 5000 });

  await page.evaluate(() => {
    const header = document.querySelector('header.l-top_menu-v2');
    if (header) {
      header.classList.add('is-search-mobile', 'is-search-focus', 'is-search-shade');
    }
  });

  await page.focus('label.field input');
  await page.$eval('label.field input', (el, value) => { el.value = value; }, AnimeName);

  await page.keyboard.press('Enter');

  await page.waitForSelector('div.cc-entries article:nth-child(1) a');
  const href = await page.$eval('div.cc-entries article:nth-child(1) a', el => el.href);

  await page.goto(href, { waitUntil: 'networkidle2' });
}

async function setAnimeStatus(AnimeName, status) {
  if (!AnimeName) {
    sendDebugInfo('AnimeName is required.')
    throw new Error('AnimeName is required.');
  }

  const browser = await makeBrowser()
  
  const page = await browser.newPage();

  const cookies = parseCookies(cookieString, '.shikimori.one');
  await page.setCookie(...cookies);

  try {
    await toPage(page, AnimeName)

    const trigger = await page.waitForSelector(`div.option.add-trigger[data-status="${status}"]`, { timeout: 5000 });
    await page.evaluate(el => el.click(), trigger);

    return true
  } catch (error) {
    console.error('Ошибка при парсинге:', error);
    return false
  } finally {
    await browser.close();
  }
}

async function getAnimeStatus(AnimeName) {
  if (!AnimeName) {
    throw new Error('AnimeName is required.');
  }

  const browser = await makeBrowser()
  
  const page = await browser.newPage();

  const cookies = parseCookies(cookieString, '.shikimori.one');
  await page.setCookie(...cookies);

  try {
    await toPage(page, AnimeName)

    const el = await page.waitForSelector('div.edit-trigger .text span.status-name', { timeout: 5000 });
    
    return await page.evaluate(el => el.getAttribute('data-text'), el)
  } catch (error) {
    console.error('Ошибка при парсинге:', error);
    // sendDebugInfo('Ошибка при парсинге:', error);
    return undefined
  } finally {
    await browser.close();
  }
}

async function removeAnime(AnimeName) {
  if (!AnimeName) {
    sendDebugInfo('AnimeName is required.');
    throw new Error('AnimeName is required.');
  }

  const browser = await makeBrowser()
  
  const page = await browser.newPage();

  const cookies = parseCookies(cookieString, '.shikimori.one');
  await page.setCookie(...cookies);

  try {
    await toPage(page, AnimeName)

    const trigger = await page.waitForSelector("div.option.remove-trigger", { timeout: 5000 });

    await page.evaluate(el => el.scrollIntoView({behavior: "smooth", block: "center"}), trigger);

    const clicked = await page.evaluate(el => {
        if (!el) return false;
        el.click();
        return true;
    }, trigger);

    return clicked
  } catch (error) {
    console.error('Ошибка при парсинге:', error);
    sendDebugInfo('Ошибка при парсинге:', error);
    return false
  } finally {
    await browser.close();
  }
}

async function IncrementSeriesNum(AnimeName, episodeNum) {
  if (!AnimeName) {
    throw new Error('AnimeName is required.');
  }

  const browser = await makeBrowser()
  
  const page = await browser.newPage();

  const cookies = parseCookies(cookieString, '.shikimori.one');
  await page.setCookie(...cookies);

  try {
    await toPage(page, AnimeName)

    const trigger = await page.waitForSelector("div.rate-number span.item-add.increment", { timeout: 5000 });
    const condition = await page.waitForSelector("div.rate-number span.current-episodes", { timeout: 5000 });

    let condition_content = await page.evaluate(el => el.textContent, condition)

    if (parseInt(condition_content, 10) == episodeNum) {
      return true
    }

    if (parseInt(condition_content, 10) > episodeNum) {
      await removeAnime(AnimeName)

      const status = await getAnimeStatus(AnimeName)
      if (status == 'Пересматриваю' || status == 'Rewatching') {
        await setAnimeStatus(AnimeName, 'rewatching')
      } else if (status == 'Смотрю' || status == 'Watching') {
        await setAnimeStatus(AnimeName, 'watching')
      }

      await IncrementSeriesNum(AnimeName, episodeNum)
    }
    
    await page.evaluate(el => el.scrollIntoView({behavior: "smooth", block: "center"}), trigger);

    while (true) {
      const condition_content = await page.$eval(
        'div.rate-number span.current-episodes',
        el => el.textContent.trim()
      );

      if (parseInt(condition_content, 10) === episodeNum) return true;

      await page.click('div.rate-number span.item-add.increment');
      await sleep(1200);
    }
  } catch (error) {
    console.error('Ошибка при парсинге:', error);
    sendDebugInfo('Ошибка при парсинге:', error);
    return false
  } finally {
    await browser.close();
  }
}

async function getWathedEpisodesNum(AnimeName) {
  if (!AnimeName) {
    throw new Error('AnimeName is required.');
  }

  const browser = await makeBrowser()
  
  const page = await browser.newPage();

  const cookies = parseCookies(cookieString, '.shikimori.one');
  await page.setCookie(...cookies);

  try {
    await toPage(page, AnimeName)

    const condition = await page.waitForSelector("div.rate-number span.current-episodes", { timeout: 5000 });
    
    return await page.evaluate(el => el.textContent, condition)
  } catch (error) {
    console.error('Ошибка при парсинге:', error);
    sendDebugInfo('Ошибка при парсинге:', error);
    return undefined
  } finally {
    await browser.close();
  }
}

module.exports = { setAnimeStatus, getAnimeStatus, getWathedEpisodesNum, removeAnime, IncrementSeriesNum }; 