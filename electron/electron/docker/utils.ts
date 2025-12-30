import path from 'node:path'

// 확장된 PATH로 명령어 실행을 위한 유틸리티
export function getExtendedPath(): string {
  const basePath = process.env.PATH || ''
  
  if (process.platform === 'win32') {
    return basePath
  }
  
  // macOS/Linux: 일반적인 Docker 설치 경로 추가
  const additionalPaths = [
    '/usr/local/bin',
    '/usr/bin',
    '/opt/homebrew/bin',
    '/Applications/Docker.app/Contents/Resources/bin'
  ]
  
  return `${basePath}:${additionalPaths.join(':')}`
}

/**
 * Generate a log file path.
 * @param logPath The directory path to save the log file
 * @param stepNumber Step number (e.g. "1", "2")
 * @param taskUuid The unique ID of the Task
 * @returns The generated log file path
 */
export function generateLogFilePath(logPath: string, stepNumber: string, taskUuid: string): string {
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-')
  return path.join(logPath, `step${stepNumber}-${taskUuid}-${dateStr}-${timeStr}.log`)
}

