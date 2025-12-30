import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { getExtendedPath } from './utils'

const execAsync = promisify(exec)

/**
 * Check if Docker is installed
 * Check if Docker is installed by using the which/where command to find the docker executable and check the version.
 */
export async function checkDockerInstalled(): Promise<{
  installed: boolean
  version?: string
  error?: string
}> {
  try {
    // which/where command to find the docker executable file
    const findCommand = process.platform === 'win32' ? 'where docker' : 'which docker'
    
    await execAsync(findCommand, {
      env: { ...process.env, PATH: getExtendedPath() }
    })
    
    // If docker is found, check the version
    const { stdout } = await execAsync('docker --version', {
      env: { ...process.env, PATH: getExtendedPath() }
    })
    
    return { installed: true, version: stdout.trim() }
  } catch (error: unknown) {
    return {
      installed: false,
      error: error instanceof Error ? error.message : 'Docker is not installed'
    }
  }
}

