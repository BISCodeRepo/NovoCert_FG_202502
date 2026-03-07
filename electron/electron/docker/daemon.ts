import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { getExtendedPath } from './utils'

const execAsync = promisify(exec)

/**
 * Check if the Docker daemon is running
 * Check if Docker is running by using the docker info command.
 */
export async function checkDockerRunning(): Promise<{
  running: boolean
  info?: string
  error?: string
}> {
  try {
    const { stdout } = await execAsync('docker info', {
      env: { ...process.env, PATH: getExtendedPath() }
    })
    return { running: true, info: stdout.trim() }
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : ''
    
    if (errorMsg.includes('Cannot connect to the Docker daemon')) {
      return {
        running: false,
        error: 'Docker is not running. Please start Docker Desktop.'
      }
    }
    
    if (errorMsg.includes('not found') || errorMsg.includes('not recognized')) {
      return {
        running: false,
        error: 'Docker is not installed. Please install Docker Desktop first.'
      }
    }

    return {
      running: false,
      error: 'Cannot check Docker status. Please ensure Docker Desktop is installed and running.'
    }
  }
}

