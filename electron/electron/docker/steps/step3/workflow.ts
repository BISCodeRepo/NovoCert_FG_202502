import type { Database } from '../../../database'
import type { Step3Params, Step3Result } from './types'
import { runStep3Container } from './executor'
import path from 'node:path'
import fs from 'node:fs'

/**
 * Execute the entire workflow for Step3.
 * 1. Create a Project
 * 2. Create a Task and create a Task-specific output folder
 * 3. Run a Docker container
 * 4. Update the success/failure status
 */
export async function executeStep3Workflow(
  database: Database,
  params: Step3Params
): Promise<Step3Result> {
  let project
  let task

  try {
    // 1. Create a Project
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

    // 2. Create a Task (status: running)
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
    const dockerResult = await runStep3Container({
      projectName: params.projectName,
      spectraPath: params.spectraPath,
      casanovoConfigPath: params.casanovoConfigPath,
      modelPath: params.modelPath,
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
    console.error('Error in executeStep3Workflow:', error)
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

