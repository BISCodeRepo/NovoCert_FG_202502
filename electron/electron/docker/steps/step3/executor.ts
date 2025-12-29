import { runDockerContainer } from '../../container'
import { REQUIRED_IMAGES } from '../../config'
import { generateLogFilePath } from '../../utils'
import type { Step3ContainerParams, DockerRunResult } from './types'

/**
 * Step3 (De-novo Peptide Sequencing)을 위한 Docker 컨테이너를 실행합니다.
 */
export async function runStep3Container(params: Step3ContainerParams): Promise<DockerRunResult> {
  const { projectName, spectraPath, casanovoConfigPath, modelPath, outputPath, logPath, taskUuid } = params
  
  const step3Image = REQUIRED_IMAGES.find(img => img.step === 'step3')
  
  if (!step3Image) {
    return { success: false, error: 'Step3 이미지를 찾을 수 없습니다.' }
  }

  const containerName = `step3-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`

  // 로그 파일 경로 생성
  const logFilePath = generateLogFilePath(logPath, '3', taskUuid)

  // Docker 컨테이너 실행 (bind mount 사용)
  // docker-compose.yml 기준:
  // - spectraPath -> /app/data/mgf/spectra.mgf
  // - casanovoConfigPath -> /app/data/casanovo.yaml
  // - modelPath -> /app/data/model.ckpt
  // - outputPath -> /app/output/
  return await runDockerContainer({
    image: step3Image.image,
    containerName,
    volumes: [
      `${spectraPath}:/app/data/mgf/spectra.mgf`,
      `${casanovoConfigPath}:/app/data/casanovo.yaml`,
      `${modelPath}:/app/data/model.ckpt`,
      `${outputPath}:/app/output/`
    ],
    environment: { PROJECT_NAME: projectName },
    platform: step3Image.platform,
    autoRemove: true,
    command: [],
    logFilePath
  })
}

