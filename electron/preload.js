// Pont mínim entre la pàgina i el procés principal (vegeu main.js).
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('natiu', {
  obte: url => ipcRenderer.invoke('obte', url),
  obre: url => ipcRenderer.invoke('obre', url),
});
