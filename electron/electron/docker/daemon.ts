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
    // If Docker is installed but not running
    if (error instanceof Error && error.message.includes('Cannot connect to the Docker daemon')) {
      return {
        running: false,
        error: 'Docker is not running. Please run Docker Desktop.'
      }
    }
    return {
      running: false,
      error: error instanceof Error ? error.message : 'Cannot check Docker status'
    }
  }
}

