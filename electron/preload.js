const { contextBridge, ipcRenderer } = require('electron')

// window.api is the only surface the renderer can touch.
// anything not listed here is completely inaccessible from the UI.
contextBridge.exposeInMainWorld('api', {

  getStatuses: () => ipcRenderer.invoke('get-statuses'),
  getConfig:   () => ipcRenderer.invoke('get-config'),
  saveConfig:  (config) => ipcRenderer.invoke('save-config', config),

  // the renderer passes a callback, main fires it after every poll.
  // _event is the raw IPC event object, not useful here so it gets dropped.
  onStatusUpdate: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('status-update', handler)
    return () => ipcRenderer.removeListener('status-update', handler)
  },

  addService:    (name, url) => ipcRenderer.invoke('add-service', { name, url }),
  removeService: (id)        => ipcRenderer.invoke('remove-service', id),

  getDismissedIncidents: ()          => ipcRenderer.invoke('get-dismissed-incidents'),
  dismissIncidents:      (incidents) => ipcRenderer.invoke('dismiss-incidents', incidents),

  openUrl:     (url) => ipcRenderer.invoke('open-url', url),
  triggerPoll: ()    => ipcRenderer.invoke('trigger-poll'),

  platform: process.platform,

  // frameless window on Windows means we draw our own title bar controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose:    () => ipcRenderer.send('window-close'),

})
