import type { Database } from '../../../database'
import type { Step2Params, Step2Result } from './types'
import { runStep2Container } from './executor'
import path from 'node:path'
import fs from 'node:fs'
import { generateProjectFolderName, generateLogFilePath } from '../../utils'

/**
 * Execute the entire workflow for Step2.
 * 1. Create a Project with step information
 * 2. Create a Project-specific output folder
 * 3. Run a Docker container
 * 4. Update the success/failure status
 */
export async function executeStep2Workflow(
  database: Database,
  params: Step2Params
): Promise<Step2Result> {
  let project

  try {
    // 1. Create a Project with step information
    project = await database.projects.create({
      name: params.projectName,
      step: '2',
      status: 'running',
      parameters: {
        outputPath: params.outputPath // Project-level default output path
      }
    })

    // 2. Create a Project-specific output folder
    const projectFolderName = generateProjectFolderName(project.name, project.uuid)
    const baseProjectPath = path.join(params.outputPath, projectFolderName)

    fs.mkdirSync(baseProjectPath, { recursive: true })

    // Generate log file path for workflow logs
    const workflowLogPath = generateLogFilePath(baseProjectPath, '2', project.uuid)
    
    // Helper function to log to both console and file
    const logToFile = (message: string) => {
      console.log(message)
      try {
        fs.appendFileSync(workflowLogPath, `${new Date().toISOString()} [WORKFLOW] ${message}\n`)
      } catch (error) {
        // Ignore file write errors
      }
    }

    logToFile(`Created project: ${JSON.stringify(project)}`)
    logToFile(`Created project directory: ${baseProjectPath}`)

    // Update the project with step2-specific paths
    const updatedProject = await database.projects.update(project.uuid, {
      parameters: {
        ...project.parameters,
        step2: {
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
    const dockerResult = await runStep2Container({
      projectName: params.projectName,
      outputPath: baseProjectPath, // Container result path
      logPath: baseProjectPath,    // Log file path
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

    logToFile(`Docker container started: ${dockerResult.containerId}`)

    // Update the Project status - add containerId
    const finalProject = await database.projects.update(project.uuid, {
      parameters: {
        ...project.parameters,
        step2: {
          ...(project.parameters.step2 as Record<string, unknown> || {}),
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
    const errorMessage = `Error in executeStep2Workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(errorMessage, error)
    // Try to log to file if log path exists
    if (project) {
      try {
        const projectFolderName = generateProjectFolderName(project.name, project.uuid)
        const baseProjectPath = path.join(params.outputPath, projectFolderName)
        const workflowLogPath = generateLogFilePath(baseProjectPath, '2', project.uuid)
        fs.appendFileSync(workflowLogPath, `${new Date().toISOString()} [ERROR] ${errorMessage}\n`)
      } catch {
        // Ignore file write errors
      }
    }
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

