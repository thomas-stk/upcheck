const { app, BrowserWindow, ipcMain, Tray, Menu, MenuItem, Notification, nativeImage, shell, dialog } = require('electron')
const path = require('path')
const { startPoll, triggerPoll, fetchCustom } = require('./poller/index')
const { worstStatus, buildTooltip } = require('./utils')
const Store = require('electron-store')
const { autoUpdater } = require('electron-updater')

const store = new Store()

const defaultConfig = {
  pollIntervalMs: 60000,
  notificationsEnabled: true,
  minimizeToTray: false,
  launchAtStartup: false,
}

const isDev = !app.isPackaged

const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// without this Windows silently drops toast notifications
if (process.platform === 'win32') app.setAppUserModelId('com.upcheck.app')

// module-level so the GC never collects these
let latestStatuses = []
let mainWindow
let tray
let pollTimer
let updateDownloaded = false
let updateDownloadProgress = 0
let updateChecking = false
const previousIndicators = {}

const DEFAULT_SERVICES = [
  { id: 'claude', name: 'Claude', url: 'https://status.claude.com' },
  { id: 'windsurf', name: 'Windsurf', url: 'https://status.windsurf.com' },
  { id: 'sentinelone', name: 'SentinelOne', url: 'https://status.sentinelone.com' },
  { id: 'slack', name: 'Slack', url: 'https://slack-status.com' },
  { id: 'google-cloud', name: 'Google Cloud', url: 'https://status.cloud.google.com' },
  { id: 'intruder', name: 'Intruder', url: 'https://status.intruder.io' },
  { id: 'apple', name: 'Apple', url: 'https://www.apple.com/support/systemstatus/' },
  { id: 'azure', name: 'Azure', url: 'https://status.azure.com' },
  { id: 'opencve', name: 'OpenCVE', url: 'https://app.opencve.io' },
  { id: 'github', name: 'GitHub', url: 'https://www.githubstatus.com' },
  { id: 'openai', name: 'OpenAI', url: 'https://status.openai.com' },
]

if (!store.get('initializedV3')) {
  store.set('customServices', DEFAULT_SERVICES)
  store.set('history', {})
  store.set('initializedV3', true)
  store.set('migratedClaudeUrl', true)
}

if (!store.get('migratedClaudeUrl')) {
  const services = store.get('customServices', [])
  store.set('customServices', services.map(s =>
    s.id === 'claude' && s.url === 'https://claudestatus.com'
      ? { ...s, url: 'https://status.claude.com' }
      : s
  ))
  store.set('migratedClaudeUrl', true)
}

const historyBuffer = store.get('history', {})

function getConfig() {
  return { ...defaultConfig, ...store.get('config', {}) }
}

// Tray icons: UpCheck logo from file with a small status dot composited in the bottom-right corner.
// toBitmap() / createFromBitmap() operate on raw BGRA pixel data (Skia's native format in Electron).

function compositeOver(sR, sG, sB, sA, dR, dG, dB, dA) {
  const oA = sA + dA * (1 - sA)
  if (oA < 0.001) return [0, 0, 0, 0]
  const f = 1 - sA
  return [
    (sR * sA + dR * dA * f) / oA,
    (sG * sA + dG * dA * f) / oA,
    (sB * sA + dB * dA * f) / oA,
    oA,
  ]
}

function createTrayIcon(dr, dg, db) {
  const isMac    = process.platform === 'darwin'
  const filename = isMac ? 'tray-color_22.png' : 'tray-color_32.png'
  const trayDir  = isDev
    ? path.join(__dirname, '../public/tray')
    : path.join(__dirname, '../dist/tray')
  const logoPath = path.join(trayDir, filename)

  const base           = nativeImage.createFromPath(logoPath)
  const { width: w, height: h } = base.getSize()
  const bitmap         = Buffer.from(base.toBitmap())  // BGRA, mutable copy

  // Status dot: antialiased circle in the bottom-right corner, scaled to image size
  const scale   = Math.min(w, h) / 32
  const rFill   = 4.0 * scale
  const rBorder = 5.5 * scale
  const cx = w - 5.5 * scale, cy = h - 5.5 * scale

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      const i = (py * w + px) * 4
      const d = Math.sqrt((px + 0.5 - cx) ** 2 + (py + 0.5 - cy) ** 2)

      const fillA   = Math.max(0, Math.min(1, rFill   + 0.5 - d))
      const borderA = Math.max(0, Math.min(1, rBorder + 0.5 - d)) * (1 - fillA)

      if (fillA < 0.001 && borderA < 0.001) continue

      // Read BGRA
      const eB = bitmap[i]   / 255, eG = bitmap[i+1] / 255
      const eR = bitmap[i+2] / 255, eA = bitmap[i+3] / 255

      let [oR, oG, oB, oA] = [eR, eG, eB, eA]

      if (borderA > 0.001) {
        ;[oR, oG, oB, oA] = compositeOver(0, 0, 0, borderA * 0.8, oR, oG, oB, oA)
      }
      if (fillA > 0.001) {
        ;[oR, oG, oB, oA] = compositeOver(dr / 255, dg / 255, db / 255, fillA, oR, oG, oB, oA)
      }

      // Write BGRA
      bitmap[i]   = Math.round(oB * 255)
      bitmap[i+1] = Math.round(oG * 255)
      bitmap[i+2] = Math.round(oR * 255)
      bitmap[i+3] = Math.round(oA * 255)
    }
  }

  return nativeImage.createFromBitmap(bitmap, { width: w, height: h })
}

// wait until after app ready before calling nativeImage
let _trayIcons = null
function trayIcons() {
  if (!_trayIcons) {
    _trayIcons = {
      operational: createTrayIcon(74,  222, 128),  // #4ade80
      degraded:    createTrayIcon(251, 191,  36),  // #fbbf24
      outage:      createTrayIcon(248, 113, 113),  // #f87171
      unknown:     createTrayIcon(110, 110, 130),
    }
  }
  return _trayIcons
}

let _dotIcons = null
function dotIcons() {
  if (!_dotIcons) {
    const dir = isDev
      ? path.join(__dirname, '../public/tray')
      : path.join(__dirname, '../dist/tray')
    const load = file => nativeImage.createFromPath(path.join(dir, file)).resize({ width: 12, height: 12 })
    _dotIcons = {
      operational: load('dot-operational_16.png'),
      degraded:    load('dot-degraded_16.png'),
      outage:      load('dot-outage_16.png'),
      unknown:     load('dot-unknown_16.png'),
    }
  }
  return _dotIcons
}

// Tray menu and state

function buildTrayMenu() {
  const cap = s => s.charAt(0).toUpperCase() + s.slice(1)

  // enabled: false makes the items non-clickable, which is the standard way
  // to show read-only status info inside a native menu
  const serviceItems = latestStatuses.length > 0
    ? latestStatuses.map(s => ({
        label:   `${s.name}: ${cap(s.indicator)}`,
        icon:    dotIcons()[s.indicator] ?? dotIcons().unknown,
        enabled: false,
      }))
    : [{ label: 'Checking services…', enabled: false }]

  let updateItem = []
  if (updateDownloaded) {
    updateItem = [{ label: 'Install Update & Restart', click: () => { app.isQuiting = true; autoUpdater.quitAndInstall() } }]
  } else if (updateDownloadProgress > 0 && updateDownloadProgress < 100) {
    updateItem = [{ label: `Downloading update... ${updateDownloadProgress}%`, enabled: false }]
  } else if (updateChecking) {
    updateItem = [{ label: 'Checking for updates...', enabled: false }]
  } else {
    updateItem = [{ label: 'Check for Updates', click: () => { updateChecking = true; refreshTray(); autoUpdater.checkForUpdates() } }]
  }

  return Menu.buildFromTemplate([
    ...serviceItems,
    { type: 'separator' },
    { label: 'Open UpCheck', click: () => { mainWindow?.show(); mainWindow?.focus() } },
    ...updateItem,
    { type: 'separator' },
    { label: 'Quit', click: () => { app.isQuiting = true; app.quit() } },
  ])
}

function refreshTray() {
  if (!tray) return
  tray.setImage(trayIcons()[worstStatus(latestStatuses)])
  const base = buildTooltip(latestStatuses)
  if (updateDownloadProgress > 0 && updateDownloadProgress < 100) {
    tray.setToolTip(`${base}\nDownloading update... ${updateDownloadProgress}%`)
  } else {
    tray.setToolTip(base)
  }
  tray.setContextMenu(buildTrayMenu())
}

// Poll results

function handlePollResults(results, changed) {
  const customServices = store.get('customServices', [])
  const urlMap = Object.fromEntries(customServices.map(s => [s.id, s.url]))
  results.forEach(s => {
    if (!historyBuffer[s.id]) historyBuffer[s.id] = []
    historyBuffer[s.id].push(s.indicator)
    if (historyBuffer[s.id].length > 20) historyBuffer[s.id].shift()
  })
  store.set('history', historyBuffer)
  latestStatuses = results.map(s => ({ ...s, url: urlMap[s.id] ?? '', history: historyBuffer[s.id] ?? [] }))

  refreshTray()

  const config = getConfig()
  changed.forEach(s => {
    const prev = previousIndicators[s.id]
    previousIndicators[s.id] = s.indicator

    // first time we've seen this service, just record the state and move on
    if (prev === undefined) return
    if (!config.notificationsEnabled || !Notification.isSupported()) return

    if (s.indicator === 'outage') {
      new Notification({ title: `${s.name} is down`, silent: false }).show()
    } else if (s.indicator === 'operational' && prev === 'outage') {
      new Notification({ title: `${s.name} is back up`, silent: false }).show()
    }
  })

  if (mainWindow) mainWindow.webContents.send('status-update', latestStatuses)
}

// Tray

function createTray() {
  tray = new Tray(trayIcons().unknown)
  tray.setToolTip('UpCheck:Starting…')
  tray.setContextMenu(buildTrayMenu())

  if (process.platform !== 'darwin') {
    // on Windows, left-click should toggle the window
    // right-click already shows the context menu we set above, no extra wiring needed
    tray.on('click', () => {
      if (mainWindow?.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow?.show()
        mainWindow?.focus()
      }
    })
  }
  // on Mac, clicking the menu bar icon automatically pops the context menu
  // setContextMenu handles that connection for us
}

// Window

function createWindow() {
  const isMac = process.platform === 'darwin'

  const iconFile = isMac ? '../public/icon-512.png' : '../public/icon-256.png'
  const iconPath = isDev
    ? path.join(__dirname, iconFile)
    : path.join(__dirname, iconFile.replace('../public/', '../dist/'))

  mainWindow = new BrowserWindow({
    width:     1200,
    height:    780,
    minWidth:  900,
    minHeight: 600,
    icon:      iconPath,
    frame:         isMac ? true  : false,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      webSecurity:      true,
    },
  })

  mainWindow.on('close', (event) => {
    if (getConfig().minimizeToTray && !app.isQuiting) {
      event.preventDefault()
      mainWindow.hide()
    }
  })

  if (!isDev) {
    mainWindow.webContents.session.webRequest.onHeadersReceived((details, callback) => {
      callback({
        responseHeaders: {
          ...details.responseHeaders,
          'Content-Security-Policy': [
            "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'"
          ],
        },
      })
    })
  }

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

// Startup

app.whenReady().then(() => {
  const initialConfig = getConfig()
  app.setLoginItemSettings({ openAtLogin: initialConfig.launchAtStartup === true })

  ipcMain.on('window-minimize', () => mainWindow.minimize())
  ipcMain.on('window-maximize', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize())
  ipcMain.on('window-close',    () => mainWindow.close())

  ipcMain.handle('get-statuses',  () => latestStatuses)
  ipcMain.handle('get-config',    () => getConfig())
  ipcMain.handle('trigger-poll',  () => triggerPoll(handlePollResults, () => store.get('customServices', [])))
  ipcMain.handle('open-url', (_event, url) => {
    if (typeof url === 'string' && /^https?:\/\//i.test(url)) shell.openExternal(url)
  })

  ipcMain.handle('get-dismissed-incidents', () => store.get('dismissedIncidents', {}))
  ipcMain.handle('dismiss-incidents', (_event, incidents) => {
    if (!Array.isArray(incidents)) throw new Error('Invalid input')
    const existing = store.get('dismissedIncidents', {})
    for (const { id, updatedAt } of incidents) {
      if (typeof id !== 'string' || typeof updatedAt !== 'string') continue
      existing[id] = updatedAt
    }
    store.set('dismissedIncidents', existing)
  })
  ipcMain.handle('save-config', (_event, config) => {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      throw new Error('Invalid config')
    }
    const allowed = ['pollIntervalMs', 'notificationsEnabled', 'enabledServices', 'minimizeToTray', 'launchAtStartup']
    const safe = Object.fromEntries(Object.entries(config).filter(([k]) => allowed.includes(k)))

    const prev = getConfig()
    store.set('config', { ...prev, ...safe })

    if (typeof safe.pollIntervalMs === 'number') {
      if (!Number.isFinite(safe.pollIntervalMs) || safe.pollIntervalMs < 10_000 || safe.pollIntervalMs > 3_600_000)
        throw new Error('pollIntervalMs must be between 10s and 1h')
    }

    if (typeof safe.pollIntervalMs === 'number' && safe.pollIntervalMs !== prev.pollIntervalMs) {
      if (pollTimer) clearInterval(pollTimer)
      pollTimer = startPoll(handlePollResults, () => store.get('customServices', []), safe.pollIntervalMs)
    }

    if (typeof safe.launchAtStartup === 'boolean') {
      app.setLoginItemSettings({ openAtLogin: safe.launchAtStartup })
    }
  })

  ipcMain.handle('add-service', async (_event, { name, url }) => {
    if (typeof name !== 'string' || typeof url !== 'string') throw new Error('Invalid input')
    if (name.trim().length === 0 || name.length > 200)      throw new Error('Invalid name')
    if (url.length > 2000)                                   throw new Error('URL too long')

    let parsed
    try { parsed = new URL(url) } catch { throw new Error('Invalid URL') }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only http:// and https:// URLs are allowed')

    const customServices = store.get('customServices', [])
    if (customServices.some(s => s.url.replace(/\/$/, '') === url.replace(/\/$/, ''))) {
      throw new Error('Service already added')
    }

    const id     = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now()
    const result = await fetchCustom(id, name, url)

    customServices.push({ id, name, url })
    store.set('customServices', customServices)

    historyBuffer[id] = [result.indicator]
    store.set('history', historyBuffer)

    latestStatuses = [...latestStatuses, { ...result, url, history: historyBuffer[id] }]
    mainWindow.webContents.send('status-update', latestStatuses)
    refreshTray()

    return { success: true, checkType: result.checkType }
  })

  ipcMain.handle('remove-service', (_event, id) => {
    latestStatuses = latestStatuses.filter(s => s.id !== id)
    const customServices = store.get('customServices', []).filter(s => s.id !== id)
    store.set('customServices', customServices)
    delete historyBuffer[id]
    store.set('history', historyBuffer)
    mainWindow.webContents.send('status-update', latestStatuses)
    refreshTray()
  })

  createWindow()
  createTray()

  if (process.platform === 'darwin') {
    const menu = Menu.getApplicationMenu()
    if (menu?.items[0]?.submenu) {
      const appSubmenu = menu.items[0].submenu
      const afterAbout = appSubmenu.items.findIndex(i => i.type === 'separator')
      const insertAt = afterAbout >= 0 ? afterAbout : 1
      appSubmenu.insert(insertAt, new MenuItem({ type: 'separator' }))
      appSubmenu.insert(insertAt, new MenuItem({
        label: 'Check for Updates...',
        click: () => { updateChecking = true; refreshTray(); autoUpdater.checkForUpdates() },
      }))
      Menu.setApplicationMenu(menu)
    }
  }

  if (!isDev) {
    autoUpdater.checkForUpdates()

    autoUpdater.on('error', (err) => {
      updateChecking = false
      refreshTray()
      console.error('Auto-updater error:', err)
      new Notification({ title: 'UpCheck update error', body: err.message ?? 'Unknown error' }).show()
    })

    autoUpdater.on('update-available', (info) => {
      updateChecking = false
      new Notification({ title: 'UpCheck update available', body: `v${info.version} is downloading...` }).show()
    })

    autoUpdater.on('update-not-available', () => {
      updateChecking = false
      refreshTray()
      new Notification({ title: 'UpCheck is up to date', body: `You're running the latest version.` }).show()
    })

    autoUpdater.on('download-progress', (progress) => {
      updateDownloadProgress = Math.round(progress.percent)
      refreshTray()
    })

    autoUpdater.on('update-downloaded', () => {
      updateDownloaded = true
      updateDownloadProgress = 0
      refreshTray()
      dialog.showMessageBox({
        type: 'info',
        title: 'Update Ready',
        message: 'UpCheck has been updated.',
        detail: 'Restart now to apply the update, or continue and restart later.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      }).then(({ response }) => {
        if (response === 0) {
          app.isQuiting = true
          autoUpdater.quitAndInstall()
        }
      })
    })
  }

  pollTimer = startPoll(
    handlePollResults,
    () => store.get('customServices', []),
    initialConfig.pollIntervalMs,
  )
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('before-quit', () => {
  app.isQuiting = true
  if (tray) {
    tray.destroy()
    tray = null
  }
})
