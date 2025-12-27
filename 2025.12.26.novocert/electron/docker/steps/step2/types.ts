/**
 * Step2 관련 타입 정의
 */

export interface Step2Params {
  projectName: string
  inputPath: string
  outputPath: string
  uid?: string
  gid?: string
  // Step2 specific parameters can be added here
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
    status: string
    parameters: Record<string, unknown>
  }
  task?: {
    uuid: string
    project_uuid: string
    step: string
    status: string
    parameters: Record<string, unknown>
    created_at: string
    updated_at: string
  }
  containerId?: string
  error?: string
}

