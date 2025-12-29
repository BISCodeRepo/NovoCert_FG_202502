/**
 * Step1 관련 타입 정의
 */

export interface Step1Params {
  projectName: string
  inputPath: string
  outputPath: string
  memory: string           // MEMORY 환경 변수 (필수)
  precursorTolerance: string  // PRECURSOR_TOLERANCE 환경 변수 (필수)
  randomSeed: string       // RANDOM_SEED 환경 변수 (필수)
}

export interface Step1ContainerParams extends Step1Params {
  logPath: string // 로그 파일 경로
  taskUuid: string // Task의 고유 ID
}

export interface DockerRunResult {
  success: boolean
  containerId?: string
  error?: string
  logFilePath?: string  // 로그 파일 경로
}

export interface Step1Result {
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

