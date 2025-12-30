import { runDockerContainer } from '../../container'
import { REQUIRED_IMAGES } from '../../config'
import { generateLogFilePath } from '../../utils'
import type { Step2ContainerParams, DockerRunResult } from './types'

/**
 * Run a Docker container for Step2 (Download Casanovo Config)
 */
export async function runStep2Container(params: Step2ContainerParams): Promise<DockerRunResult> {
  const { projectName, outputPath, logPath, projectUuid } = params

  // Find the Step2 image
  const step2Image = REQUIRED_IMAGES.find(img => img.step === 'step2')
  
  if (!step2Image) {
    return {
      success: false,
      error: 'Step2 image not found'
    }
  }

  const containerName = `step2-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`

  const logFilePath = generateLogFilePath(logPath, '2', projectUuid)

    // Run a Docker container (bind mount)
  // Based on docker-compose.yml: only outputPath is needed (target: /app/output/)
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
    logFilePath,  // Save the log to a file
    labels: {
      'project_uuid': projectUuid,
      'step': '2'
    }
  })
}

