# PowerShell script for Windows
# Save as setup.ps1 and run it via PowerShell

# Stop on errors
$ErrorActionPreference = "Stop"

# Installers folder
$installDir = "installers"
if (-Not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir | Out-Null
}

Write-Host "🚀 Downloading the latest versions of Git, Node.js (LTS), and Python into '$installDir'..."
Write-Host "⚠️ You will need to install them manually by running the downloaded files."

# URLs of the latest versions
$urls = @{
    "Git"    = "https://git-scm.com/download/win"
    "Node.js" = "https://nodejs.org/dist/v22.18.0/node-v22.18.0-x64.msi"
    "Python" = "https://www.python.org/ftp/python/3.12.5/python-3.12.5-amd64.exe"
}

# Download function
function Download-Installer($name, $url, $outputDir) {
    $fileName = Split-Path $url -Leaf
    $filePath = Join-Path $outputDir $fileName
    
    if (-Not (Test-Path $filePath)) {
        Write-Host "⬇️ Downloading $name..."
        Invoke-WebRequest -Uri $url -OutFile $filePath
        Write-Host "✅ $name saved: $filePath"
    }
    else {
        Write-Host "ℹ️ $name is already downloaded: $filePath"
    }
}

# Download each installer
foreach ($item in $urls.GetEnumerator()) {
    Download-Installer $item.Key $item.Value $installDir
}

Write-Host "`n🎉 All installers have been downloaded into '$installDir'."
Write-Host "👉 Now run them manually to install Git, Node.js, and Python."
