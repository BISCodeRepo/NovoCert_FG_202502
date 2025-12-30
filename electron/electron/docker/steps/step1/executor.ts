import { runDockerContainer } from '../../container'
import { REQUIRED_IMAGES } from '../../config'
import { generateLogFilePath } from '../../utils'
import type { Step1ContainerParams, DockerRunResult } from './types'

/**
 * Run a Docker container for Step1 (Decoy Spectra Generation)
 */
export async function runStep1Container(params: Step1ContainerParams): Promise<DockerRunResult> {
  const { projectName, inputPath, outputPath, logPath, taskUuid, memory, precursorTolerance, randomSeed } = params

  // Find the Step1 image
  const step1Image = REQUIRED_IMAGES.find(img => img.step === 'step1')
  
  if (!step1Image) {
    return {
      success: false,
      error: 'Step1 image not found'
    }
  }

  const containerName = `step1-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`
  
  const logFilePath = generateLogFilePath(logPath, '1', taskUuid)

  const environment: Record<string, string> = {
    PROJECT_NAME: projectName,
    MEMORY: memory,
    PRECURSOR_TOLERANCE: precursorTolerance,
    RANDOM_SEED: randomSeed
  }

  return await runDockerContainer({
    image: step1Image.image,
    containerName,
    volumes: [
      `${inputPath}:/app/input`,
      `${outputPath}:/app/output`
    ],
    environment,
    platform: step1Image.platform,
    autoRemove: true,
    command: [],
    logFilePath  // Save the log to a file
  })
}

