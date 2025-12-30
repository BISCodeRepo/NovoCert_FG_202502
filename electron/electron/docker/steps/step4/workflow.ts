import type { Database } from '../../../database'
import type { Step4Params, Step4Result } from './types'
import { runStep4Container } from './executor'
import path from 'node:path'
import fs from 'node:fs'

/**
 * Execute the entire workflow for Step4.
 * 1. Create a Project with step information
 * 2. Create a Project-specific output folder
 * 3. Run a Docker container
 * 4. Update the success/failure status
 */
export async function executeStep4Workflow(
  database: Database,
  params: Step4Params
): Promise<Step4Result> {
  let project

  try {
    // 1. Create a Project with step information
    project = await database.projects.create({
      name: params.projectName,
      step: '4',
      status: 'running',
      parameters: {
        targetMgfDir: params.targetMgfDir,
        targetResultPath: params.targetResultPath,
        decoyMgfDir: params.decoyMgfDir,
        decoyResultPath: params.decoyResultPath,
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

    // Update the project with step4-specific paths
    const updatedProject = await database.projects.update(project.uuid, {
      parameters: {
        ...project.parameters,
        step4: {
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
    const dockerResult = await runStep4Container({
      projectName: params.projectName,
      targetMgfDir: params.targetMgfDir,
      targetResultPath: params.targetResultPath,
      decoyMgfDir: params.decoyMgfDir,
      decoyResultPath: params.decoyResultPath,
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
        step4: {
          ...(project.parameters.step4 as Record<string, unknown> || {}),
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
    console.error('Error in executeStep4Workflow:', error)
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

