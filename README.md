# UpCheck

A lightweight cross-platform desktop app for monitoring the real-time status of your most important services. UpCheck sits in your system tray, polls services every minute, and sends a desktop notification the moment something goes down.

<img width="2624" height="1784" alt="image" src="https://github.com/user-attachments/assets/3695b222-3b64-4ffe-94e5-1d8c9cc57309" />

![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS-blue)
![License](https://img.shields.io/badge/license-AGPL--3.0-green)

## Features

- Monitors 12 services out of the box: Claude, Windsurf, SentinelOne, Slack, Google Cloud, Intruder, Apple, Azure, OpenCVE, GitHub, OpenAI, AWS
- Add or remove any service via custom URL
- Removals persist across restarts
- Desktop notifications when a service changes status
- System tray icon with live worst-case status indicator
- Polls every 60 seconds using Electron's native network stack
- Supports Statuspage.io, custom JSON APIs, RSS feeds, and plain HTTP ping as fallbacks

## Download

Go to the [Releases](../../releases) page and download the installer for your platform:

- **Windows** - `UpCheck Setup x.x.x.exe`
- **macOS** - `UpCheck-x.x.x-universal.dmg` (Intel + Apple Silicon)

> Note: the macOS build is ad-hoc signed but not notarized. After downloading the DMG, macOS may block the app from opening. If that happens, go to **System Settings > Privacy & Security**, scroll down to the security section, and click **Open Anyway**. Windows may show a SmartScreen warning on first launch - click **More info** then **Run anyway**.

## Running from Source

### Prerequisites

- [Node.js](https://nodejs.org) v20 or later
- npm v9 or later

### Setup

```bash
git clone https://github.com/thomas-stk/upcheck.git
cd upcheck
npm install
```

### Development

```bash
npm run electron:dev
```

Starts the Vite dev server and opens Electron pointing at it. Hot reload works in the renderer.

### Production build

```bash
# Windows
npm run dist:win

# macOS
npm run dist:mac
```

Outputs the installer to the `release/` folder.

### Tests

```bash
npm test
```

Runs the Vitest unit test suite (poller logic and utility functions).

## Settings

Open settings via the gear icon in the sidebar.

### General

| Setting | Description |
|---|---|
| Notifications | Send a desktop notification when a service changes status |
| Poll interval | How often to check service statuses (30s, 1m, 5m, or 15m) |

### Window

| Setting | Description |
|---|---|
| Launch at startup | Start UpCheck automatically when you log in |
| Minimize to tray on close | Hide to the system tray instead of quitting when you close the window |

## Default Services

| Service | Status Page |
|---|---|
| Claude | claudestatus.com |
| Windsurf | status.windsurf.com |
| SentinelOne | status.sentinelone.com |
| Slack | slack-status.com |
| Google Cloud | status.cloud.google.com |
| Intruder | status.intruder.io |
| Apple | apple.com/support/systemstatus |
| Azure | status.azure.com |
| OpenCVE | app.opencve.io |
| GitHub | githubstatus.com |
| OpenAI | status.openai.com |
| AWS | health.aws.amazon.com |

You can remove any of these and add your own. Changes persist across restarts.

## Tech Stack

- [Electron](https://www.electronjs.org) - desktop shell
- [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org) - UI
- [Vite](https://vitejs.dev) - frontend bundler
- [Tailwind CSS v4](https://tailwindcss.com) - styling
- [electron-store](https://github.com/sindresorhus/electron-store) - persistent config
- [Vitest](https://vitest.dev) - unit tests

## License

Copyright (c) 2026 thomas-stk

This project is licensed under the GNU Affero General Public License v3.0. See the [LICENSE](LICENSE) file for the full text.

In short: you are free to use, modify, and distribute this software, but any modified version you distribute or run as a service must also be released under the AGPL v3 with source code available.
