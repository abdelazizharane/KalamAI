/**
 * KalamAI Desktop — Electron main process.
 *
 * Wraps the KalamAI web app in a native window.
 * By default connects to http://localhost:3000 (Docker).
 * Override with KALAMAI_URL environment variable for production.
 *
 * Build for distribution:
 *   npm run dist:win   → Windows installer (.exe)
 *   npm run dist:mac   → macOS disk image (.dmg)
 *   npm run dist:linux → Linux AppImage / .deb
 */

const { app, BrowserWindow, shell, session, Menu, ipcMain } = require("electron");
const path = require("path");

const SERVER_URL = process.env.KALAMAI_URL || "http://localhost:3000";

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width:  1280,
    height: 800,
    minWidth:  800,
    minHeight: 600,
    title: "KalamAI",
    // Use a custom title bar on Windows/Linux; hidden on macOS (traffic lights overlay)
    titleBarStyle: process.platform === "darwin" ? "hiddenInset" : "default",
    backgroundColor: "#0d1a1b",
    icon: path.join(__dirname, "icons", "icon.png"),
    webPreferences: {
      nodeIntegration:       false,
      contextIsolation:      true,
      sandbox:               true,
      preload:               path.join(__dirname, "preload.js"),
      // Required for camera/mic/screen capture inside the app
      webSecurity:           true,
      allowRunningInsecureContent: false,
    },
  });

  // Grant media permissions automatically (camera, mic, screen)
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowed = ["media", "display-capture", "mediaKeySystem", "geolocation"];
    callback(allowed.includes(permission));
  });

  // Handle screen capture permission (Electron 15+)
  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    callback({ video: "screen" });
  });

  mainWindow.loadURL(SERVER_URL);

  // Open external links in system browser, not inside Electron
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith(SERVER_URL)) {
      shell.openExternal(url);
      return { action: "deny" };
    }
    return { action: "allow" };
  });

  // Minimal application menu
  const menu = Menu.buildFromTemplate([
    {
      label: "KalamAI",
      submenu: [
        { label: "New Meeting",   click: () => mainWindow.loadURL(SERVER_URL + "/?action=new") },
        { label: "Dashboard",     click: () => mainWindow.loadURL(SERVER_URL + "/dashboard") },
        { type: "separator" },
        { label: "Reload",        role: "reload" },
        { label: "Toggle DevTools", role: "toggleDevTools" },
        { type: "separator" },
        { role: "quit" },
      ],
    },
    { label: "Edit",   role: "editMenu"   },
    { label: "Window", role: "windowMenu" },
  ]);
  Menu.setApplicationMenu(menu);

  mainWindow.on("closed", () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => { if (!mainWindow) createWindow(); }); // macOS re-open
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// Prevent navigation away from the app domain
app.on("web-contents-created", (_e, contents) => {
  contents.on("will-navigate", (event, url) => {
    if (!url.startsWith(SERVER_URL)) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
});
