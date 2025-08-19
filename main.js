const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const baseDir = path.dirname(process.execPath);
const platform = process.platform;

// бинарник запускается сам
const executable = path.join(baseDir,
  platform === 'win32' ? 'smac-m-win.exe' :
  platform === 'linux' ? 'smac-m-linux' :
  'smac-m-macos'
);

// проверяем, что файл реально есть
if (!fs.existsSync(executable)) {
    console.error('Invalied file name:', executable);
    process.exit(1);
}

// запускаем в фоне
const child = spawn(executable, [], {
    detached: true,
    stdio: 'ignore'
});

child.unref();
console.log(`Run on backend: ${executable}`);
