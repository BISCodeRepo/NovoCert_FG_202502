import { runDockerContainer } from '../../container'
import { REQUIRED_IMAGES } from '../../config'
import { generateLogFilePath } from '../../utils'
import type { Step5ContainerParams, DockerRunResult } from './types'

/**
 * Step5 (Percolator and FDR Control - p4 이미지 사용)을 위한 Docker 컨테이너를 실행합니다.
 */
export async function runStep5Container(params: Step5ContainerParams): Promise<DockerRunResult> {
  const { projectName, inputPath, outputPath, logPath, taskUuid } = params
  
  const step5Image = REQUIRED_IMAGES.find(img => img.step === 'step5')
  
  if (!step5Image) {
    return { success: false, error: 'Step5 이미지를 찾을 수 없습니다.' }
  }

  const containerName = `step5-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`

  // 로그 파일 경로 생성
  const logFilePath = generateLogFilePath(logPath, '5', taskUuid)

  // Docker 컨테이너 실행 (bind mount 사용)
  // docker-compose.yml 기준 (p4 이미지):
  // - inputPath -> /app/t_d.pin
  // - outputPath -> /app/output
  return await runDockerContainer({
    image: step5Image.image,
    containerName,
    volumes: [
      `${inputPath}:/app/t_d.pin`,
      `${outputPath}:/app/output`
    ],
    environment: { PROJECT_NAME: projectName },
    platform: step5Image.platform,
    autoRemove: true,
    command: [],
    logFilePath
  })
}

