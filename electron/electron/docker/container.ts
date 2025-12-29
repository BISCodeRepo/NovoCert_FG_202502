import { spawn, ChildProcess } from 'node:child_process'
import { getExtendedPath } from './utils'
import fs from 'node:fs'
import path from 'node:path'

interface DockerRunOptions {
  image: string
  containerName: string
  uid?: string
  gid?: string
  volumes?: string[]  // ['/host/path:/container/path']
  environment?: Record<string, string>
  command?: string[]
  platform?: string
  autoRemove?: boolean
  logFilePath?: string  // 로그를 저장할 파일 경로 (옵션)
}

interface DockerRunResult {
  success: boolean
  containerId?: string
  error?: string
  process?: ChildProcess
  logFilePath?: string  // 로그 파일 경로
}

/**
 * Docker 컨테이너를 실행합니다.
 */
export async function runDockerContainer(options: DockerRunOptions): Promise<DockerRunResult> {
  const {
    image,
    containerName,
    uid,
    gid,
    volumes = [],
    environment = {},
    command = [],
    platform,
    autoRemove = true,
    logFilePath
  } = options

  return new Promise((resolve) => {
    const args: string[] = ['run']

    // Detached 모드 (백그라운드 실행) - 항상 사용
    args.push('-d')

    // Auto remove 옵션 (detached 모드에서는 --rm 사용 가능)
    if (autoRemove) {
      args.push('--rm')
    }

    // 컨테이너 이름
    args.push('--name', containerName)

    // 사용자/그룹 ID 설정
    if (uid && gid) {
      args.push('--user', `${uid}:${gid}`)
    }

    // 플랫폼 지정
    if (platform) {
      args.push('--platform', platform)
    }

    // 볼륨 마운트 (bind mount)
    volumes.forEach(volume => {
      args.push('-v', volume)
    })

    // 환경 변수
    Object.entries(environment).forEach(([key, value]) => {
      args.push('-e', `${key}=${value}`)
    })

    // 이미지 이름
    args.push(image)

    // 추가 명령어
    if (command.length > 0) {
      args.push(...command)
    }

    console.log('Docker run command:', 'docker', args.join(' '))

    // 로그 파일 초기화
    if (logFilePath) {
      const logDir = path.dirname(logFilePath)
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true })
      }
      // 로그 파일에 시작 정보 기록
      fs.appendFileSync(logFilePath, `=== Docker container started: ${containerName} ===\n`)
      fs.appendFileSync(logFilePath, `Command: docker ${args.join(' ')}\n`)
      fs.appendFileSync(logFilePath, `Timestamp: ${new Date().toISOString()}\n\n`)
    }

    // 확장된 PATH를 사용하여 docker 명령어 실행 (detached 모드)
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

    // stdout 수집 (컨테이너 ID만 받음)
    dockerProcess.stdout?.on('data', (data) => {
      const output = data.toString().trim()
      containerId = output
      console.log('Container started:', containerId)
    })

    // stderr 수집
    dockerProcess.stderr?.on('data', (data) => {
      const output = data.toString()
      errorOutput += output
      console.error('Docker stderr:', output)
    })

    // 프로세스 종료 (detached 모드에서는 컨테이너 ID를 받으면 바로 종료)
    dockerProcess.on('close', (code) => {
      if (code === 0 && containerId) {
        // 컨테이너가 성공적으로 시작됨 - 즉시 return
        console.log(`Container started in background: ${containerId}`)
        
        // 로그 수집을 백그라운드에서 시작
        if (logFilePath) {
          startLogCollection(containerId, logFilePath)
        }
        
        resolve({
          success: true,
          containerId: containerId,
          logFilePath
        })
      } else {
        // 컨테이너 시작 실패
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

    // 프로세스 에러
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
 * 백그라운드에서 컨테이너 로그를 수집하여 파일에 저장합니다.
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
 * 실행 중인 컨테이너를 중지합니다.
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
 * 컨테이너의 로그를 가져옵니다.
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
