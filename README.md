# ShikiMory Auto Checker

## Project Description
A browser extension that automates the process of tracking anime watching progress.  
There is a website called **Shikimory** that allows you to record your progress in watching anime. However, it can be quite tedious if you watch anime frequently.  
This program automates the process, leaving you only to enjoy watching anime.

---

## How to Use
1. There is an executable file → server. You **must run it**, otherwise the extension will not work.  
2. Create a `.env` file and write:
```
COOKIE=YOUR\_COOKIE
```
where `YOUR_COOKIE` is the cookie obtained from the Shikimory website.

---

## How to Get the Cookie
1. Open the Shikimory website.  
2. Right-click → "Inspect" or press `Ctrl+Shift+C`.  
3. In the opened panel, select the **Network** tab.  
4. Find any element with a paper (or file) icon. If nothing appears, reload the page.  
5. Click on the element and open the **Request Headers** section.  
6. Copy the value of the **Cookie** key (only the content, without the header itself) and paste it into the `.env` file.

---

## If Something Happens to the `.exe` File
1. In the root folder, load all required files using `setup.bat` or `setup.exe`.  
2. Run:
```bash
npm install
pkg .
````

This will recompile the executable file.

---

## How to Install the Extension

1. Go to your browser: `browser://extensions` (where `browser` is your browser).
2. Load the extension by specifying its folder.

---

## Configuration via config.json

The project includes a `config.json` file where you can configure the program according to your needs.
Open it in any text editor and modify the parameters as necessary.
