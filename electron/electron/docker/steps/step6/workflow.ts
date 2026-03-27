import type { Database } from '../../../database'
import type { Step6Params, Step6Result } from './types'
import { executeStep6Analysis } from './executor'
import path from 'node:path'
import fs from 'node:fs'
import { generateProjectFolderName, generateLogFilePath } from '../../utils'

/**
 * Execute the entire workflow for Step6.
 * 1. Create a Project with step information
 * 2. Create a Project-specific output folder
 * 3. Execute Post Analysis (without Docker)
 * 4. Update the success/failure status
 */
export async function executeStep6Workflow(
  database: Database,
  params: Step6Params
): Promise<Step6Result> {
  let project

  try {
    // 1. Create a Project with step information
    project = await database.projects.create({
      name: params.projectName,
      step: '6',
      status: 'running',
      parameters: {
        csvFilePath: params.csvFilePath,
        previousStepPath: params.previousStepPath,
        outputPath: params.outputPath || path.dirname(params.csvFilePath)
      }
    })

    // 2. Create a Project-specific output folder
    const outputPath = params.outputPath || path.dirname(params.csvFilePath)
    const projectFolderName = generateProjectFolderName(project.name, project.uuid)
    const baseProjectPath = path.join(outputPath, projectFolderName)

    fs.mkdirSync(baseProjectPath, { recursive: true })

    // Generate log file path for workflow logs
    const workflowLogPath = generateLogFilePath(baseProjectPath, '6', project.uuid)
    
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

    // Update the project with step6-specific paths
    const updatedProject = await database.projects.update(project.uuid, {
      parameters: {
        ...project.parameters,
        step6: {
          outputPath: baseProjectPath,
          logPath: baseProjectPath,
        }
      }
    })

    if (!updatedProject) {
      throw new Error('Failed to update project')
    }
    project = updatedProject

    // 3. Execute Post Analysis (without Docker)
    const analysisResult = await executeStep6Analysis({
      projectName: params.projectName,
      csvFilePath: params.csvFilePath,
      previousStepPath: params.previousStepPath,
      outputPath: baseProjectPath,
      logPath: baseProjectPath,
      projectUuid: project.uuid
    })

    if (!analysisResult.success) {
      // If the analysis fails, update the Project status to failed
      const failedProject = await database.projects.update(project.uuid, {
        status: 'failed',
        parameters: {
          ...project.parameters,
          error: analysisResult.error
        }
      })

      return {
        success: false,
        error: analysisResult.error,
        project: failedProject || project
      }
    }

    logToFile(`Post Analysis completed successfully`)

    // Update the Project status to success
    const finalProject = await database.projects.update(project.uuid, {
      status: 'success',
      parameters: {
        ...project.parameters,
        step6: {
          ...(project.parameters.step6 as Record<string, unknown> || {}),
          completedAt: new Date().toISOString()
        }
      }
    })

    return {
      success: true,
      project: finalProject || project
    }
  } catch (error: unknown) {
    const errorMessage = `Error in executeStep6Workflow: ${error instanceof Error ? error.message : 'Unknown error'}`
    console.error(errorMessage, error)
    // Try to log to file if log path exists
    if (project) {
      try {
        const outputPath = params.outputPath || path.dirname(params.csvFilePath)
        const projectFolderName = generateProjectFolderName(project.name, project.uuid)
        const baseProjectPath = path.join(outputPath, projectFolderName)
        const workflowLogPath = generateLogFilePath(baseProjectPath, '6', project.uuid)
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
