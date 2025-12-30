import type { Database } from '../../../database'
import type { Step5Params, Step5Result } from './types'
import { runStep5Container } from './executor'
import path from 'node:path'
import fs from 'node:fs'

/**
 * Execute the entire workflow for Step5.
 * 1. Create a Project with step information
 * 2. Create a Project-specific output folder
 * 3. Run a Docker container
 * 4. Update the success/failure status
 */
export async function executeStep5Workflow(
  database: Database,
  params: Step5Params
): Promise<Step5Result> {
  let project

  try {
    // 1. Create a Project with step information
    project = await database.projects.create({
      name: params.projectName,
      step: '5',
      status: 'running',
      parameters: {
        inputPath: params.inputPath,
        outputPath: params.outputPath
      }
    })

    console.log('Created project:', project)

    // 2. Create a Project-specific output folder
    const baseProjectPath = path.join(params.outputPath, project.uuid)
    const containerOutputPath = path.join(baseProjectPath, 'output')
    const logPath = path.join(baseProjectPath, 'log')

    fs.mkdirSync(containerOutputPath, { recursive: true })
    fs.mkdirSync(logPath, { recursive: true })
    console.log(`Created project output directory: ${containerOutputPath}`)
    console.log(`Created project log directory: ${logPath}`)

    // Update the project with step5-specific paths
    const updatedProject = await database.projects.update(project.uuid, {
      parameters: {
        ...project.parameters,
        step5: {
          outputPath: containerOutputPath,
          logPath: logPath,
        }
      }
    })

    if (!updatedProject) {
      throw new Error('Failed to update project')
    }
    project = updatedProject

    // 3. Run a Docker container (bind mount)
    const dockerResult = await runStep5Container({
      projectName: params.projectName,
      inputPath: params.inputPath,
      outputPath: containerOutputPath, // Container result path
      logPath: logPath,                // Log file path
      projectUuid: project.uuid
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
        step5: {
          ...(project.parameters.step5 as Record<string, unknown> || {}),
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
    console.error('Error in executeStep5Workflow:', error)
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

