import { app, BrowserWindow, ipcMain, dialog } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { database } from './database'
import { 
  checkDockerInstalled, 
  checkDockerRunning, 
  checkRequiredImages,
  downloadMissingImages,
  pullImage,
  executeStep1Workflow
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
  // 데이터베이스 초기화
  await database.init()
  
  // IPC 핸들러 등록
  setupIpcHandlers()
  
  createWindow()
})

// IPC 핸들러 설정
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

  // Task handlers
  ipcMain.handle('db:getTasks', async () => {
    return await database.tasks.getAll()
  })

  ipcMain.handle('db:getTasksByProject', async (_, projectUuid) => {
    return await database.tasks.getByProject(projectUuid)
  })

  ipcMain.handle('db:getTask', async (_, uuid) => {
    return await database.tasks.getOne(uuid)
  })

  ipcMain.handle('db:addTask', async (_, task) => {
    return await database.tasks.create(task)
  })

  ipcMain.handle('db:updateTask', async (_, uuid, updates) => {
    return await database.tasks.update(uuid, updates)
  })

  ipcMain.handle('db:deleteTask', async (_, uuid) => {
    return await database.tasks.delete(uuid)
  })

  ipcMain.handle('db:deleteTasksByProject', async (_, projectUuid) => {
    return await database.tasks.deleteByProject(projectUuid)
  })

  // Dialog 핸들러 - 폴더 선택
  ipcMain.handle('dialog:selectFolder', async () => {
    if (!win) {
      return { canceled: true, path: null }
    }
    
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory', 'createDirectory']
    })
    
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, path: null }
    }
    
    return { canceled: false, path: result.filePaths[0] }
  })

  // Step1 실행 핸들러
  ipcMain.handle('step:runStep1', async (_, params: {
    projectName: string
    inputPath: string
    outputPath: string
    taskUuid: string
    uid?: string
    gid?: string
  }) => {
    return await executeStep1Workflow(database, params)
  })
}
