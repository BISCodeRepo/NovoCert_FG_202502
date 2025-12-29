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
 * 파일 선택 다이얼로그를 표시합니다.
 * @param window 브라우저 윈도우 인스턴스
 * @param options 파일 선택 옵션 (필터, 기본 경로)
 * @returns 선택된 파일 경로 또는 취소 여부
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
 * 폴더 선택 다이얼로그를 표시합니다.
 * @param window 브라우저 윈도우 인스턴스
 * @returns 선택된 폴더 경로 또는 취소 여부
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

