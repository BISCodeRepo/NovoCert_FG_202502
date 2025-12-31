import type { Database } from '../../../database'
import type { Step1Params, Step1Result } from './types'
import { runStep1Container } from './executor'
import path from 'node:path'
import fs from 'node:fs'
import { generateProjectFolderName } from '../../utils'

/**
 * Execute the entire workflow for Step1.
 * 1. Create a Project with step information
 * 2. Create a Project-specific output folder
 * 3. Run a Docker container
 * 4. Update the success/failure status
 */
export async function executeStep1Workflow(
  database: Database,
  params: Step1Params
): Promise<Step1Result> {
  let project

  try {
    // 1. Create a Project with step information
    project = await database.projects.create({
      name: params.projectName,
      step: '1',
      status: 'running',
      parameters: {
        inputPath: params.inputPath,
        outputPath: params.outputPath // 프로젝트 레벨 기본 출력 경로
      }
    })

    // 2. Create a Project-specific output folder
    const projectFolderName = generateProjectFolderName(project.name, project.uuid)
    const baseProjectPath = path.join(params.outputPath, projectFolderName)

    fs.mkdirSync(baseProjectPath, { recursive: true })

    // Update the project with step1-specific paths
    const updatedProject = await database.projects.update(project.uuid, {
      parameters: {
        ...project.parameters,
        step1: {
          outputPath: baseProjectPath,
          logPath: baseProjectPath,
        }
      }
    })

    if (!updatedProject) {
      throw new Error('Failed to update project')
    }
    project = updatedProject

    // 3. Run a Docker container (bind mount)
    const dockerResult = await runStep1Container({
      projectName: params.projectName,
      inputPath: params.inputPath,
      outputPath: baseProjectPath, // 컨테이너 결과물 경로
      logPath: baseProjectPath,    // 로그 파일 경로
      projectUuid: project.uuid,
      memory: params.memory,
      precursorTolerance: params.precursorTolerance,
      randomSeed: params.randomSeed
    })

    if (!dockerResult.success) {
      // If the Docker container fails, update the Project status to failed
      const failedProject = await database.projects.update(project.uuid, {
        status: 'failed',
        parameters: {
          ...project.parameters,
          error: dockerResult.error
        }
      })

      return {
        success: false,
        error: dockerResult.error,
        project: failedProject || project
      }
    }

    console.log('Docker container started:', dockerResult.containerId)

    // Update the Project status - add containerId
    const finalProject = await database.projects.update(project.uuid, {
      parameters: {
        ...project.parameters,
        step1: {
          ...(project.parameters.step1 as Record<string, unknown> || {}),
          containerId: dockerResult.containerId
        }
      }
    })

    return {
      success: true,
      project: finalProject || project,
      containerId: dockerResult.containerId
    }
  } catch (error: unknown) {
    console.error('Error in executeStep1Workflow:', error)
    // If an error occurs, update the project status to failed
    if (project) {
      await database.projects.update(project.uuid, { 
        status: 'failed',
        parameters: {
          ...project.parameters,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      })
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

