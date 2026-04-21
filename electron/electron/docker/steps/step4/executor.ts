import { runDockerContainer } from '../../container'
import { REQUIRED_IMAGES } from '../../config'
import { generateLogFilePath } from '../../utils'
import type { Step4ContainerParams, DockerRunResult } from './types'

/**
 * Run a Docker container for Step4 (Feature Calculation - p3 image)
 */
export async function runStep4Container(params: Step4ContainerParams): Promise<DockerRunResult> {
  const { 
    projectName, 
    targetSpectraMgfPath, 
    targetDnpsPath, 
    decoySpectraMgfPath, 
    decoyDnpsPath, 
    outputPath, 
    logPath, 
    projectUuid 
  } = params
  
  const step4Image = REQUIRED_IMAGES.find(img => img.step === 'step4')
  
  if (!step4Image) {
    return { success: false, error: 'Step4 image not found' }
  }

  const containerName = `step4-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`

  // Generate the log file path
  const logFilePath = generateLogFilePath(logPath, '4', projectUuid)

  // Run a Docker container (bind mount)
  // Based on your new docker-compose configuration:
  // - targetSpectraMgfPath -> /app/target/mgf/target.mgf
  // - decoySpectraMgfPath -> /app/decoy/mgf/target.mgf
  // - targetDnpsPath -> /app/target/result.mztab
  // - decoyDnpsPath -> /app/decoy/result.mztab
  // - outputPath -> /app/output
  return await runDockerContainer({
    image: step4Image.image,
    containerName,
    volumes: [
      `${targetSpectraMgfPath}:/app/target/mgf/target.mgf`,
      `${decoySpectraMgfPath}:/app/decoy/mgf/target.mgf`,
      `${targetDnpsPath}:/app/target/result.mztab`,
      `${decoyDnpsPath}:/app/decoy/result.mztab`,
      `${outputPath}:/app/output`
    ],
    environment: { PROJECT_NAME: projectName },
    platform: step4Image.platform,
    autoRemove: true,
    command: [],
    logFilePath,
    labels: {
      'project_uuid': projectUuid,
      'step': '4'
    }
  })
}
