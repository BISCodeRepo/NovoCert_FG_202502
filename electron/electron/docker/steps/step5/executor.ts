import { runDockerContainer } from '../../container'
import { REQUIRED_IMAGES } from '../../config'
import { generateLogFilePath } from '../../utils'
import type { Step5ContainerParams, DockerRunResult } from './types'

/**
 * Run a Docker container for Step5 (Percolator and FDR Control - p4 image)
 */
export async function runStep5Container(params: Step5ContainerParams): Promise<DockerRunResult> {
  const { projectName, inputPath, outputPath, logPath, projectUuid } = params
  
  const step5Image = REQUIRED_IMAGES.find(img => img.step === 'step5')
  
  if (!step5Image) {
    return { success: false, error: 'Step5 image not found' }
  }

  const containerName = `step5-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`

  // Generate the log file path
  const logFilePath = generateLogFilePath(logPath, '5', projectUuid)

  // Run a Docker container (bind mount)
  // Based on docker-compose.yml (p4 image):
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

