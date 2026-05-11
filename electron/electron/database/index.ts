import { projectTable } from './projects'
import { experimentTable } from './experiments'

export type { Project } from './projects'
export type { Experiment } from './experiments'

export class Database {
  async init() {
    await experimentTable.init()
    await projectTable.init()
    console.log('Database initialized')
  }

  // Experiment operations
  get experiments() {
    return {
      getAll: () => experimentTable.getAll(),
      getOne: (uuid: string) => experimentTable.getOne(uuid),
      create: (experiment: Parameters<typeof experimentTable.create>[0]) => experimentTable.create(experiment),
      update: (uuid: string, updates: Parameters<typeof experimentTable.update>[1]) => experimentTable.update(uuid, updates),
      delete: (uuid: string) => experimentTable.delete(uuid),
      getDbPath: () => experimentTable.getDbPath()
    }
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
}

export const database = new Database()
