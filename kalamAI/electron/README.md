# KalamAI Desktop App

Electron wrapper that packages KalamAI as a native desktop app for Windows, macOS, and Linux.

## Prerequisites

- Node.js 18+
- Docker (to run the KalamAI backend)

## Quick start (development)

```bash
# 1 — Start the backend
cd ..
docker compose up -d

# 2 — Install Electron dependencies
cd electron
npm install

# 3 — Launch the desktop app
npm start
```

The app connects to `http://localhost:3000` by default.
Set `KALAMAI_URL=https://your-server.com` to point to a production instance.

## Build installers

```bash
npm install
npm run dist:win    # → dist-electron/KalamAI Setup x.x.x.exe
npm run dist:mac    # → dist-electron/KalamAI-x.x.x.dmg
npm run dist:linux  # → dist-electron/KalamAI-x.x.x.AppImage
npm run dist:all    # → all three platforms
```

> **Icon files required for packaging:**
> Place these in `electron/icons/`:
> - `icon.ico` (Windows, 256×256)
> - `icon.icns` (macOS)
> - `icon.png` (Linux, 512×512)
>
> Convert `icon.svg` → PNG using: `npx svgexport icons/icon.svg icons/icon.png 512:512`
> Then PNG → ICO/ICNS using an online converter or `electron-icon-builder`.
