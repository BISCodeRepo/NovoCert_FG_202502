import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { getExtendedPath } from './utils'

const execAsync = promisify(exec)

/**
 * Docker 설치 여부 확인
 * which/where 명령어로 docker 실행 파일을 찾고 버전을 확인합니다.
 */
export async function checkDockerInstalled(): Promise<{
  installed: boolean
  version?: string
  error?: string
}> {
  try {
    // which/where 명령어로 docker 실행 파일 찾기
    const findCommand = process.platform === 'win32' ? 'where docker' : 'which docker'
    
    await execAsync(findCommand, {
      env: { ...process.env, PATH: getExtendedPath() }
    })
    
    // docker 찾았으면 버전 확인
    const { stdout } = await execAsync('docker --version', {
      env: { ...process.env, PATH: getExtendedPath() }
    })
    
    return { installed: true, version: stdout.trim() }
  } catch (error: any) {
    return {
      installed: false,
      error: 'Docker가 설치되어 있지 않습니다.'
    }
  }
}

