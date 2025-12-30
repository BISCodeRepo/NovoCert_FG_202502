import { spawn, ChildProcess } from 'node:child_process'
import { getExtendedPath } from './utils'
import fs from 'node:fs'
import path from 'node:path'

interface DockerRunOptions {
  image: string
  containerName: string
  volumes?: string[]  // ['/host/path:/container/path']
  environment?: Record<string, string>
  command?: string[]
  platform?: string
  autoRemove?: boolean
  logFilePath?: string  // log file path (optional)
}

interface DockerRunResult {
  success: boolean
  containerId?: string
  error?: string
  process?: ChildProcess
  logFilePath?: string  // log file path
}

/**
 * Run a Docker container.
 */
export async function runDockerContainer(options: DockerRunOptions): Promise<DockerRunResult> {
  const {
    image,
    containerName,
    volumes = [],
    environment = {},
    command = [],
    platform,
    autoRemove = true,
    logFilePath
  } = options

  return new Promise((resolve) => {
    const args: string[] = ['run']

    // Detached mode (background execution) - always used
    args.push('-d')

    // Auto remove option (can use --rm in detached mode)
    if (autoRemove) {
      args.push('--rm')
    }

    // Container name
    args.push('--name', containerName)

    // Specify platform
    if (platform) {
      args.push('--platform', platform)
    }

    // Volume mount (bind mount)
    volumes.forEach(volume => {
      args.push('-v', volume)
    })

    // Environment variables
    Object.entries(environment).forEach(([key, value]) => {
      args.push('-e', `${key}=${value}`)
    })

    // Image name
    args.push(image)

    // Additional command
    if (command.length > 0) {
      args.push(...command)
    }

    console.log('Docker run command:', 'docker', args.join(' '))

    // Initialize log file
    if (logFilePath) {
      const logDir = path.dirname(logFilePath)
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
      // Record start information in log file
      fs.appendFileSync(logFilePath, `=== Docker container started: ${containerName} ===\n`)
      fs.appendFileSync(logFilePath, `Command: docker ${args.join(' ')}\n`)
      fs.appendFileSync(logFilePath, `Timestamp: ${new Date().toISOString()}\n\n`)
    }

    // Use extended PATH to execute docker command (detached mode)
    const dockerProcess = spawn('docker', args, {
      detached: false,
      stdio: ['ignore', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PATH: getExtendedPath()
      }
    })

    let containerId = ''
    let errorOutput = ''

    // Collect stdout (only container ID)
    dockerProcess.stdout?.on('data', (data) => {
      const output = data.toString().trim()
      containerId = output
      console.log('Container started:', containerId)
    })

    // Collect stderr
    dockerProcess.stderr?.on('data', (data) => {
      const output = data.toString()
      errorOutput += output
      console.error('Docker stderr:', output)
    })

    // Process exit (if container ID is received in detached mode, exit immediately)
    dockerProcess.on('close', (code) => {
      if (code === 0 && containerId) {
        console.log(`Container started in background: ${containerId}`)
        
        if (logFilePath) {
          startLogCollection(containerId, logFilePath)
        }
        
        resolve({
          success: true,
          containerId: containerId,
          logFilePath
        })
      } else {
        if (logFilePath) {
          fs.appendFileSync(logFilePath, `\n=== Container start failed ===\n`)
          fs.appendFileSync(logFilePath, `Error: ${errorOutput || `Docker exited with code ${code}`}\n`)
        }
        
        resolve({
          success: false,
          error: errorOutput || `Docker exited with code ${code}`,
          logFilePath
        })
      }
    })

    dockerProcess.on('error', (error) => {
      const message = `Docker process error: ${error.message}\n`
      console.error(message)
      
      if (logFilePath) {
        fs.appendFileSync(logFilePath, message)
      }
      
      resolve({
        success: false,
        error: error.message,
        logFilePath
      })
    })
  })
}

/**
 * Collect container logs in background and save to file.
 */
function startLogCollection(containerId: string, logFilePath: string) {
  const logProcess = spawn('docker', ['logs', '-f', containerId], {
    env: {
      ...process.env,
      PATH: getExtendedPath()
    }
  })

  const logStream = fs.createWriteStream(logFilePath, { flags: 'a' })

  logProcess.stdout?.on('data', (data) => {
    logStream.write(`[STDOUT] ${data.toString()}`)
  })

  logProcess.stderr?.on('data', (data) => {
    logStream.write(`[STDERR] ${data.toString()}`)
  })

  logProcess.on('close', (code) => {
    logStream.write(`\n=== Container finished (exit code: ${code}) ===\n`)
    logStream.end()
  })

  logProcess.on('error', (error) => {
    logStream.write(`\n=== Log collection error: ${error.message} ===\n`)
    logStream.end()
  })
}

/**
 * Stop a running container.
 */
export async function stopContainer(containerName: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const dockerProcess = spawn('docker', ['stop', containerName], {
      env: {
        ...process.env,
        PATH: getExtendedPath()
      }
    })

    let errorOutput = ''

    dockerProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString()
    })

    dockerProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true })
      } else {
        resolve({ success: false, error: errorOutput || `Failed to stop container ${containerName}` })
      }
    })

    dockerProcess.on('error', (error) => {
      resolve({ success: false, error: error.message })
    })
  })
}

/**
 * Get the logs of a container.
 */
export async function getContainerLogs(containerName: string): Promise<{ success: boolean; logs?: string; error?: string }> {
  return new Promise((resolve) => {
    const dockerProcess = spawn('docker', ['logs', containerName], {
      env: {
        ...process.env,
        PATH: getExtendedPath()
      }
    })

    let logs = ''
    let errorOutput = ''

    dockerProcess.stdout?.on('data', (data) => {
      logs += data.toString()
    })

    dockerProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString()
    })

    dockerProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, logs: logs + errorOutput })
      } else {
        resolve({ success: false, error: errorOutput })
      }
    })

    dockerProcess.on('error', (error) => {
      resolve({ success: false, error: error.message })
    })
  })
}
