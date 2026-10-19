import { app, BrowserWindow, dialog, ipcMain } from 'electron'
import { mkdir, readdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {
  registerQuasarRuntime,
  resolveElectronAssetsPath
} from '#q-app/electron/main'

// needed in case process is undefined under Linux
const platform = process.platform || os.platform()
const windowDirtyState = new Map()

ipcMain.handle('studio:cwd', () => process.cwd())

ipcMain.handle('studio:stat', async (_event, targetPath) => {
  try {
    const stats = await stat(targetPath)
    return {
      exists: true,
      isDirectory: stats.isDirectory(),
      isFile: stats.isFile()
    }
  } catch (error) {
    if (error?.code === 'ENOENT') {
      return {
        exists: false,
        isDirectory: false,
        isFile: false
      }
    }
    throw error
  }
})

ipcMain.handle('studio:readdir', (_event, targetPath) => readdir(targetPath))

ipcMain.handle('studio:readFile', (_event, targetPath) => readFile(targetPath, 'utf8'))

ipcMain.handle('studio:writeFile', (_event, targetPath, content) => writeFile(targetPath, content, 'utf8'))
ipcMain.handle('studio:mkdir', (_event, targetPath) => mkdir(targetPath))
ipcMain.handle('studio:rename', (_event, oldPath, newPath) => rename(oldPath, newPath))
ipcMain.handle('studio:remove', (_event, targetPath, isDirectory) => rm(targetPath, { recursive: isDirectory, force: false }))
ipcMain.on('studio:setWindowDirty', (event, isDirty) => {
  windowDirtyState.set(event.sender.id, Boolean(isDirty))
})

async function createWindow () {
  /**
   * Initial window options
   */
  const mainWindow = new BrowserWindow({
    icon: resolveElectronAssetsPath('icons/icon.png'), // Windows and Linux
    width: 1000,
    height: 600,
    useContentSize: true,
    webPreferences: {
      contextIsolation: true,
      // https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
      preload: path.join(import.meta.dirname, 'electron-preload.cjs')
    }
  })
  const webContentsId = mainWindow.webContents.id

  if (import.meta.env.QUASAR_DEV) {
    await mainWindow.loadURL(import.meta.env.QUASAR_APP_URL)
  } else {
    await mainWindow.loadFile('index.html')
  }

  if (import.meta.env.QUASAR_DEBUG) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools()
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }

  mainWindow.on('close', (event) => {
    if (!windowDirtyState.get(webContentsId)) return
    const choice = dialog.showMessageBoxSync(mainWindow, {
      type: 'warning',
      title: 'Unsaved changes',
      message: 'You have unsaved changes.',
      detail: 'Close the window and discard unsaved changes?',
      buttons: ['Cancel', 'Discard Changes'],
      defaultId: 0,
      cancelId: 0
    })
    if (choice === 0) {
      event.preventDefault()
    }
  })

  mainWindow.on('closed', () => {
    windowDirtyState.delete(webContentsId)
  })
}

void app.whenReady().then(() => {
  registerQuasarRuntime()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})
