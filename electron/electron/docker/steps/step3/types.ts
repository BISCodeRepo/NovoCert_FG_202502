export interface Step3Params {
  projectName: string
  inputPath: string
  outputPath: string
  uid?: string
  gid?: string
}

export interface DockerRunResult {
  success: boolean
  containerId?: string
  error?: string
}

export interface Step3Result {
  success: boolean
  project?: { uuid: string; name: string; status: string; parameters: Record<string, unknown> }
  task?: { uuid: string; project_uuid: string; step: string; status: string; parameters: Record<string, unknown>; created_at: string; updated_at: string }
  containerId?: string
  error?: string
}

