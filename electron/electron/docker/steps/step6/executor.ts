import fs from 'node:fs'
import path from 'node:path'
import { generateLogFilePath } from '../../utils'
import type {
  Step6ExecutionParams,
  Step6ExecutionResult,
  VennData,
  HistogramData,
  HistogramBin,
  Step6AnalysisData,
} from './types'

function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.split('\n').filter((line) => line.trim().length > 0)
  if (lines.length === 0) return { headers: [], rows: [] }

  const separator = lines[0].includes('\t') ? '\t' : ','
  const headers = lines[0].split(separator).map((h) => h.trim().replace(/^"|"$/g, ''))
  const rows = lines.slice(1).map((line) => {
    const values = line.split(separator).map((v) => v.trim().replace(/^"|"$/g, ''))
    const row: Record<string, string> = {}
    headers.forEach((h, i) => {
      row[h] = values[i] || ''
    })
    return row
  })

  return { headers, rows }
}

function getColumnValues(rows: Record<string, string>[], column: string): Set<string> {
  return new Set(rows.map((r) => r[column]).filter((v) => v !== undefined && v !== ''))
}

function computeVenn(
  title: string,
  setA: Set<string>,
  setB: Set<string>,
  leftLabel: string,
  rightLabel: string
): VennData {
  let overlap = 0
  for (const item of setA) {
    if (setB.has(item)) overlap++
  }
  return {
    title,
    leftOnly: setA.size - overlap,
    rightOnly: setB.size - overlap,
    overlap,
    leftLabel,
    rightLabel,
  }
}

function buildHistogram(
  title: string,
  overlapValues: number[],
  unoverlapValues: number[],
  numBins = 20
): HistogramData {
  const all = [...overlapValues, ...unoverlapValues].filter((v) => !isNaN(v))
  if (all.length === 0) {
    return { title, bins: [] }
  }

  const min = Math.min(...all)
  const max = Math.max(...all)
  const range = max - min || 1
  const binWidth = range / numBins

  const bins: HistogramBin[] = Array.from({ length: numBins }, (_, i) => ({
    min: min + i * binWidth,
    max: min + (i + 1) * binWidth,
    overlapCount: 0,
    unoverlapCount: 0,
  }))

  const toBinIndex = (v: number) => {
    const idx = Math.floor((v - min) / binWidth)
    return Math.min(idx, numBins - 1)
  }

  for (const v of overlapValues) {
    if (!isNaN(v)) bins[toBinIndex(v)].overlapCount++
  }
  for (const v of unoverlapValues) {
    if (!isNaN(v)) bins[toBinIndex(v)].unoverlapCount++
  }

  return { title, bins }
}

/**
 * Execute Post Analysis for Step6.
 * Computes Venn diagrams and histograms from fdr_result.csv and db_result.csv.
 */
export async function executeStep6Analysis(
  params: Step6ExecutionParams
): Promise<Step6ExecutionResult> {
  const { csvFilePath, previousStepPath, outputPath, logPath, projectUuid } = params
  const logFilePath = generateLogFilePath(logPath, '6', projectUuid)

  const log = (message: string) => {
    console.log(message)
    try {
      fs.appendFileSync(logFilePath, `${new Date().toISOString()} [STEP6] ${message}\n`)
    } catch { /* ignore */ }
  }

  try {
    log('Starting Post Analysis...')
    log(`DB Result CSV: ${csvFilePath}`)
    log(`FDR Result CSV: ${previousStepPath}`)

    if (!fs.existsSync(csvFilePath)) {
      return { success: false, error: `DB result CSV not found: ${csvFilePath}` }
    }
    if (!fs.existsSync(previousStepPath)) {
      return { success: false, error: `FDR result CSV not found: ${previousStepPath}` }
    }

    const dbResult = parseCSV(fs.readFileSync(csvFilePath, 'utf-8'))
    const fdrResult = parseCSV(fs.readFileSync(previousStepPath, 'utf-8'))

    log(`DB Result: ${dbResult.rows.length} rows, columns: [${dbResult.headers.join(', ')}]`)
    log(`FDR Result: ${fdrResult.rows.length} rows, columns: [${fdrResult.headers.join(', ')}]`)

    // --- Venn Diagrams ---
    const dbIds = getColumnValues(dbResult.rows, 'ID')
    const fdrIds = getColumnValues(fdrResult.rows, 'ID')
    const dbPeps = getColumnValues(dbResult.rows, 'pep')
    const fdrPeps = getColumnValues(fdrResult.rows, 'pep')
    const dbPSMIds = getColumnValues(dbResult.rows, 'PSMId')
    const fdrPSMIds = getColumnValues(fdrResult.rows, 'PSMId')

    const vennDiagrams: VennData[] = [
      computeVenn('Overlap of PSM', dbIds, fdrIds, 'DB Search', 'NovoCert'),
      computeVenn('Overlap of Peptide', dbPeps, fdrPeps, 'DB Search', 'NovoCert'),
      computeVenn('Overlap of Scan', dbPSMIds, fdrPSMIds, 'DB Search', 'NovoCert'),
    ]

    for (const v of vennDiagrams) {
      log(`${v.title}: left=${v.leftOnly}, overlap=${v.overlap}, right=${v.rightOnly}`)
    }

    // --- Histograms (based on ID overlap) ---
    const overlapIdSet = new Set<string>()
    for (const id of fdrIds) {
      if (dbIds.has(id)) overlapIdSet.add(id)
    }

    const overlapRows = fdrResult.rows.filter((r) => overlapIdSet.has(r['ID']))
    const unoverlapRows = fdrResult.rows.filter((r) => r['ID'] && !overlapIdSet.has(r['ID']))

    log(`Histogram groups: overlap=${overlapRows.length}, unoverlap=${unoverlapRows.length}`)

    // Build feature lookup from PIN file (t_d.pin) – SA, absdRT, absdMppm
    // PIN SpecId format: "value_charge", fdr_result PSMId = trimmed SpecId (remove last _charge)
    const featureLookup = new Map<string, { SA: number; absdRT: number; absdMppm: number }>()

    const pinFilePath = params.pinFilePath
    if (pinFilePath && fs.existsSync(pinFilePath)) {
      log(`Reading PIN file for features: ${pinFilePath}`)
      const pinData = parseCSV(fs.readFileSync(pinFilePath, 'utf-8'))
      log(`PIN file: ${pinData.rows.length} rows, columns: [${pinData.headers.join(', ')}]`)

      for (const row of pinData.rows) {
        const specId = row['SpecId'] || ''
        const trimmedId = specId.substring(0, specId.lastIndexOf('_'))
        if (trimmedId) {
          featureLookup.set(trimmedId, {
            SA: parseFloat(row['SA'] || ''),
            absdRT: parseFloat(row['absdRT'] || ''),
            absdMppm: parseFloat(row['absdMppm'] || ''),
          })
        }
      }
      log(`Feature lookup built: ${featureLookup.size} entries`)
    } else {
      log('WARNING: PIN file not provided or not found – histograms will be skipped')
    }

    const histograms: HistogramData[] = []

    if (featureLookup.size > 0) {
      const extractFeature = (rows: Record<string, string>[], feat: 'SA' | 'absdRT' | 'absdMppm'): number[] => {
        const values: number[] = []
        for (const row of rows) {
          const entry = featureLookup.get(row['PSMId'] || '')
          if (entry) {
            const v = entry[feat]
            if (!isNaN(v)) values.push(v)
          }
        }
        return values
      }

      histograms.push(
        buildHistogram(
          'SA score (Overlap & Unoverlap)',
          extractFeature(overlapRows, 'SA'),
          extractFeature(unoverlapRows, 'SA')
        )
      )
      histograms.push(
        buildHistogram(
          'Delta retention time (Overlap & Unoverlap)',
          extractFeature(overlapRows, 'absdRT'),
          extractFeature(unoverlapRows, 'absdRT')
        )
      )
      histograms.push(
        buildHistogram(
          'Absolute delta mass ppm (Overlap & Unoverlap)',
          extractFeature(overlapRows, 'absdMppm'),
          extractFeature(unoverlapRows, 'absdMppm')
        )
      )

      log(`Histograms built: ${histograms.length}`)
    }

    // Save summary JSON
    const analysisData: Step6AnalysisData = { vennDiagrams, histograms }
    const summaryPath = path.join(outputPath || path.dirname(csvFilePath), 'post_analysis_result.json')
    fs.writeFileSync(summaryPath, JSON.stringify(analysisData, null, 2), 'utf-8')
    log(`Analysis summary saved to: ${summaryPath}`)
    log('Post Analysis completed successfully')

    return { success: true, analysisData }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    log(`ERROR: ${msg}`)
    return { success: false, error: msg }
  }
}
