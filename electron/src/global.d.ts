import { Project, ProjectStatus, Task, TaskStatus } from './types'

interface DatabaseAPI {
  // Projects
  getProjects: () => Promise<Project[]>
  getProject: (uuid: string) => Promise<Project | null>
  addProject: (project: { name: string; status: ProjectStatus; parameters: Record<string, unknown> }) => Promise<Project>
  updateProject: (uuid: string, updates: { name?: string; status?: ProjectStatus; parameters?: Record<string, unknown> }) => Promise<Project | null>
  deleteProject: (uuid: string) => Promise<boolean>
  getDbPath: () => Promise<string>
  
  // Tasks
  getTasks: () => Promise<Task[]>
  getTasksByProject: (projectUuid: string) => Promise<Task[]>
  getTask: (uuid: string) => Promise<Task | null>
  addTask: (task: { project_uuid: string; step: string; status: TaskStatus; parameters: Record<string, unknown> }) => Promise<Task>
  updateTask: (uuid: string, updates: { step?: string; status?: TaskStatus; parameters?: Record<string, unknown> }) => Promise<Task | null>
  deleteTask: (uuid: string) => Promise<boolean>
  deleteTasksByProject: (projectUuid: string) => Promise<number>
}

interface DockerCheckResult {
  installed?: boolean
  running?: boolean
  version?: string
  info?: string
  error?: string
}

interface ImageStatus {
  name: string
  image: string
  description: string
  exists: boolean
  platform?: string
  step?: string
  error?: string
}

interface DockerImagesResult {
  success: boolean
  images?: ImageStatus[]
  error?: string
}

interface DockerDownloadResult {
  success: boolean
  results?: Array<{ image: string; success: boolean; error?: string }>
  error?: string
}

interface DockerAPI {
  checkInstalled: () => Promise<DockerCheckResult>
  checkRunning: () => Promise<DockerCheckResult>
  checkRequiredImages: () => Promise<DockerImagesResult>
  downloadMissingImages: () => Promise<DockerDownloadResult>
  pullImage: (imageName: string) => Promise<{ success: boolean; output?: string; error?: string }>
  isContainerRunning: (containerId: string) => Promise<{ success: boolean; running: boolean; error?: string }>
  getProjectUuidFromContainer: (containerId: string) => Promise<{ success: boolean; projectUuid: string | null; error?: string }>
  findContainersByProject: (projectUuid: string) => Promise<{ success: boolean; containerIds: string[]; error?: string }>
}

interface DialogAPI {
  selectFolder: () => Promise<{ canceled: boolean; path: string | null }>
  selectFile: (options?: { 
    filters?: { name: string; extensions: string[] }[]
    defaultPath?: string
  }) => Promise<{ canceled: boolean; path: string | null }>
}

interface FsAPI {
  findLatestFile: (directoryPath: string, extension: string) => Promise<{ success: boolean; path: string | null; error: string | null }>
}

interface ShellAPI {
  openPath: (filePath: string) => Promise<{ success: boolean; error?: string }>
  showItemInFolder: (filePath: string) => Promise<{ success: boolean; error?: string }>
}

interface Step1Params {
  projectName: string
  inputPath: string
  outputPath: string
  memory: string
  precursorTolerance: string
  randomSeed: string
}

interface Step1Result {
  success: boolean
  project?: Project
  task?: Task
  containerId?: string
  error?: string
}

interface Step2Params {
  projectName: string
  outputPath: string
}

interface Step2Result {
  success: boolean
  project?: Project
  task?: Task
  containerId?: string
  error?: string
}

interface Step3Params {
  projectName: string
  spectraPath: string
  casanovoConfigPath: string
  modelPath: string
  outputPath: string
}

interface Step3Result {
  success: boolean
  project?: Project
  task?: Task
  containerId?: string
  error?: string
}

interface Step4Params {
  projectName: string
  targetMgfDir: string
  targetResultPath: string
  decoyMgfDir: string
  decoyResultPath: string
  outputPath: string
}

interface Step4Result {
  success: boolean
  project?: Project
  task?: Task
  containerId?: string
  error?: string
}

interface Step5Params {
  projectName: string
  inputPath: string
  outputPath: string
}

interface Step5Result {
  success: boolean
  project?: Project
  task?: Task
  containerId?: string
  error?: string
}

interface StepAPI {
  runStep1: (params: Step1Params) => Promise<Step1Result>
  runStep2: (params: Step2Params) => Promise<Step2Result>
  runStep3: (params: Step3Params) => Promise<Step3Result>
  runStep4: (params: Step4Params) => Promise<Step4Result>
  runStep5: (params: Step5Params) => Promise<Step5Result>
}

declare global {
  interface Window {
    db: DatabaseAPI
    docker: DockerAPI
    dialog: DialogAPI
    fs: FsAPI
    shell: ShellAPI
    step: StepAPI
    ipcRenderer: {
      on(channel: string, func: (...args: unknown[]) => void): void
      off(channel: string, func: (...args: unknown[]) => void): void
      send(channel: string, ...args: unknown[]): void
      invoke(channel: string, ...args: unknown[]): Promise<unknown>
    }
  }
}

export {}

