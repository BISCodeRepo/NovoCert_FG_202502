export interface Step3Params {
  projectName: string
  spectraPath: string        // MGF file path
  casanovoConfigPath: string // Casanovo config file path (Step2 output)
  modelPath: string          // Model file path (.ckpt)
  outputPath: string
}

export interface Step3ContainerParams extends Step3Params {
  logPath: string // Log file path
  projectUuid: string // Project unique ID
}

export interface DockerRunResult {
  success: boolean
  containerId?: string
  error?: string
}

export interface Step3Result {
  success: boolean
  project?: {
    uuid: string
    name: string
    step: string
    status: string
    parameters: Record<string, unknown>
    created_at: string
    updated_at: string
  }
  containerId?: string
  error?: string
}

