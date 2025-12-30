export interface Step4Params {
  projectName: string
  targetMgfDir: string        // Target MGF 디렉토리 경로
  targetResultPath: string    // Target DNPS 결과 파일 경로 (mztab)
  decoyMgfDir: string         // Decoy MGF 디렉토리 경로
  decoyResultPath: string     // Decoy DNPS 결과 파일 경로 (mztab)
  outputPath: string          // 출력 디렉토리 경로
}

export interface Step4ContainerParams extends Step4Params {
  logPath: string // 로그 파일 경로
  projectUuid: string // Project의 고유 ID
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

