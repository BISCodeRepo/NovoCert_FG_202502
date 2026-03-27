export interface Step6Params {
  projectName: string
  csvFilePath: string        // DB search result CSV file path
  previousStepPath: string   // FDR result CSV file path (from Step 5)
  pinFilePath?: string       // PIN file path (t_d.pin) for SA, absdRT, absdMppm features
  outputPath?: string
}

export interface Step6ExecutionParams extends Step6Params {
  logPath: string
  projectUuid: string
}

export interface VennData {
  title: string
  leftOnly: number
  rightOnly: number
  overlap: number
  leftLabel: string
  rightLabel: string
}

export interface HistogramBin {
  min: number
  max: number
  overlapCount: number
  unoverlapCount: number
}

export interface HistogramData {
  title: string
  bins: HistogramBin[]
}

export interface Step6AnalysisData {
  vennDiagrams: VennData[]
  histograms: HistogramData[]
}

export interface Step6ExecutionResult {
  success: boolean
  analysisData?: Step6AnalysisData
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
  analysisData?: Step6AnalysisData
  error?: string
}
