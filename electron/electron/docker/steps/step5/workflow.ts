import type { Database } from '../../../database'
import type { Step5Params, Step5Result } from './types'
import { runStep5Container } from './executor'
import path from 'node:path'
import fs from 'node:fs'
import { generateProjectFolderName, generateLogFilePath } from '../../utils'

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

    // 2. Create a Project-specific output folder
    const projectFolderName = generateProjectFolderName(project.name, project.uuid)
    const baseProjectPath = path.join(params.outputPath, projectFolderName)

    fs.mkdirSync(baseProjectPath, { recursive: true })

    // Generate log file path for workflow logs
    const workflowLogPath = generateLogFilePath(baseProjectPath, '5', project.uuid)
    
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

    // Update the project with step5-specific paths
    const updatedProject = await database.projects.update(project.uuid, {
      parameters: {
        ...project.parameters,
        step5: {
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
    const dockerResult = await runStep5Container({
      projectName: params.projectName,
      inputPath: params.inputPath,
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
    const errorMessage = `Error in executeStep5Workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(errorMessage, error)
    // Try to log to file if log path exists
    if (project) {
      try {
        const projectFolderName = generateProjectFolderName(project.name, project.uuid)
        const baseProjectPath = path.join(params.outputPath, projectFolderName)
        const workflowLogPath = generateLogFilePath(baseProjectPath, '5', project.uuid)
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

