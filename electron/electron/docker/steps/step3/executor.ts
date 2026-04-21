import { runDockerContainer } from '../../container'
import { REQUIRED_IMAGES } from '../../config'
import { generateLogFilePath } from '../../utils'
import type { Step3ContainerParams, DockerRunResult } from './types'
import fs from 'node:fs'

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
  // Based on docker-compose.yml:
  // - spectraPath -> /app/data/mgf/spectra.mgf
  // - casanovoConfigPath -> /app/data/casanovo.yaml
  // - modelPath -> /app/data/model.ckpt
  // - outputPath -> /app/output/
  const requiredConfigKeys = [
    'save_top_k',
    'max_length',
    'n_peaks',
    'model_save_folder_path',
  ]
  const canUseConfig = (() => {
    try {
      const configContent = fs.readFileSync(casanovoConfigPath, 'utf-8')
      return requiredConfigKeys.every((key) => configContent.includes(key))
    } catch (error) {
      console.warn('[Step3] Failed to read config file. Running without --config option.', error)
      return false
    }
  })()

  const casanovoArgs = canUseConfig
    ? 'sequence data/mgf/spectra.mgf --model data/model.ckpt --config data/casanovo.yaml --output output/result.mztab'
    : 'sequence data/mgf/spectra.mgf --model data/model.ckpt --output output/result.mztab'

  // Always ensure depthcharge-ms is up-to-date so the model ckpt can load
  // (checkpoint references depthcharge.tokenizers which only exists in newer versions).
  const casanovoCommand = [
    'set -e; ',
    'echo "[Step3] Ensuring depthcharge-ms is up-to-date..."; ',
    '(pip install --no-cache-dir --upgrade depthcharge-ms ',
    '|| pip install --no-cache-dir --upgrade depthcharge) ',
    `&& casanovo ${casanovoArgs}`,
  ].join('')

  if (!canUseConfig) {
    console.warn(
      `[Step3] Config file does not include required keys (${requiredConfigKeys.join(', ')}). Running with Casanovo defaults.`
    )
  }

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
    // Override CMD to bypass CRLF-broken run.sh inside the image
    command: [
      'bash', '-c',
      casanovoCommand,
    ],
    logFilePath,
    labels: {
      'project_uuid': projectUuid,
      'step': '3'
    }
  })
}

