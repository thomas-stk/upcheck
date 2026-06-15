const { app, BrowserWindow, ipcMain } = require('electron')
const path = require('path')
const { startPoll, fetchCustom } = require('./poller/index')
const Store = require('electron-store')

const store = new Store()

const defaultConfig = {
  pollIntervalMs: 60000,
  notificationsEnabled: true
}

const isDev = process.env.NODE_ENV !== 'production'

// module-level so the garbage collector never destroys these references
let latestStatuses = []
let mainWindow

const DEFAULT_SERVICES = [
  { id: 'claude',       name: 'Claude',       url: 'https://claudestatus.com'                      },
  { id: 'windsurf',     name: 'Windsurf',     url: 'https://status.windsurf.com'                   },
  { id: 'sentinelone',  name: 'SentinelOne',  url: 'https://status.sentinelone.com'                },
  { id: 'slack',        name: 'Slack',        url: 'https://slack-status.com'                      },
  { id: 'google-cloud', name: 'Google Cloud', url: 'https://status.cloud.google.com'               },
  { id: 'intruder',     name: 'Intruder',     url: 'https://status.intruder.io'                    },
  { id: 'apple',        name: 'Apple',        url: 'https://www.apple.com/support/systemstatus/'   },
  { id: 'azure',        name: 'Azure',        url: 'https://status.azure.com'                      },
  { id: 'opencve',      name: 'OpenCVE',      url: 'https://app.opencve.io'                        },
  { id: 'github',       name: 'GitHub',       url: 'https://www.githubstatus.com'                  },
  { id: 'openai',       name: 'OpenAI',       url: 'https://status.openai.com'                     },
]

// seed defaults on first launch only — subsequent runs load from store so removes/adds persist
if (!store.get('initializedV3')) {
  store.set('customServices', DEFAULT_SERVICES)
  store.set('history', {})
  store.set('initializedV3', true)
}

// rolling history buffer persisted across restarts — last 20 poll readings per service
const historyBuffer = store.get('history', {})

function createWindow() {
  const isMac = process.platform === 'darwin'

  mainWindow = new BrowserWindow({
    width: 1100,
    height: 700,
    frame: isMac ? true : false,
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
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

app.whenReady().then(() => {
  ipcMain.on('window-minimize', () => mainWindow.minimize())
  ipcMain.on('window-maximize', () => mainWindow.isMaximized() ? mainWindow.unmaximize() : mainWindow.maximize())
  ipcMain.on('window-close',    () => mainWindow.close())

  ipcMain.handle('get-statuses', () => latestStatuses)
  ipcMain.handle('get-config',   () => store.get('config', defaultConfig))
  ipcMain.handle('save-config', (_event, config) => {
    if (typeof config !== 'object' || config === null || Array.isArray(config)) {
      throw new Error('Invalid config')
    }
    const allowed = ['pollIntervalMs', 'notificationsEnabled', 'enabledServices']
    const safe = Object.fromEntries(Object.entries(config).filter(([k]) => allowed.includes(k)))
    store.set('config', safe)
  })

  ipcMain.handle('add-service', async (_event, { name, url }) => {
    if (typeof name !== 'string' || typeof url !== 'string') throw new Error('Invalid input')
    if (name.trim().length === 0 || name.length > 200) throw new Error('Invalid name')
    if (url.length > 2000) throw new Error('URL too long')

    let parsed
    try { parsed = new URL(url) } catch { throw new Error('Invalid URL') }
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only http:// and https:// URLs are allowed')

    const customServices = store.get('customServices', [])
    const alreadyExists = customServices.some(s => s.url.replace(/\/$/, '') === url.replace(/\/$/, ''))
    if (alreadyExists) throw new Error('Service already added')

    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-') + '-' + Date.now()
    const result = await fetchCustom(id, name, url)

    customServices.push({ id, name, url })
    store.set('customServices', customServices)

    historyBuffer[id] = [result.indicator]
    store.set('history', historyBuffer)

    latestStatuses = [...latestStatuses, { ...result, history: historyBuffer[id] }]
    mainWindow.webContents.send('status-update', latestStatuses)

    return { success: true, checkType: result.checkType }
  })

  ipcMain.handle('remove-service', (_event, id) => {
    latestStatuses = latestStatuses.filter(s => s.id !== id)
    const customServices = store.get('customServices', []).filter(s => s.id !== id)
    store.set('customServices', customServices)
    delete historyBuffer[id]
    store.set('history', historyBuffer)
    mainWindow.webContents.send('status-update', latestStatuses)
  })

  createWindow()

  startPoll(
    (results) => {
      results.forEach(s => {
        if (!historyBuffer[s.id]) historyBuffer[s.id] = []
        historyBuffer[s.id].push(s.indicator)
        if (historyBuffer[s.id].length > 20) historyBuffer[s.id].shift()
      })
      store.set('history', historyBuffer)
      latestStatuses = results.map(s => ({ ...s, history: historyBuffer[s.id] ?? [] }))
      mainWindow.webContents.send('status-update', latestStatuses)
    },
    () => store.get('customServices', [])
  )
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// on Mac apps stay running after all windows close — quit only on Windows/Linux
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
