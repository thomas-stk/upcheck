const { contextBridge, ipcRenderer } = require('electron')

// exposeInMainWorld creates window.api in the React renderer.
// React can only call what's explicitly listed here - nothing else from Node is accessible.
contextBridge.exposeInMainWorld('api', {

  // request/response — React asks for data, main returns it
  getStatuses: () => ipcRenderer.invoke('get-statuses'),
  getConfig:   () => ipcRenderer.invoke('get-config'),
  saveConfig:  (config) => ipcRenderer.invoke('save-config', config),

  // push subscription - React registers a callback, main calls it every poll cycle.
  // _event is the raw IPC event object we don't need, underscore = intentionally ignored.
  onStatusUpdate: (callback) => {
    const handler = (_event, data) => callback(data)
    ipcRenderer.on('status-update', handler)
    return () => ipcRenderer.removeListener('status-update', handler)
  },

  addService:    (name, url) => ipcRenderer.invoke('add-service', { name, url }),
  removeService: (id)       => ipcRenderer.invoke('remove-service', id),

  // frameless window controls
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose:    () => ipcRenderer.send('window-close'),

})
