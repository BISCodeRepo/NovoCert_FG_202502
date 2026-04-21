import { runDockerContainer } from '../../container'
import { REQUIRED_IMAGES } from '../../config'
import { generateLogFilePath } from '../../utils'
import type { Step3ContainerParams, DockerRunResult } from './types'

/**
 * Run a Docker container for Step3 (De novo Peptide Sequencing)
 */
export async function runStep3Container(params: Step3ContainerParams): Promise<DockerRunResult> {
  const { projectName, spectraPath, casanovoConfigPath, modelPath, outputPath, logPath, projectUuid } = params
  
  const step3Image = REQUIRED_IMAGES.find(img => img.step === 'step3')
  
  if (!step3Image) {
    return { success: false, error: 'Step3 image not found' }
  }

  const containerName = `step3-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`

  // Generate log file path
  const logFilePath = generateLogFilePath(logPath, '3', projectUuid)

  // Run a Docker container (bind mount)
  // We explicitly override the command to use 'target.mgf' as the input.
  // This ensures the resulting mztab run-name matches what Step 4 expects.
  // We also specify 'result.mztab' as the output file to avoid 'directory' errors.
  return await runDockerContainer({
    image: step3Image.image,
    containerName,
    volumes: [
      `${spectraPath}:/app/data/mgf/target.mgf`,
      `${casanovoConfigPath}:/app/data/casanovo.yaml`,
      `${modelPath}:/app/data/model.ckpt`,
      `${outputPath}:/app/output/`
    ],
    environment: { PROJECT_NAME: projectName },
    platform: step3Image.platform,
    autoRemove: true,
    command: [
      'casanovo',
      'sequence', 
      '/app/data/mgf/target.mgf', 
      '--config', '/app/data/casanovo.yaml', 
      '--model', '/app/data/model.ckpt', 
      '--output', '/app/output/result.mztab'
    ],
    logFilePath,
    labels: {
      'project_uuid': projectUuid,
      'step': '3'
    }
  })
}
