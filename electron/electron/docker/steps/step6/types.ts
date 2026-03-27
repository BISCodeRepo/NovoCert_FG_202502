export interface Step6Params {
  projectName: string
  csvFilePath: string        // CSV file path
  previousStepPath: string   // Previous step project CSV file path
  outputPath?: string        // Optional output path (if not provided, will use csvFilePath directory)
}

export interface Step6ExecutionParams extends Step6Params {
  logPath: string 
  projectUuid: string 
}

export interface Step6ExecutionResult {
  success: boolean
  error?: string
}

export interface Step6Result {
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
