import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import { getExtendedPath } from './utils'
import { REQUIRED_IMAGES, DockerImageConfig } from './config'

const execAsync = promisify(exec)

export interface ImageStatus {
  name: string
  image: string
  description: string
  exists: boolean
  platform?: string
  step?: string
  error?: string
}

/**
 * Docker 이미지 목록 조회
 */
export async function listImages(): Promise<{
  success: boolean
  images?: string[]
  error?: string
}> {
  try {
    const { stdout } = await execAsync('docker images --format "{{.Repository}}:{{.Tag}}"', {
      env: { ...process.env, PATH: getExtendedPath() }
    })
    
    const images = stdout
      .trim()
      .split('\n')
      .filter(line => line.length > 0)
    
    return { success: true, images }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '이미지 목록을 가져올 수 없습니다.'
    }
  }
}

/**
 * Docker 이미지 다운로드
 */
export async function pullImage(
  imageName: string, 
  platform?: string
): Promise<{
  success: boolean
  output?: string
  error?: string
}> {
  try {
    const platformOption = platform ? `--platform ${platform}` : ''
    const command = `docker pull ${platformOption} ${imageName}`.trim()
    
    const { stdout } = await execAsync(command, {
      env: { ...process.env, PATH: getExtendedPath() }
    })
    
    return { success: true, output: stdout.trim() }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || `이미지 ${imageName} 다운로드에 실패했습니다.`
    }
  }
}

/**
 * Docker 이미지 존재 여부 확인
 */
export async function checkImageExists(imageName: string): Promise<{
  exists: boolean
  error?: string
}> {
  try {
    const { stdout } = await execAsync(`docker images -q ${imageName}`, {
      env: { ...process.env, PATH: getExtendedPath() }
    })
    
    return { exists: stdout.trim().length > 0 }
  } catch (error: any) {
    return {
      exists: false,
      error: error.message
    }
  }
}

/**
 * 필요한 모든 이미지의 상태 확인
 */
export async function checkRequiredImages(): Promise<{
  success: boolean
  images?: ImageStatus[]
  error?: string
}> {
  try {
    const statuses: ImageStatus[] = []
    
    for (const config of REQUIRED_IMAGES) {
      const result = await checkImageExists(config.image)
      statuses.push({
        name: config.name,
        image: config.image,
        description: config.description,
        platform: config.platform,
        step: config.step,
        exists: result.exists,
        error: result.error
      })
    }
    
    return { success: true, images: statuses }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '이미지 상태 확인에 실패했습니다.'
    }
  }
}

/**
 * 필요한 이미지 목록 가져오기
 */
export function getRequiredImages(): DockerImageConfig[] {
  return REQUIRED_IMAGES
}

/**
 * 누락된 이미지 다운로드 (콜백으로 진행 상황 전달)
 */
export async function downloadMissingImages(
  onProgress?: (progress: {
    image: string
    name: string
    status: 'downloading' | 'success' | 'error'
    error?: string
  }) => void
): Promise<{
  success: boolean
  results?: Array<{ image: string; success: boolean; error?: string }>
  error?: string
}> {
  try {
    const checkResult = await checkRequiredImages()
    
    if (!checkResult.success || !checkResult.images) {
      return {
        success: false,
        error: checkResult.error || '이미지 확인에 실패했습니다.'
      }
    }
    
    const missingImages = checkResult.images.filter(img => !img.exists)
    
    if (missingImages.length === 0) {
      return {
        success: true,
        results: []
      }
    }
    
    const results = []
    
    for (const imageInfo of missingImages) {
      // 다운로드 시작 알림
      if (onProgress) {
        onProgress({
          image: imageInfo.image,
          name: imageInfo.name,
          status: 'downloading'
        })
      }
      
      const pullResult = await pullImage(imageInfo.image, imageInfo.platform)
      
      // 다운로드 완료 알림
      if (onProgress) {
        onProgress({
          image: imageInfo.image,
          name: imageInfo.name,
          status: pullResult.success ? 'success' : 'error',
          error: pullResult.error
        })
      }
      
      results.push({
        image: imageInfo.image,
        success: pullResult.success,
        error: pullResult.error
      })
    }
    
    return { success: true, results }
  } catch (error: any) {
    return {
      success: false,
      error: error.message || '이미지 다운로드에 실패했습니다.'
    }
  }
}

