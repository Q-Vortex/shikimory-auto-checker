const { spawn } = require('child_process');
const os = require('os');
const path = require('path');
const fs = require('fs');

const platform = os.platform();

const executable = path.join(process.cwd(), platform === 'win32' ? 'smac-win.exe' : platform === 'linux' ? 'smac-linux' : 'smac-macos');

const child = spawn(executable, [], {
  detached: true,
  stdio: 'ignore'
});

child.unref();

console.log(`Run: ${executable} on backend`);
