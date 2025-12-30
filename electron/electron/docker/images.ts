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
 * Get the list of Docker images
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
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Cannot get image list'
    }
  }
}

/**
 * Download a Docker image
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
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : `Failed to download image ${imageName}`
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
  } catch (error: unknown) {
    return {
      exists: false,
      error: error instanceof Error ? error.message : 'Cannot check image exists'
    }
  }
}

/**
 * Check the status of all required images
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
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Cannot check image status'
    }
  }
}

/**
 * Get the list of required images
 */
export function getRequiredImages(): DockerImageConfig[] {
  return REQUIRED_IMAGES
}

/**
 * Download missing images (pass progress through callback)
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
        error: checkResult.error || 'Failed to check image exists'
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
      if (onProgress) {
        onProgress({
          image: imageInfo.image,
          name: imageInfo.name,
          status: 'downloading'
        })
      }
      
      const pullResult = await pullImage(imageInfo.image, imageInfo.platform)
      
      // Download complete notification
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
  } catch (error: unknown) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to download image'
    }
  }
}

