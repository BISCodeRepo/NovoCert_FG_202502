import { ipcRenderer, contextBridge } from 'electron'

// --------- Expose some API to the Renderer process ---------
contextBridge.exposeInMainWorld('ipcRenderer', {
  on(...args: Parameters<typeof ipcRenderer.on>) {
    const [channel, listener] = args
    return ipcRenderer.on(channel, (event, ...args) => listener(event, ...args))
  },
  off(...args: Parameters<typeof ipcRenderer.off>) {
    const [channel, ...omit] = args
    return ipcRenderer.off(channel, ...omit)
  },
  send(...args: Parameters<typeof ipcRenderer.send>) {
    const [channel, ...omit] = args
    return ipcRenderer.send(channel, ...omit)
  },
  invoke(...args: Parameters<typeof ipcRenderer.invoke>) {
    const [channel, ...omit] = args
    return ipcRenderer.invoke(channel, ...omit)
  },
})

// Database API 노출
contextBridge.exposeInMainWorld('db', {
  // Projects
  getProjects: () => ipcRenderer.invoke('db:getProjects'),
  getProject: (uuid: string) => ipcRenderer.invoke('db:getProject', uuid),
  addProject: (project: { name: string; status: string; parameters: Record<string, unknown> }) => 
    ipcRenderer.invoke('db:addProject', project),
  updateProject: (uuid: string, updates: { name?: string; status?: string; parameters?: Record<string, unknown> }) => 
    ipcRenderer.invoke('db:updateProject', uuid, updates),
  deleteProject: (uuid: string) => ipcRenderer.invoke('db:deleteProject', uuid),
  getDbPath: () => ipcRenderer.invoke('db:getDbPath'),
  
  // Tasks
  getTasks: () => ipcRenderer.invoke('db:getTasks'),
  getTasksByProject: (projectUuid: string) => ipcRenderer.invoke('db:getTasksByProject', projectUuid),
  getTask: (uuid: string) => ipcRenderer.invoke('db:getTask', uuid),
  addTask: (task: { project_uuid: string; step: string; status: string; parameters: Record<string, unknown> }) => 
    ipcRenderer.invoke('db:addTask', task),
  updateTask: (uuid: string, updates: { step?: string; status?: string; parameters?: Record<string, unknown> }) => 
    ipcRenderer.invoke('db:updateTask', uuid, updates),
  deleteTask: (uuid: string) => ipcRenderer.invoke('db:deleteTask', uuid),
  deleteTasksByProject: (projectUuid: string) => ipcRenderer.invoke('db:deleteTasksByProject', projectUuid),
})

// Docker API 노출
contextBridge.exposeInMainWorld('docker', {
  checkInstalled: () => ipcRenderer.invoke('docker:checkInstalled'),
  checkRunning: () => ipcRenderer.invoke('docker:checkRunning'),
  checkRequiredImages: () => ipcRenderer.invoke('docker:checkRequiredImages'),
  downloadMissingImages: () => ipcRenderer.invoke('docker:downloadMissingImages'),
  pullImage: (imageName: string) => ipcRenderer.invoke('docker:pullImage', imageName),
})

// Dialog API 노출
contextBridge.exposeInMainWorld('dialog', {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
})

// Step API 노출
contextBridge.exposeInMainWorld('step', {
  runStep1: (params: {
    projectName: string
    inputPath: string
    outputPath: string
    uid?: string
    gid?: string
  }) => ipcRenderer.invoke('step:runStep1', params),
})
