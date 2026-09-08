const { contextBridge, ipcRenderer } = require('electron');

// Steam 기본 정보
contextBridge.exposeInMainWorld('steam', {
  isAvailable:  () => ipcRenderer.sendSync('steam:available'),
  getUserName:  () => ipcRenderer.sendSync('steam:getUserName'),
});

// Steam 도전과제
contextBridge.exposeInMainWorld('steamAchievement', {
  unlock:     (id) => ipcRenderer.invoke('achievement:unlock', id),
  isUnlocked: (id) => ipcRenderer.sendSync('achievement:isUnlocked', id),
});
