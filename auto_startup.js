const os = require('os');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const platform = process.platform;

const configPath = path.join(__dirname, 'config.json');
let config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

const scriptPath = __filename;
const appName = path.basename(scriptPath, path.extname(scriptPath));

// ---------- WINDOWS ----------
const startupFolder = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');
const batPath = path.join(startupFolder, `${appName}.bat`);

function addToStartupWindows() {
    const batContent = `@echo off\nnode "${scriptPath}"\n`;
    fs.writeFileSync(batPath, batContent, { encoding: 'utf-8' });
}

function removeFromStartupWindows() {
    if (fs.existsSync(batPath)) fs.unlinkSync(batPath);
}

function isInStartupWindows() {
    return fs.existsSync(batPath);
}

// ---------- MACOS ----------
const plistPath = path.join(os.homedir(), 'Library', 'LaunchAgents', 'com.myapp.autostart.plist');

function addToStartupMac() {
    const plist = `
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.myapp.autostart</string>
    <key>ProgramArguments</key>
    <array>
      <string>node</string>
      <string>${scriptPath}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
  </dict>
</plist>`;
    fs.writeFileSync(plistPath, plist);
    execSync(`launchctl load ${plistPath}`);
}

function removeFromStartupMac() {
    if (fs.existsSync(plistPath)) {
        execSync(`launchctl unload ${plistPath}`);
        fs.unlinkSync(plistPath);
    }
}

function isInStartupMac() {
    return fs.existsSync(plistPath);
}

// ---------- LINUX ----------
const autostartDir = path.join(os.homedir(), '.config', 'autostart');
const desktopFile = path.join(autostartDir, 'myapp.desktop');

function addToStartupLinux() {
    if (!fs.existsSync(autostartDir)) fs.mkdirSync(autostartDir, { recursive: true });
    const content = `
[Desktop Entry]
Type=Application
Exec=node ${scriptPath}
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
Name=MyNodeApp
Comment=Autostart MyNodeApp
`;
    fs.writeFileSync(desktopFile, content);
}

function removeFromStartupLinux() {
    if (fs.existsSync(desktopFile)) fs.unlinkSync(desktopFile);
}

function isInStartupLinux() {
    return fs.existsSync(desktopFile);
}

// ---------- UNIVERSAL ----------
function check_auto_startup() {
    let alreadyInStartup = false;

    if (platform === 'win32') alreadyInStartup = isInStartupWindows();
    else if (platform === 'darwin') alreadyInStartup = isInStartupMac();
    else if (platform === 'linux') alreadyInStartup = isInStartupLinux();

    if (config.run_on_systems_start) {
        if (!alreadyInStartup) {
            if (platform === 'win32') addToStartupWindows();
            else if (platform === 'darwin') addToStartupMac();
            else if (platform === 'linux') addToStartupLinux();
            console.log("✅ Программа добавлена в автозагрузку");
        } else {
            console.log("ℹ️ Уже есть в автозагрузке");
        }
    } else {
        if (alreadyInStartup) {
            if (platform === 'win32') removeFromStartupWindows();
            else if (platform === 'darwin') removeFromStartupMac();
            else if (platform === 'linux') removeFromStartupLinux();
            console.log("❌ Убрано из автозагрузки");
        } else {
            console.log("ℹ️ Уже нет в автозагрузке");
        }
    }
}

module.exports = { check_auto_startup };
