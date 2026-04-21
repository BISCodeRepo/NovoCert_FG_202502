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

// Expose Database API
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
})

// Expose Docker API
contextBridge.exposeInMainWorld('docker', {
  checkInstalled: () => ipcRenderer.invoke('docker:checkInstalled'),
  checkRunning: () => ipcRenderer.invoke('docker:checkRunning'),
  checkRequiredImages: () => ipcRenderer.invoke('docker:checkRequiredImages'),
  downloadMissingImages: () => ipcRenderer.invoke('docker:downloadMissingImages'),
  pullImage: (imageName: string) => ipcRenderer.invoke('docker:pullImage', imageName),
  isContainerRunning: (containerId: string) => ipcRenderer.invoke('docker:isContainerRunning', containerId),
  getContainerExitCode: (containerId: string) => ipcRenderer.invoke('docker:getContainerExitCode', containerId),
  getProjectUuidFromContainer: (containerId: string) => ipcRenderer.invoke('docker:getProjectUuidFromContainer', containerId),
  findContainersByProject: (projectUuid: string) => ipcRenderer.invoke('docker:findContainersByProject', projectUuid),
  stopAndCleanupContainer: (containerId: string) => ipcRenderer.invoke('docker:stopAndCleanupContainer', containerId),
})

// Expose Dialog API
contextBridge.exposeInMainWorld('dialog', {
  selectFolder: () => ipcRenderer.invoke('dialog:selectFolder'),
  selectFile: (options?: { 
    filters?: { name: string; extensions: string[] }[]
    defaultPath?: string
  }) => ipcRenderer.invoke('dialog:selectFile', options),
})

// Expose File System API
contextBridge.exposeInMainWorld('fs', {
  listFiles: (directoryPath: string) => ipcRenderer.invoke('fs:listFiles', directoryPath),
  findLatestFile: (directoryPath: string, extension: string) => ipcRenderer.invoke('fs:findLatestFile', directoryPath, extension),
})

// Expose Shell API
contextBridge.exposeInMainWorld('shell', {
  openPath: (filePath: string) => ipcRenderer.invoke('shell:openPath', filePath),
  showItemInFolder: (filePath: string) => ipcRenderer.invoke('shell:showItemInFolder', filePath),
})

// Expose Step API
contextBridge.exposeInMainWorld('step', {
  runStep1: (params: {
    projectName: string
    inputPath: string
    outputPath: string
    memory: string
    precursorTolerance: string
    randomSeed: string
  }) => ipcRenderer.invoke('step:runStep1', params),
  runStep2: (params: {
    projectName: string
    outputPath: string
  }) => ipcRenderer.invoke('step:runStep2', params),
  runStep3: (params: {
    projectName: string
    spectraPath: string
    casanovoConfigPath: string
    modelPath: string
    outputPath: string
  }) => ipcRenderer.invoke('step:runStep3', params),
  runStep4: (params: {
    projectName: string
    targetSpectraMgfPath: string
    targetDnpsPath: string
    decoySpectraMgfPath: string
    decoyDnpsPath: string
    outputPath: string
  }) => ipcRenderer.invoke('step:runStep4', params),
  runStep5: (params: {
    projectName: string
    inputPath: string
    outputPath: string
  }) => ipcRenderer.invoke('step:runStep5', params),
  runStep6: (params: {
    projectName: string
    csvFilePath: string
    previousStepPath: string
    pinFilePath?: string
  }) => ipcRenderer.invoke('step:runStep6', params),
})
