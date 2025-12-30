import type { Database } from '../../../database'
import type { Step1Params, Step1Result } from './types'
import { runStep1Container } from './executor'
import path from 'node:path'
import fs from 'node:fs'

/**
 * Execute the entire workflow for Step1.
 * 1. Create a Project
 * 2. Create a Task and create a Task-specific output folder
 * 3. Run a Docker container
 * 4. Update the success/failure status
 */
export async function executeStep1Workflow(
  database: Database,
  params: Step1Params
): Promise<Step1Result> {
  let project
  let task

  try {
    // 1. Create a Project
    project = await database.projects.create({
      name: params.projectName,
      status: 'running',
      parameters: {
        inputPath: params.inputPath,
        outputPath: params.outputPath // 프로젝트 레벨에서는 기본 출력 경로 저장
      }
    })

    // 2. Create a Task (status: running)
    task = await database.tasks.create({
      project_uuid: project.uuid,
      step: '1',
      status: 'running',
      parameters: {
        inputPath: params.inputPath,
        // outputPath는 아래에서 Task별 경로로 업데이트됨
      }
    })

    // Create a Task-specific output folder
    const baseTaskPath = path.join(params.outputPath, task.uuid)
    const containerOutputPath = path.join(baseTaskPath, 'output')
    const logPath = path.join(baseTaskPath, 'log')

    fs.mkdirSync(containerOutputPath, { recursive: true })
    fs.mkdirSync(logPath, { recursive: true })

    // Update the final paths for the Task
    await database.tasks.update(task.uuid, {
      parameters: {
        ...task.parameters,
        outputPath: containerOutputPath,
        logPath: logPath,
      }
    })
    // Update the task variable with the latest information
    task = (await database.tasks.getOne(task.uuid))!


    // 3. Run a Docker container (bind mount)
    const dockerResult = await runStep1Container({
      projectName: params.projectName,
      inputPath: params.inputPath,
      outputPath: containerOutputPath, // 컨테이너 결과물 경로
      logPath: logPath,                // 로그 파일 경로
      taskUuid: task.uuid,
      memory: params.memory,
      precursorTolerance: params.precursorTolerance,
      randomSeed: params.randomSeed
    })

    if (!dockerResult.success) {
      // If the Docker container fails, update the Task status to failed
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

    // Update the Task status - add containerId
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
    // If an error occurs, update the project and task status to failed
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

