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
    ipcRenderer.on('status-update', (_event, data) => callback(data))
  },

})
