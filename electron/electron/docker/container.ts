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
  labels?: Record<string, string>  // Docker labels (e.g., { 'project_uuid': 'xxx', 'step': '1' })
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
    logFilePath,
    labels = {}
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

    // Labels
    Object.entries(labels).forEach(([key, value]) => {
      args.push('--label', `${key}=${value}`)
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

  logProcess.on('close', async (code) => {
    // Note: 'code' is the exit code of the 'docker logs -f' process, not the container
    // We need to check the actual container exit code
    logStream.write(`\n=== Log collection process finished (exit code: ${code}) ===\n`)
    
    // Get the actual container exit code (single attempt)
    try {
      const exitCodeResult = await getContainerExitCode(containerId)
      
      if (exitCodeResult.success && exitCodeResult.exitCode !== null) {
        logStream.write(`=== Container actual exit code: ${exitCodeResult.exitCode} ===\n`)
        if (exitCodeResult.exitCode === 0) {
          logStream.write(`=== Container completed successfully ===\n`)
        } else {
          logStream.write(`=== Container exited with error (exit code: ${exitCodeResult.exitCode}) ===\n`)
        }
      } else {
        // Container not found or exit code unavailable (likely removed by --rm)
        logStream.write(`=== Could not retrieve container exit code ===\n`)
        if (exitCodeResult.error) {
          logStream.write(`Error: ${exitCodeResult.error}\n`)
        }
        // If log collection process exited with code 0, it usually means container finished normally
        if (code === 0) {
          logStream.write(`=== Log collection finished normally, assuming container completed (exit code: 0) ===\n`)
        }
      }
    } catch (error) {
      logStream.write(`=== Error checking container exit code: ${error instanceof Error ? error.message : 'Unknown error'} ===\n`)
      if (code === 0) {
        logStream.write(`=== Log collection finished normally, assuming container completed (exit code: 0) ===\n`)
      }
    }
    
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
 * Kill a running container (force stop).
 */
export async function killContainer(containerId: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const dockerProcess = spawn('docker', ['kill', containerId], {
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
        resolve({ success: false, error: errorOutput || `Failed to kill container ${containerId}` })
      }
    })

    dockerProcess.on('error', (error) => {
      resolve({ success: false, error: error.message })
    })
  })
}

/**
 * Remove a container (even if it's running, use force).
 */
export async function removeContainer(containerId: string): Promise<{ success: boolean; error?: string }> {
  return new Promise((resolve) => {
    const dockerProcess = spawn('docker', ['rm', '-f', containerId], {
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
        // If container removal is already in progress (--rm option), treat as success
        if (errorOutput.includes('already in progress') || errorOutput.includes('No such container')) {
          resolve({ success: true })
        } else {
          resolve({ success: false, error: errorOutput || `Failed to remove container ${containerId}` })
        }
      }
    })

    dockerProcess.on('error', (error) => {
      resolve({ success: false, error: error.message })
    })
  })
}

/**
 * Stop and clean up a container completely.
 * 1. Try to stop gracefully (docker stop)
 * 2. If that fails or container is still running, force kill (docker kill)
 * 3. Remove the container (docker rm -f)
 * Note: If container was started with --rm, it may already be removed automatically.
 */
export async function stopAndCleanupContainer(containerId: string): Promise<{ success: boolean; error?: string }> {
  // First, try to stop gracefully
  const stopResult = await stopContainer(containerId)
  
  if (!stopResult.success) {
    // If stop failed, try to kill
    const killResult = await killContainer(containerId)
    if (!killResult.success) {
      // If kill also failed, still try to remove (might be already stopped)
      const removeResult = await removeContainer(containerId)
      // If removal succeeded or container doesn't exist, consider it success
      if (removeResult.success) {
        return { success: true }
      }
      return { success: false, error: `Failed to stop/kill container: ${stopResult.error || killResult.error}` }
    }
  }

  // Remove the container (force remove to ensure cleanup)
  // Note: If container was started with --rm, it may already be removed automatically
  const removeResult = await removeContainer(containerId)
  
  // If removal succeeded or container is already being removed (--rm), consider it success
  if (removeResult.success) {
    return { success: true }
  }

  // If removal failed but container doesn't exist anymore, consider it success
  if (removeResult.error?.includes('No such container')) {
    return { success: true }
  }

  return { success: false, error: `Container stopped but failed to remove: ${removeResult.error}` }
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

/**
 * Check if a container is running.
 * @param containerId Container ID or name
 * @returns true if container is running, false otherwise
 */
export async function isContainerRunning(containerId: string): Promise<{ success: boolean; running: boolean; error?: string }> {
  return new Promise((resolve) => {
    // Use docker ps with filter to check if container is running
    const dockerProcess = spawn('docker', ['ps', '--filter', `id=${containerId}`, '--format', '{{.ID}}'], {
      env: {
        ...process.env,
        PATH: getExtendedPath()
      }
    })

    let output = ''
    let errorOutput = ''

    dockerProcess.stdout?.on('data', (data) => {
      output += data.toString()
    })

    dockerProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString()
    })

    dockerProcess.on('close', (code) => {
      if (code === 0) {
        // If output is not empty, container is running
        const running = output.trim().length > 0
        resolve({ success: true, running })
      } else {
        resolve({ success: false, running: false, error: errorOutput || `Docker exited with code ${code}` })
      }
    })

    dockerProcess.on('error', (error) => {
      resolve({ success: false, running: false, error: error.message })
    })
  })
}

/**
 * Get container exit code.
 * @param containerId Container ID or name
 * @returns Exit code if container has exited, null if still running or error
 */
export async function getContainerExitCode(containerId: string): Promise<{ success: boolean; exitCode: number | null; error?: string }> {
  return new Promise((resolve) => {
    // Use docker inspect to get both container status and exit code
    // Format: "STATUS|EXITCODE" (e.g., "exited|0" or "running|0")
    const dockerProcess = spawn('docker', ['inspect', '--format', '{{.State.Status}}|{{.State.ExitCode}}', containerId], {
      env: {
        ...process.env,
        PATH: getExtendedPath()
      }
    })

    let output = ''
    let errorOutput = ''

    dockerProcess.stdout?.on('data', (data) => {
      output += data.toString()
    })

    dockerProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString()
    })

    dockerProcess.on('close', (code) => {
      if (code === 0) {
        const outputStr = output.trim()
        if (outputStr === '' || outputStr === '<no value>') {
          // Container not found
          resolve({ success: true, exitCode: null })
          return
        }

        // Parse status and exit code
        const parts = outputStr.split('|')
        const status = parts[0]?.trim()
        const exitCodeStr = parts[1]?.trim()

        // Only return exit code if container has actually exited
        if (status === 'exited' || status === 'dead') {
          if (exitCodeStr === '' || exitCodeStr === '<no value>') {
            resolve({ success: true, exitCode: null })
          } else {
            const exitCode = parseInt(exitCodeStr, 10)
            if (isNaN(exitCode)) {
              resolve({ success: true, exitCode: null })
            } else {
              resolve({ success: true, exitCode })
            }
          }
        } else {
          // Container is still running or in another state
          resolve({ success: true, exitCode: null })
        }
      } else {
        resolve({ success: false, exitCode: null, error: errorOutput || `Docker exited with code ${code}` })
      }
    })

    dockerProcess.on('error', (error) => {
      resolve({ success: false, exitCode: null, error: error.message })
    })
  })
}

/**
 * Get project UUID from a container by checking its labels.
 * @param containerId Container ID or name
 * @returns Project UUID if found, null otherwise
 */
export async function getProjectUuidFromContainer(containerId: string): Promise<{ success: boolean; projectUuid: string | null; error?: string }> {
  return new Promise((resolve) => {
    // Use docker inspect to get container labels
    const dockerProcess = spawn('docker', ['inspect', '--format', '{{index .Config.Labels "project_uuid"}}', containerId], {
      env: {
        ...process.env,
        PATH: getExtendedPath()
      }
    })

    let output = ''
    let errorOutput = ''

    dockerProcess.stdout?.on('data', (data) => {
      output += data.toString()
    })

    dockerProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString()
    })

    dockerProcess.on('close', (code) => {
      if (code === 0) {
        const projectUuid = output.trim()
        resolve({ success: true, projectUuid: projectUuid || null })
      } else {
        resolve({ success: false, projectUuid: null, error: errorOutput || `Docker exited with code ${code}` })
      }
    })

    dockerProcess.on('error', (error) => {
      resolve({ success: false, projectUuid: null, error: error.message })
    })
  })
}

/**
 * Find all running containers for a specific project UUID.
 * @param projectUuid Project UUID
 * @returns Array of container IDs
 */
export async function findContainersByProject(projectUuid: string): Promise<{ success: boolean; containerIds: string[]; error?: string }> {
  return new Promise((resolve) => {
    // Use docker ps with label filter to find containers
    const dockerProcess = spawn('docker', ['ps', '--filter', `label=project_uuid=${projectUuid}`, '--format', '{{.ID}}'], {
      env: {
        ...process.env,
        PATH: getExtendedPath()
      }
    })

    let output = ''
    let errorOutput = ''

    dockerProcess.stdout?.on('data', (data) => {
      output += data.toString()
    })

    dockerProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString()
    })

    dockerProcess.on('close', (code) => {
      if (code === 0) {
        const containerIds = output.trim().split('\n').filter(id => id.length > 0)
        resolve({ success: true, containerIds })
      } else {
        resolve({ success: false, containerIds: [], error: errorOutput || `Docker exited with code ${code}` })
      }
    })

    dockerProcess.on('error', (error) => {
      resolve({ success: false, containerIds: [], error: error.message })
    })
  })
}
