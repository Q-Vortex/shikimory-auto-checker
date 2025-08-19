#!/bin/bash
set -e

# Detecting package manager
if command -v apt-get &> /dev/null; then
    PM="apt"
elif command -v dnf &> /dev/null; then
    PM="dnf"
elif command -v yum &> /dev/null; then
    PM="yum"
elif command -v pacman &> /dev/null; then
    PM="pacman"
elif command -v zypper &> /dev/null; then
    PM="zypper"
elif command -v brew &> /dev/null; then
    PM="brew"
else
    echo "❌ Could not detect a package manager. Please install git, nodejs, and python manually."
    exit 1
fi

echo "✅ Detected package manager: $PM"
echo "🚀 Installing git, nodejs, and python..."

# Installation depending on the package manager
case $PM in
    apt)
        sudo apt update
        sudo apt install -y git curl python3 python3-pip
        curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
        sudo apt install -y nodejs
        ;;
    dnf)
        sudo dnf install -y git curl python3 python3-pip
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
        sudo dnf install -y nodejs
        ;;
    yum)
        sudo yum install -y git curl python3 python3-pip
        curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
        sudo yum install -y nodejs
        ;;
    pacman)
        sudo pacman -Sy --noconfirm git nodejs npm python python-pip
        ;;
    zypper)
        sudo zypper refresh
        sudo zypper install -y git nodejs npm python3 python3-pip
        ;;
    brew)
        brew update
        brew install git node python
        ;;
esac

echo "🎉 Installation completed!"
echo "Versions:"
git --version
node -v
npm -v
python3 --version
