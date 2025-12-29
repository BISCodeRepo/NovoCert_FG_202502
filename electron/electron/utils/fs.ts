import fs from 'node:fs'
import path from 'node:path'

export interface FindLatestFileResult {
  success: boolean
  path: string | null
  error: string | null
}

/**
 * 디렉토리에서 특정 확장자를 가진 가장 최근 수정된 파일을 찾습니다.
 * @param directoryPath 검색할 디렉토리 경로
 * @param extension 파일 확장자 (예: "mgf", ".mgf", "yaml", ".yaml")
 * @returns 찾은 파일의 전체 경로 또는 에러 정보
 */
export function findLatestFile(directoryPath: string, extension: string): FindLatestFileResult {
  try {
    if (!fs.existsSync(directoryPath)) {
      return { success: false, error: '디렉토리가 존재하지 않습니다', path: null }
    }

    const stats = fs.statSync(directoryPath)
    if (!stats.isDirectory()) {
      return { success: false, error: '디렉토리가 아닙니다', path: null }
    }

    // 확장자 정규화 (점 포함 여부와 관계없이 처리)
    const normalizedExtension = extension.startsWith('.') 
      ? extension.toLowerCase() 
      : `.${extension.toLowerCase()}`

    const files = fs.readdirSync(directoryPath)
    const matchingFiles = files
      .filter(file => file.toLowerCase().endsWith(normalizedExtension))
      .map(file => {
        const filePath = path.join(directoryPath, file)
        const fileStats = fs.statSync(filePath)
        return {
          name: file,
          path: filePath,
          mtime: fileStats.mtime.getTime() // 수정 시간
        }
      })

    if (matchingFiles.length === 0) {
      return { 
        success: false, 
        error: `디렉토리에 ${normalizedExtension} 파일이 없습니다`, 
        path: null 
      }
    }

    // 가장 최근 수정된 파일 찾기
    const latestFile = matchingFiles.sort((a, b) => b.mtime - a.mtime)[0]
    
    return { success: true, path: latestFile.path, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다', 
      path: null 
    }
  }
}

