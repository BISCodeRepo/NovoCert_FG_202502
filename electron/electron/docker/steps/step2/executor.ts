import { runDockerContainer } from '../../container'
import { REQUIRED_IMAGES } from '../../config'
import { generateLogFilePath } from '../../utils'
import type { Step2ContainerParams, DockerRunResult } from './types'

/**
 * Step2 (Download Casanovo Config)를 위한 Docker 컨테이너를 실행합니다.
 */
export async function runStep2Container(params: Step2ContainerParams): Promise<DockerRunResult> {
  const { projectName, outputPath, logPath, taskUuid } = params

  // Step2 이미지 찾기
  const step2Image = REQUIRED_IMAGES.find(img => img.step === 'step2')
  
  if (!step2Image) {
    return {
      success: false,
      error: 'Step2 이미지를 찾을 수 없습니다.'
    }
  }

  // 고유한 컨테이너 이름 생성 (타임스탬프 포함)
  const containerName = `step2-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`

  // 로그 파일 경로 생성 (전달받은 logPath 사용)
  const logFilePath = generateLogFilePath(logPath, '2', taskUuid)

  // Docker 컨테이너 실행 (bind mount 사용)
  // docker-compose.yml 기준: outputPath만 필요 (target: /app/output/)
  return await runDockerContainer({
    image: step2Image.image,
    containerName,
    volumes: [
      `${outputPath}:/app/output/`
    ],
    environment: {
      PROJECT_NAME: projectName
    },
    platform: step2Image.platform,
    autoRemove: true,
    command: [],
    logFilePath  // 로그를 파일로 저장
  })
}

