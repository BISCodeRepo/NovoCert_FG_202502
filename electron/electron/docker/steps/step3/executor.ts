import { runDockerContainer } from '../../container'
import { REQUIRED_IMAGES } from '../../config'
import { generateLogFilePath } from '../../utils'
import type { Step3ContainerParams, DockerRunResult } from './types'

/**
 * Run a Docker container for Step3 (De-novo Peptide Sequencing)
 */
export async function runStep3Container(params: Step3ContainerParams): Promise<DockerRunResult> {
  const { projectName, spectraPath, casanovoConfigPath, modelPath, outputPath, logPath, taskUuid } = params
  
  const step3Image = REQUIRED_IMAGES.find(img => img.step === 'step3')
  
  if (!step3Image) {
    return { success: false, error: 'Step3 image not found' }
  }

  const containerName = `step3-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`

  // 로그 파일 경로 생성
  const logFilePath = generateLogFilePath(logPath, '3', taskUuid)

  // Run a Docker container (bind mount)
  // Based on docker-compose.yml:
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

