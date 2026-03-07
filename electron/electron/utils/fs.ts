import fs from 'node:fs'
import path from 'node:path'

export interface ListFilesResult {
  success: boolean
  files: string[]
  error: string | null
}

/**
 * List files in a directory
 * @param directoryPath The path to the directory
 * @returns List of file names in the directory
 */
export function listFiles(directoryPath: string): ListFilesResult {
  try {
    if (!fs.existsSync(directoryPath)) {
      return { success: false, files: [], error: 'Directory does not exist' }
    }

    const stats = fs.statSync(directoryPath)
    if (!stats.isDirectory()) {
      return { success: false, files: [], error: 'Not a directory' }
    }

    const entries = fs.readdirSync(directoryPath)
    const files = entries.filter(entry => {
      const fullPath = path.join(directoryPath, entry)
      return fs.statSync(fullPath).isFile()
    })

    return { success: true, files, error: null }
  } catch (error) {
    return {
      success: false,
      files: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }
  }
}

export interface FindLatestFileResult {
  success: boolean
  path: string | null
  error: string | null
}

/**
 * Find the most recently modified file with a specific extension in a directory
 * @param directoryPath The path to the directory to search
 * @param extension The file extension (e.g. "mgf", ".mgf", "yaml", ".yaml")
 * @returns The full path of the found file or error information
 */
export function findLatestFile(directoryPath: string, extension: string): FindLatestFileResult {
  try {
    if (!fs.existsSync(directoryPath)) {
      return { success: false, error: 'Directory does not exist', path: null }
    }

    const stats = fs.statSync(directoryPath)
    if (!stats.isDirectory()) {
      return { success: false, error: 'Not a directory', path: null }
    }

    // Normalize the extension (handle dot inclusion)
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
          mtime: fileStats.mtime.getTime() // Last modified time
        }
      })

    if (matchingFiles.length === 0) {
      return { 
        success: false, 
        error: `No ${normalizedExtension} files in directory`, 
        path: null 
      }
    }

    // Find the most recently modified file
    const latestFile = matchingFiles.sort((a, b) => b.mtime - a.mtime)[0]
    
    return { success: true, path: latestFile.path, error: null }
  } catch (error) {
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred', 
      path: null 
    }
  }
}

