import { dialog, BrowserWindow } from 'electron'

export interface SelectFileOptions {
  filters?: { name: string; extensions: string[] }[]
  defaultPath?: string
}

export interface SelectFileResult {
  canceled: boolean
  path: string | null
}

/**
 * @param window Browser window instance
 * @param options File selection options (filters, default path)
 * @returns Selected file path or cancellation status
 */
export function selectFile(
  window: BrowserWindow | null,
  options?: SelectFileOptions
): Promise<SelectFileResult> {
  if (!window) {
    return Promise.resolve({ canceled: true, path: null })
  }

  const dialogOptions: Electron.OpenDialogOptions = {
    properties: ['openFile']
  }

  if (options?.filters) {
    dialogOptions.filters = options.filters
  }

  if (options?.defaultPath) {
    dialogOptions.defaultPath = options.defaultPath
  }

  return dialog.showOpenDialog(window, dialogOptions).then((result) => {
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, path: null }
    }

    return { canceled: false, path: result.filePaths[0] }
  })
}

export interface SelectFolderResult {
  canceled: boolean
  path: string | null
}

/**
 * Show a folder selection dialog
 * @param window Browser window instance
 * @returns Selected folder path or cancellation status
 */
export function selectFolder(window: BrowserWindow | null): Promise<SelectFolderResult> {
  if (!window) {
    return Promise.resolve({ canceled: true, path: null })
  }

  return dialog.showOpenDialog(window, {
    properties: ['openDirectory', 'createDirectory']
  }).then((result) => {
    if (result.canceled || result.filePaths.length === 0) {
      return { canceled: true, path: null }
    }

    return { canceled: false, path: result.filePaths[0] }
  })
}

