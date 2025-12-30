export interface Step5Params {
  projectName: string
  inputPath: string        // PIN 파일 경로
  outputPath: string
}

export interface Step5ContainerParams extends Step5Params {
  logPath: string 
  projectUuid: string 
}

export interface DockerRunResult {
  success: boolean
  containerId?: string
  error?: string
}

export interface Step5Result {
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

