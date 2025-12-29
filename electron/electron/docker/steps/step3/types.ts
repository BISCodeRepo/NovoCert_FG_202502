export interface Step3Params {
  projectName: string
  spectraPath: string        // MGF 파일 경로
  casanovoConfigPath: string // Casanovo 설정 파일 경로 (Step2의 출력)
  modelPath: string          // 모델 파일 경로 (.ckpt)
  outputPath: string
}

export interface Step3ContainerParams extends Step3Params {
  logPath: string // 로그 파일 경로
  taskUuid: string // Task의 고유 ID
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

