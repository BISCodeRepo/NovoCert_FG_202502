/**
 * Step1 type definitions
 */

export interface Step1Params {
  projectName: string
  inputPath: string
  outputPath: string
  memory: string           // MEMORY environment variable (required)
  precursorTolerance: string  // PRECURSOR_TOLERANCE environment variable (required)
  randomSeed: string       // RANDOM_SEED environment variable (required)
}

export interface Step1ContainerParams extends Step1Params {
  logPath: string // Log file path
  projectUuid: string // Project unique ID
}

export interface DockerRunResult {
  success: boolean
  containerId?: string
  error?: string
  logFilePath?: string  // Log file path
}

export interface Step1Result {
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

