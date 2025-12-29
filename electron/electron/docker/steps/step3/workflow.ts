import type { Database } from '../../../database'
import type { Step3Params, Step3Result } from './types'
import { runStep3Container } from './executor'
import path from 'node:path'
import fs from 'node:fs'

/**
 * Step3의 전체 워크플로우를 실행합니다.
 * 1. Project 생성
 * 2. Task 생성 및 Task별 출력 폴더 생성
 * 3. Docker 컨테이너 실행
 * 4. 성공/실패 상태 업데이트
 */
export async function executeStep3Workflow(
  database: Database,
  params: Step3Params
): Promise<Step3Result> {
  let project
  let task

  try {
    // 1. Project 생성
    project = await database.projects.create({
      name: params.projectName,
      status: 'running',
      parameters: {
        spectraPath: params.spectraPath,
        casanovoConfigPath: params.casanovoConfigPath,
        modelPath: params.modelPath,
        outputPath: params.outputPath
      }
    })

    console.log('Created project:', project)

    // 2. Task 생성 (상태: running)
    task = await database.tasks.create({
      project_uuid: project.uuid,
      step: '3',
      status: 'running',
      parameters: {
        spectraPath: params.spectraPath,
        casanovoConfigPath: params.casanovoConfigPath,
        modelPath: params.modelPath
      }
    })

    console.log('Created task:', task)

    // Task별 고유 출력 폴더 경로 생성
    const baseTaskPath = path.join(params.outputPath, task.uuid)
    const containerOutputPath = path.join(baseTaskPath, 'output')
    const logPath = path.join(baseTaskPath, 'log')

    fs.mkdirSync(containerOutputPath, { recursive: true })
    fs.mkdirSync(logPath, { recursive: true })
    console.log(`Created task output directory: ${containerOutputPath}`)
    console.log(`Created task log directory: ${logPath}`)

    // Task에 최종 경로들 업데이트
    await database.tasks.update(task.uuid, {
      parameters: {
        ...task.parameters,
        outputPath: containerOutputPath,
        logPath: logPath,
      }
    })
    // task 변수도 최신 정보로 갱신
    task = (await database.tasks.getOne(task.uuid))!

    // 3. Docker 컨테이너 실행 (bind mount 사용)
    const dockerResult = await runStep3Container({
      projectName: params.projectName,
      spectraPath: params.spectraPath,
      casanovoConfigPath: params.casanovoConfigPath,
      modelPath: params.modelPath,
      outputPath: containerOutputPath, // 컨테이너 결과물 경로
      logPath: logPath,                // 로그 파일 경로
      taskUuid: task.uuid
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
    console.error('Error in executeStep3Workflow:', error)
    // 에러 발생 시 생성되었던 project, task가 있다면 failed로 상태 변경
    if (task) {
      await database.tasks.update(task.uuid, { status: 'failed', parameters: { ...task.parameters, error: error instanceof Error ? error.message : 'Unknown error' }})
    }
    if (project) {
      await database.projects.update(project.uuid, { status: 'failed' })
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

