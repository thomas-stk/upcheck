const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { startPoll } = require('./poller/index')
const Store = require('electron-store')

// persistent key/value store saved to disk, survives app restarts
const store = new Store()

// fallback config used on first launch before the user has saved any preferences
const defaultConfig = {
  pollIntervalMs: 60000,
  enabledServices: ['claude', 'windsurf', 'sentinelone', 'slack', 'googlecloud', 'intruder', 'apple', 'azure', 'opencve'],
  notificationsEnabled: true
}

const isDev = process.env.NODE_ENV !== 'production'

// module-level so the garbage collector never destroys these objects
let latestStatuses = []
let mainWindow

// Creates the main app window and loads the React UI. 
// In dev, points at the Vite dev server. In prod, loads the built bundle from disk.
 
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // keeps Node APIs out of the renderer. window.api is the only connection
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }
}

app.whenReady().then(() => {
  // reply to renderer requests for current status data
  ipcMain.handle('get-statuses', () => latestStatuses)

  // reply with saved config, or the default if nothing saved yet
  ipcMain.handle('get-config', () => store.get('config', defaultConfig))

  // persist updated config sent from the renderer settings panel
  ipcMain.handle('save-config', (_event, config) => store.set('config', config))

  createWindow()

  // start polling all services immediately, then every pollIntervalMs
  startPoll((results, changed) => {
    latestStatuses = results
    mainWindow.webContents.send('status-update', latestStatuses)
  })
})

// on Mac, clicking the dock icon when no windows are open reopens the window
app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// on Windows/Linux, closing all windows quits the app
// on Mac this is skipped since apps stay running until Cmd+Q
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
