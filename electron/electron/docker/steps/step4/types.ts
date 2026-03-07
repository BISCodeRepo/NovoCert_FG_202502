export interface Step4Params {
  projectName: string
  targetMgfDir: string        // Target MGF directory path
  targetResultPath: string    // Target DNPS result file path (mztab)
  decoyMgfDir: string         // Decoy MGF directory path
  decoyResultPath: string     // Decoy DNPS result file path (mztab)
  outputPath: string          // Output directory path
}

export interface Step4ContainerParams extends Step4Params {
  logPath: string // Log file path
  projectUuid: string // Project unique ID
}

export interface DockerRunResult {
  success: boolean
  containerId?: string
  error?: string
}

export interface Step4Result {
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

