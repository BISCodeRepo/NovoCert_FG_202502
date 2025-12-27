import { projectTable } from './projects'
import { taskTable } from './tasks'

export type { Project } from './projects'
export type { Task } from './tasks'

export class Database {
  async init() {
    await projectTable.init()
    await taskTable.init()
    console.log('Database initialized')
  }

  // Project operations
  get projects() {
    return {
      getAll: () => projectTable.getAll(),
      getOne: (uuid: string) => projectTable.getOne(uuid),
      create: (project: Parameters<typeof projectTable.create>[0]) => projectTable.create(project),
      update: (uuid: string, updates: Parameters<typeof projectTable.update>[1]) => projectTable.update(uuid, updates),
      delete: (uuid: string) => projectTable.delete(uuid),
      getDbPath: () => projectTable.getDbPath()
    }
  }

  // Task operations
  get tasks() {
    return {
      getAll: () => taskTable.getAll(),
      getByProject: (projectUuid: string) => taskTable.getByProject(projectUuid),
      getOne: (uuid: string) => taskTable.getOne(uuid),
      create: (task: Parameters<typeof taskTable.create>[0]) => taskTable.create(task),
      update: (uuid: string, updates: Parameters<typeof taskTable.update>[1]) => taskTable.update(uuid, updates),
      delete: (uuid: string) => taskTable.delete(uuid),
      deleteByProject: (projectUuid: string) => taskTable.deleteByProject(projectUuid),
      getDbPath: () => taskTable.getDbPath()
    }
  }
}

export const database = new Database()

