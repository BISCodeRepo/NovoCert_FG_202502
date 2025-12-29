import { runDockerContainer } from '../../container'
import { REQUIRED_IMAGES } from '../../config'
import { generateLogFilePath } from '../../utils'
import type { Step4ContainerParams, DockerRunResult } from './types'

/**
 * Step4 (Feature Calculation - p3 이미지 사용)을 위한 Docker 컨테이너를 실행합니다.
 */
export async function runStep4Container(params: Step4ContainerParams): Promise<DockerRunResult> {
  const { projectName, targetMgfDir, targetResultPath, decoyMgfDir, decoyResultPath, outputPath, logPath, taskUuid } = params
  
  const step4Image = REQUIRED_IMAGES.find(img => img.step === 'step4')
  
  if (!step4Image) {
    return { success: false, error: 'Step4 이미지를 찾을 수 없습니다.' }
  }

  const containerName = `step4-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`

  // 로그 파일 경로 생성
  const logFilePath = generateLogFilePath(logPath, '4', taskUuid)

  // Docker 컨테이너 실행 (bind mount 사용)
  // docker-compose.yml 기준 (p3 이미지):
  // - targetMgfDir -> /app/target/mgf
  // - targetResultPath -> /app/target/result.mztab
  // - decoyMgfDir -> /app/decoy/mgf
  // - decoyResultPath -> /app/decoy/result.mztab
  // - outputPath -> /app/output
  return await runDockerContainer({
    image: step4Image.image,
    containerName,
    volumes: [
      `${targetMgfDir}:/app/target/mgf`,
      `${targetResultPath}:/app/target/result.mztab`,
      `${decoyMgfDir}:/app/decoy/mgf`,
      `${decoyResultPath}:/app/decoy/result.mztab`,
      `${outputPath}:/app/output`
    ],
    environment: { PROJECT_NAME: projectName },
    platform: step4Image.platform,
    autoRemove: true,
    command: [],
    logFilePath
  })
}

