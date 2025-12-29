import { runDockerContainer } from '../../container'
import { REQUIRED_IMAGES } from '../../config'
import type { Step1Params, DockerRunResult } from './types'
import path from 'node:path'

/**
 * Step1 (Decoy Spectra Generation)을 위한 Docker 컨테이너를 실행합니다.
 */
export async function runStep1Container(params: Step1Params): Promise<DockerRunResult> {
  const { projectName, inputPath, outputPath, logPath, taskUuid, uid, gid } = params

  // Step1 이미지 찾기
  const step1Image = REQUIRED_IMAGES.find(img => img.step === 'step1')
  
  if (!step1Image) {
    return {
      success: false,
      error: 'Step1 이미지를 찾을 수 없습니다.'
    }
  }

  // 고유한 컨테이너 이름 생성 (타임스탬프 포함)
  const containerName = `step1-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`
  
  // 로그 파일 경로 생성 (전달받은 logPath 사용)
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-')
  const logFilePath = path.join(logPath, `step1-${taskUuid}-${dateStr}-${timeStr}.log`)

  // Docker 컨테이너 실행 (bind mount 사용)
  return await runDockerContainer({
    image: step1Image.image,
    containerName,
    uid: uid || '1000',
    gid: gid || '1000',
    volumes: [
      `${inputPath}:/app/input`,
      `${outputPath}:/app/output`
    ],
    environment: {
      PROJECT_NAME: projectName
    },
    platform: step1Image.platform,
    autoRemove: true,
    command: [],
    logFilePath  // 로그를 파일로 저장
  })
}

