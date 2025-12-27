import type { Database } from '../../../database'
import type { Step1Params, Step1Result } from './types'
import { runStep1Container } from './executor'

/**
 * Step1의 전체 워크플로우를 실행합니다.
 * 1. Project 생성
 * 2. Task 생성
 * 3. Docker 컨테이너 실행
 * 4. 성공/실패 상태 업데이트
 */
export async function executeStep1Workflow(
  database: Database,
  params: Step1Params
): Promise<Step1Result> {
  try {
    // 1. Project 생성
    const project = await database.projects.create({
      name: params.projectName,
      status: 'running',
      parameters: {
        inputPath: params.inputPath,
        outputPath: params.outputPath
      }
    })

    console.log('Created project:', project)

    // 2. Task 생성 (상태: running)
    const task = await database.tasks.create({
      project_uuid: project.uuid,
      step: '1',
      status: 'running',
      parameters: {
        inputPath: params.inputPath,
        outputPath: params.outputPath
      }
    })

    console.log('Created task:', task)

    // 3. Docker 컨테이너 실행 (bind mount 사용)
    const dockerResult = await runStep1Container({
      projectName: params.projectName,
      inputPath: params.inputPath,
      outputPath: params.outputPath,
      taskUuid: task.uuid, // Task UUID 전달
      uid: params.uid,
      gid: params.gid
    })

    if (!dockerResult.success) {
      // Docker 실행 실패 시 Task 상태를 failed로 업데이트
      await database.tasks.update(task.uuid, {
        status: 'failed',
        parameters: {
          ...task.parameters,
          error: dockerResult.error
        }
      })

      await database.projects.update(project.uuid, {
        status: 'failed'
      })

      return {
        success: false,
        error: dockerResult.error,
        project,
        task
      }
    }

    console.log('Docker container started:', dockerResult.containerId)

    // Task 상태 업데이트 - containerId 추가
    await database.tasks.update(task.uuid, {
      parameters: {
        ...task.parameters,
        containerId: dockerResult.containerId
      }
    })

    return {
      success: true,
      project,
      task,
      containerId: dockerResult.containerId
    }
  } catch (error: unknown) {
    console.error('Error in executeStep1Workflow:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

