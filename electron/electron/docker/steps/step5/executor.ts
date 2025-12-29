import { runDockerContainer } from '../../container'
import { REQUIRED_IMAGES } from '../../config'
import type { Step5Params, DockerRunResult } from './types'

export async function runStep5Container(params: Step5Params): Promise<DockerRunResult> {
  const { projectName, inputPath, outputPath, uid, gid } = params
  const step5Image = REQUIRED_IMAGES.find(img => img.step === 'step5')
  
  if (!step5Image) {
    return { success: false, error: 'Step5 이미지를 찾을 수 없습니다.' }
  }

  const containerName = `step5-${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-${Date.now()}`

  return await runDockerContainer({
    image: step5Image.image,
    containerName,
    uid: uid || '1000',
    gid: gid || '1000',
    volumes: [`${inputPath}:/app/input`, `${outputPath}:/app/output`],
    environment: { PROJECT_NAME: projectName },
    platform: step5Image.platform,
    autoRemove: true,
    command: []
  })
}

