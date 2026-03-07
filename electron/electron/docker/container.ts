import { spawn, ChildProcess } from 'node:child_process'
import { getExtendedPath } from './utils'
import fs from 'node:fs'
import path from 'node:path'
import { Transform } from 'node:stream'

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

// Track active log collection processes to prevent duplicates and enable cleanup
const activeLogProcesses = new Map<string, { process: ReturnType<typeof spawn>; stream: fs.WriteStream }>()

/**
 * Collect container logs in background and save to file.
 * Prevents duplicate log collection for the same container.
 */
function startLogCollection(containerId: string, logFilePath: string) {
  // Check if log collection is already running for this container
  if (activeLogProcesses.has(containerId)) {
    console.log(`[startLogCollection] Log collection already running for container ${containerId}, skipping`)
    return
  }

  const logProcess = spawn('docker', ['logs', '-f', containerId], {
    env: {
      ...process.env,
      PATH: getExtendedPath()
    }
  })

  // Create write stream with explicit buffer size to prevent memory buildup
  const logStream = fs.createWriteStream(logFilePath, { 
    flags: 'a',
    highWaterMark: 64 * 1024 // 64KB buffer (default is 16KB, but we want to reduce writes)
  })

  // Track this process
  activeLogProcesses.set(containerId, { process: logProcess, stream: logStream })

  // 접두사를 붙여주는 안전한 변환 스트림 생성기
  const createPrefixStream = (prefix: string) => {
    return new Transform({
      transform(chunk, _encoding, callback) {
        // chunk를 메모리에 누적하지 않고 바로 다음 스트림으로 전달
        callback(null, `${prefix}${chunk.toString()}`)
      }
    })
  }

  // Transform streams for cleanup tracking
  const stdoutTransform = logProcess.stdout ? createPrefixStream('[STDOUT] ') : null
  const stderrTransform = logProcess.stderr ? createPrefixStream('[STDERR] ') : null

  // Cleanup function
  const cleanup = () => {
    activeLogProcesses.delete(containerId)
    // Remove all event listeners to prevent memory leaks
    logProcess.removeAllListeners()
    // Destroy transform streams
    if (stdoutTransform && !stdoutTransform.destroyed) {
      stdoutTransform.destroy()
    }
    if (stderrTransform && !stderrTransform.destroyed) {
      stderrTransform.destroy()
    }
    // Ensure stream is closed and flushed
    if (!logStream.destroyed) {
      logStream.end(() => {
        // Stream is fully closed
      })
    }
    // Kill the process if it's still running
    if (!logProcess.killed && logProcess.pid) {
      try {
        logProcess.kill('SIGTERM')
      } catch (error) {
        // Process might already be terminated
      }
    }
  }

  // on('data') 대신 pipe()를 사용하여 Backpressure(메모리 폭발) 완벽 차단
  if (logProcess.stdout && stdoutTransform) {
    logProcess.stdout
      .pipe(stdoutTransform)
      .pipe(logStream, { end: false }) // end: false는 stdout이 끝나도 logStream을 닫지 않음
  }

  if (logProcess.stderr && stderrTransform) {
    logProcess.stderr
      .pipe(stderrTransform)
      .pipe(logStream, { end: false })
  }

  logProcess.on('close', async (code) => {
    // Note: 'code' is the exit code of the 'docker logs -f' process, not the container
    // We need to check the actual container exit code
    if (!logStream.destroyed) {
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
    }
    
    cleanup()
  })

  logProcess.on('error', (error) => {
    if (!logStream.destroyed) {
      logStream.write(`\n=== Log collection error: ${error.message} ===\n`)
    }
    cleanup()
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
 * 1. Stop any active log collection for this container
 * 2. Try to stop gracefully (docker stop)
 * 3. If that fails or container is still running, force kill (docker kill)
 * 4. Remove the container (docker rm -f)
 * Note: If container was started with --rm, it may already be removed automatically.
 */
export async function stopAndCleanupContainer(containerId: string): Promise<{ success: boolean; error?: string }> {
  // Stop log collection for this container if it's running
  if (activeLogProcesses.has(containerId)) {
    const { process: logProcess, stream } = activeLogProcesses.get(containerId)!
    try {
      if (!logProcess.killed && logProcess.pid) {
        logProcess.kill('SIGTERM')
      }
      if (!stream.destroyed) {
        stream.end()
      }
      logProcess.removeAllListeners()
      activeLogProcesses.delete(containerId)
    } catch (error) {
      console.error(`Error stopping log collection for container ${containerId}:`, error)
    }
  }

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
 * ⚠️ WARNING: This function loads all logs into memory, which can cause memory issues for large logs.
 * Consider using getLogFileTail() instead to read only the last N lines from the log file.
 * 
 * @deprecated Use getLogFileTail() for reading log files instead of loading all logs into memory.
 */
export async function getContainerLogs(containerName: string): Promise<{ success: boolean; logs?: string; error?: string }> {
  return new Promise((resolve) => {
    const dockerProcess = spawn('docker', ['logs', '--tail', '1000', containerName], {
      env: {
        ...process.env,
        PATH: getExtendedPath()
      }
    })

    let logs = ''
    let errorOutput = ''
    let totalSize = 0
    const MAX_SIZE = 10 * 1024 * 1024 // 10MB limit to prevent memory explosion

    dockerProcess.stdout?.on('data', (data) => {
      totalSize += data.length
      if (totalSize < MAX_SIZE) {
        logs += data.toString()
      } else {
        // Stop collecting if size exceeds limit
        if (!dockerProcess.killed) {
          dockerProcess.kill('SIGTERM')
        }
        resolve({ 
          success: false, 
          error: `Log size exceeds ${MAX_SIZE / 1024 / 1024}MB limit. Use getLogFileTail() to read log file directly.` 
        })
      }
    })

    dockerProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString()
    })

    dockerProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, logs: logs + errorOutput })
      } else {
        resolve({ success: false, error: errorOutput || `Docker exited with code ${code}` })
      }
    })

    dockerProcess.on('error', (error) => {
      resolve({ success: false, error: error.message })
    })
  })
}

/**
 * Read the last N lines from a log file without loading the entire file into memory.
 * This is the recommended way to read log files, especially for large files.
 * 
 * @param logFilePath Path to the log file
 * @param lines Number of lines to read from the end (default: 1000)
 * @returns Last N lines of the log file
 */
export async function getLogFileTail(logFilePath: string, lines: number = 1000): Promise<{ success: boolean; logs?: string; error?: string }> {
  return new Promise((resolve) => {
    // Check if file exists
    if (!fs.existsSync(logFilePath)) {
      resolve({ success: false, error: `Log file not found: ${logFilePath}` })
      return
    }

    // Use tail command (Unix/Mac) or PowerShell (Windows) to read last N lines
    // This avoids loading the entire file into memory
    const isWindows = process.platform === 'win32'
    const command = isWindows ? 'powershell' : 'tail'
    const args = isWindows 
      ? ['-Command', `Get-Content "${logFilePath}" -Tail ${lines}`]
      : ['-n', String(lines), logFilePath]

    const tailProcess = spawn(command, args, {
      env: {
        ...process.env,
        PATH: getExtendedPath()
      }
    })

    let logs = ''
    let errorOutput = ''

    tailProcess.stdout?.on('data', (data) => {
      logs += data.toString()
    })

    tailProcess.stderr?.on('data', (data) => {
      errorOutput += data.toString()
    })

    tailProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, logs })
      } else {
        resolve({ success: false, error: errorOutput || `Tail command exited with code ${code}` })
      }
    })

    tailProcess.on('error', (error) => {
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
