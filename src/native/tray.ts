import { join } from "node:path";

import { BrowserWindow, Menu, Tray, nativeImage } from "electron";

import trayIconAsset from "../../assets/desktop/icon.png?asset";
import macOsTrayIconAsset from "../../assets/desktop/iconTemplate.png?asset";
import { version } from "../../package.json";

import { config } from "./config";
import { mainWindow, quitApp } from "./window";

// internal tray state
let tray: Tray = null;
let serverSettingsWindow: BrowserWindow | undefined;

function openServerSettings() {
  if (serverSettingsWindow && !serverSettingsWindow.isDestroyed()) {
    serverSettingsWindow.focus();
    return;
  }

  const currentUrl = JSON.stringify(config.serverUrl).replace(/</g, "\\u003c");
  const html = `<!doctype html>
<html><head><meta charset="UTF-8"><title>Stoat server</title>
<style>
  :root { color-scheme: light dark; font: 14px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }
  body { margin: 0; padding: 28px; background: #191919; color: #f4f4f4; }
  main { max-width: 460px; margin: auto; }
  h1 { font-size: 20px; margin: 0 0 8px; }
  p { color: #b8b8b8; line-height: 1.45; margin: 0 0 20px; }
  label { display: block; font-weight: 600; margin-bottom: 8px; }
  input { box-sizing: border-box; width: 100%; padding: 10px 12px; border: 1px solid #555; border-radius: 6px; background: #242424; color: inherit; font: inherit; }
  input:focus { outline: 2px solid #6ea8fe; outline-offset: 1px; }
  button { margin-top: 16px; padding: 10px 16px; border: 0; border-radius: 6px; background: #6ea8fe; color: #111; font: 600 14px inherit; cursor: pointer; }
  #error { color: #ff8d8d; min-height: 20px; margin-top: 10px; }
</style></head><body><main>
<h1>Stoat server</h1>
<p>Choose the Stoat server used by this desktop app. A domain such as <code>chat.example.com</code> is accepted.</p>
<form id="form"><label for="server">Server URL</label><input id="server" type="text" inputmode="url" required autocomplete="url" spellcheck="false" value=${currentUrl} placeholder="https://stoat.chat/app"><div id="error" role="alert"></div><button type="submit">Save and reload</button></form>
</main><script>
  const form = document.getElementById('form');
  const input = document.getElementById('server');
  const error = document.getElementById('error');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.textContent = '';
    const result = await window.desktopConfig.setServerUrl(input.value);
    if (!result.ok) error.textContent = result.error || 'Invalid server URL';
  });
  input.focus();
</script></body></html>`;

  serverSettingsWindow = new BrowserWindow({
    width: 560,
    height: 330,
    resizable: false,
    parent: mainWindow,
    modal: true,
    title: "Stoat server",
    webPreferences: {
      preload: join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  serverSettingsWindow.on("closed", () => (serverSettingsWindow = undefined));
  serverSettingsWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(html)}`,
  );
}

// Create and resize tray icon for macOS
function createTrayIcon() {
  if (process.platform === "darwin") {
    const image = nativeImage.createFromDataURL(macOsTrayIconAsset);
    const resized = image.resize({ width: 20, height: 20 });
    resized.setTemplateImage(true);
    return resized;
  } else {
    return nativeImage.createFromDataURL(trayIconAsset);
  }
}

export function initTray() {
  const trayIcon = createTrayIcon();
  tray = new Tray(trayIcon);
  updateTrayMenu();
  tray.setToolTip("Stoat for Desktop");
  tray.setImage(trayIcon);
  tray.on("click", () => {
    if (mainWindow.isVisible()) {
      mainWindow.hide();
    } else {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

export function updateTrayMenu() {
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: "Stoat for Desktop", type: "normal", enabled: false },
      {
        label: "Version",
        type: "submenu",
        submenu: Menu.buildFromTemplate([
          {
            label: version,
            type: "normal",
            enabled: false,
          },
        ]),
      },
      { type: "separator" },
      {
        label: "Change Stoat server...",
        type: "normal",
        click: openServerSettings,
      },
      {
        label: mainWindow.isVisible() ? "Hide App" : "Show App",
        type: "normal",
        click() {
          if (mainWindow.isVisible()) {
            mainWindow.hide();
          } else {
            mainWindow.show();
          }
        },
      },
      {
        label: "Quit App",
        type: "normal",
        click: quitApp,
      },
    ]),
  );
}
