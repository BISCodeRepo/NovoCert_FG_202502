import { runDockerContainer } from '../../container'
import { REQUIRED_IMAGES } from '../../config'
import type { Step2Params, DockerRunResult } from './types'

/**
 * Step2를 위한 Docker 컨테이너를 실행합니다.
 * TODO: Step2에 맞게 volumes, environment, command 등을 수정하세요
 */
export async function runStep2Container(params: Step2Params): Promise<DockerRunResult> {
  const { projectName, inputPath, outputPath, uid, gid } = params

  // Step2 이미지 찾기
  const step2Image = REQUIRED_IMAGES.find(img => img.step === 'step2')
  
  if (!step2Image) {
    return {
      success: false,
      error: 'Step2 이미지를 찾을 수 없습니다.'
    }
  }

  // 고유한 컨테이너 이름 생성 (타임스탬프 포함)
  const containerName = `step2-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`

  // Docker 컨테이너 실행 (bind mount 사용)
  return await runDockerContainer({
    image: step2Image.image,
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
    platform: step2Image.platform,
    autoRemove: true,
    command: []
  })
}

