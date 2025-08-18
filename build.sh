# Checking for dependencies
./setup.sh

# Building the project
npm run build

# Compiling binaries for all platforms
pkg . --out-path dist

# Removing old binaries if they exist
rm -f dist/smac-linux \
      dist/smac-macos \
      dist/smac-win.exe

echo Successful build!