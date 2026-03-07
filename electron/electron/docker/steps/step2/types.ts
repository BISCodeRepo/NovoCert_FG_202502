/**
 * Step2 type definitions
 */

export interface Step2Params {
  projectName: string
  outputPath: string
}

export interface Step2ContainerParams extends Step2Params {
  logPath: string // Log file path
  projectUuid: string // Project unique ID
}

export interface DockerRunResult {
  success: boolean
  containerId?: string
  error?: string
}

export interface Step2Result {
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

