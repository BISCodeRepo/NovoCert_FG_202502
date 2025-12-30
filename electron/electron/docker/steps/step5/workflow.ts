import type { Database } from '../../../database'
import type { Step5Params, Step5Result } from './types'
import { runStep5Container } from './executor'
import path from 'node:path'
import fs from 'node:fs'

/**
 * Execute the entire workflow for Step5.
 * 1. Create a Project
 * 2. Create a Task and create a Task-specific output folder
 * 3. Run a Docker container
 * 4. Update the success/failure status
 */
export async function executeStep5Workflow(
  database: Database,
  params: Step5Params
): Promise<Step5Result> {
  let project
  let task

  try {
    // 1. Project 생성
    project = await database.projects.create({
      name: params.projectName,
      status: 'running',
      parameters: {
        inputPath: params.inputPath,
        outputPath: params.outputPath
      }
    })

    console.log('Created project:', project)

    // 2. Task 생성 (상태: running)
    task = await database.tasks.create({
      project_uuid: project.uuid,
      step: '5',
      status: 'running',
      parameters: {
        inputPath: params.inputPath
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
    // Update the task variable with the latest information
    task = (await database.tasks.getOne(task.uuid))!

    // 3. Run a Docker container (bind mount)
    const dockerResult = await runStep5Container({
      projectName: params.projectName,
      inputPath: params.inputPath,
      outputPath: containerOutputPath, // Container result path
      logPath: logPath,                // Log file path
      taskUuid: task.uuid
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
    console.error('Error in executeStep5Workflow:', error)
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

