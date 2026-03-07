import { app, BrowserWindow, ipcMain, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { database } from './database'
import { findLatestFile, listFiles } from './utils/fs'
import { selectFile, selectFolder } from './utils/dialog'
import { 
  checkDockerInstalled, 
  checkDockerRunning, 
  checkRequiredImages,
  downloadMissingImages,
  pullImage,
  executeStep1Workflow,
  executeStep2Workflow,
  executeStep3Workflow,
  executeStep4Workflow,
  executeStep5Workflow,
  isContainerRunning,
  getContainerExitCode,
  getProjectUuidFromContainer,
  findContainersByProject,
  stopAndCleanupContainer
} from './docker'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, '..')

// 🚧 Use ['ENV_NAME'] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  win = new BrowserWindow({
    icon: path.join(process.env.VITE_PUBLIC, 'electron-vite.svg'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
    },
  })

  // Test active push message to Renderer-process.
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', (new Date).toLocaleString())
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    // win.loadFile('dist/index.html')
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(async () => {
  // Initialize database
  await database.init()
  
  // Register IPC handlers
  setupIpcHandlers()
  
  createWindow()
})

// Setup IPC handlers
function setupIpcHandlers() {
  // Docker handlers
  ipcMain.handle('docker:checkInstalled', async () => {
    return await checkDockerInstalled()
  })

  ipcMain.handle('docker:checkRunning', async () => {
    return await checkDockerRunning()
  })

  ipcMain.handle('docker:checkRequiredImages', async () => {
    return await checkRequiredImages()
  })

  ipcMain.handle('docker:downloadMissingImages', async (event) => {
    return await downloadMissingImages((progress) => {
      event.sender.send('docker:download-progress', progress)
    })
  })

  ipcMain.handle('docker:pullImage', async (_, imageName: string) => {
    return await pullImage(imageName)
  })

  ipcMain.handle('docker:isContainerRunning', async (_, containerId: string) => {
    return await isContainerRunning(containerId)
  })

  ipcMain.handle('docker:getContainerExitCode', async (_, containerId: string) => {
    return await getContainerExitCode(containerId)
  })

  ipcMain.handle('docker:getProjectUuidFromContainer', async (_, containerId: string) => {
    return await getProjectUuidFromContainer(containerId)
  })

  ipcMain.handle('docker:findContainersByProject', async (_, projectUuid: string) => {
    return await findContainersByProject(projectUuid)
  })

  ipcMain.handle('docker:stopAndCleanupContainer', async (_, containerId: string) => {
    return await stopAndCleanupContainer(containerId)
  })

  // Project handlers
  ipcMain.handle('db:getProjects', async () => {
    return await database.projects.getAll()
  })

  ipcMain.handle('db:getProject', async (_, uuid) => {
    return await database.projects.getOne(uuid)
  })

  ipcMain.handle('db:addProject', async (_, project) => {
    return await database.projects.create(project)
  })

  ipcMain.handle('db:updateProject', async (_, uuid, updates) => {
    return await database.projects.update(uuid, updates)
  })

  ipcMain.handle('db:deleteProject', async (_, uuid) => {
    return await database.projects.delete(uuid)
  })

  ipcMain.handle('db:getDbPath', () => {
    return database.projects.getDbPath()
  })

  // Dialog handler - select folder
  ipcMain.handle('dialog:selectFolder', async () => {
    return await selectFolder(win)
  })

  // Dialog handler - select file
  ipcMain.handle('dialog:selectFile', async (_, options?: { 
    filters?: { name: string; extensions: string[] }[]
    defaultPath?: string
  }) => {
    return await selectFile(win, options)
  })

  // File system handler - list files in directory
  ipcMain.handle('fs:listFiles', async (_, directoryPath: string) => {
    return listFiles(directoryPath)
  })

  // File system handler - find the most recent file with a specific extension in the directory
  ipcMain.handle('fs:findLatestFile', async (_, directoryPath: string, extension: string) => {
    return findLatestFile(directoryPath, extension)
  })

  // Shell handler - open file/folder path in file explorer
  ipcMain.handle('shell:openPath', async (_, filePath: string) => {
    try {
      await shell.openPath(filePath)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Shell handler - show item in folder
  ipcMain.handle('shell:showItemInFolder', async (_, filePath: string) => {
    try {
      shell.showItemInFolder(filePath)
      return { success: true }
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
    }
  })

  // Step1 handler
  ipcMain.handle('step:runStep1', async (_, params: {
    projectName: string
    inputPath: string
    outputPath: string
    memory: string
    precursorTolerance: string
    randomSeed: string
  }) => {
    return await executeStep1Workflow(database, params)
  })

  // Step2 handler
  ipcMain.handle('step:runStep2', async (_, params: {
    projectName: string
    outputPath: string
  }) => {
    return await executeStep2Workflow(database, params)
  })

  // Step3 handler
  ipcMain.handle('step:runStep3', async (_, params: {
    projectName: string
    spectraPath: string
    casanovoConfigPath: string
    modelPath: string
    outputPath: string
  }) => {
    return await executeStep3Workflow(database, params)
  })

  // Step4 handler
  ipcMain.handle('step:runStep4', async (_, params: {
    projectName: string
    targetMgfDir: string
    targetResultPath: string
    decoyMgfDir: string
    decoyResultPath: string
    outputPath: string
  }) => {
    return await executeStep4Workflow(database, params)
  })

  // Step5 handler
  ipcMain.handle('step:runStep5', async (_, params: {
    projectName: string
    inputPath: string
    outputPath: string
  }) => {
    return await executeStep5Workflow(database, params)
  })
}
