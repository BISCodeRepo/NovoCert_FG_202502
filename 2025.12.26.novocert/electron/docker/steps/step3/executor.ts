import { runDockerContainer } from '../../container'
import { REQUIRED_IMAGES } from '../../config'
import type { Step3Params, DockerRunResult } from './types'

export async function runStep3Container(params: Step3Params): Promise<DockerRunResult> {
  const { projectName, inputPath, outputPath, uid, gid } = params
  const step3Image = REQUIRED_IMAGES.find(img => img.step === 'step3')
  
  if (!step3Image) {
    return { success: false, error: 'Step3 이미지를 찾을 수 없습니다.' }
  }

  const containerName = `step3-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`

  return await runDockerContainer({
    image: step3Image.image,
    containerName,
    uid: uid || '1000',
    gid: gid || '1000',
    volumes: [`${inputPath}:/app/input`, `${outputPath}:/app/output`],
    environment: { PROJECT_NAME: projectName },
    platform: step3Image.platform,
    autoRemove: true,
    command: []
  })
}

