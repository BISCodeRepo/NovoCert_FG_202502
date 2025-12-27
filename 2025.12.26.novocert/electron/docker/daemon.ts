import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { getExtendedPath } from './utils'

const execAsync = promisify(exec)

/**
 * Docker Daemon 실행 여부 확인
 * docker info 명령어로 Docker가 실행 중인지 확인합니다.
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
  } catch (error: any) {
    // Docker는 설치되어 있지만 실행되지 않는 경우
    if (error.message.includes('Cannot connect to the Docker daemon')) {
      return {
        running: false,
        error: 'Docker가 실행되고 있지 않습니다. Docker Desktop을 실행해주세요.'
      }
    }
    return {
      running: false,
      error: error.message || 'Docker 상태를 확인할 수 없습니다.'
    }
  }
}

