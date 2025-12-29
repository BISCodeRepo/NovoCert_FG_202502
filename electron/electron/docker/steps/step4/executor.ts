import { runDockerContainer } from '../../container'
import { REQUIRED_IMAGES } from '../../config'
import type { Step4Params, DockerRunResult } from './types'

export async function runStep4Container(params: Step4Params): Promise<DockerRunResult> {
  const { projectName, inputPath, outputPath, uid, gid } = params
  const step4Image = REQUIRED_IMAGES.find(img => img.step === 'step4')
  
  if (!step4Image) {
    return { success: false, error: 'Step4 이미지를 찾을 수 없습니다.' }
  }

  const containerName = `step4-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`

  return await runDockerContainer({
    image: step4Image.image,
    containerName,
    uid: uid || '1000',
    gid: gid || '1000',
    volumes: [`${inputPath}:/app/input`, `${outputPath}:/app/output`],
    environment: { PROJECT_NAME: projectName },
    platform: step4Image.platform,
    autoRemove: true,
    command: []
  })
}

