import { projectTable } from './projects'

export type { Project } from './projects'

export class Database {
  async init() {
    await projectTable.init()
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
}

export const database = new Database()

