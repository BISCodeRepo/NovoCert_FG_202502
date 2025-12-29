import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { randomUUID } from 'node:crypto'

export interface Task {
  uuid: string
  project_uuid: string
  step: string
  status: string
  parameters: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface TaskDatabase {
  tasks: Task[]
}

const defaultData: TaskDatabase = {
  tasks: []
}

class TaskTable {
  private db: Low<TaskDatabase> | null = null
  private dbPath: string = ''

  async init() {
    const userDataPath = app.getPath('userData')
    const dbDir = path.join(userDataPath, 'database')
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    this.dbPath = path.join(dbDir, 'tasks.json')

    const adapter = new JSONFile<TaskDatabase>(this.dbPath)
    this.db = new Low(adapter, defaultData)

    await this.db.read()

    if (!this.db.data) {
      this.db.data = defaultData
      await this.db.write()
    }

    console.log('Tasks table initialized at:', this.dbPath)
  }

  async getAll(): Promise<Task[]> {
    await this.db!.read()
    return this.db!.data.tasks
  }

  async getByProject(projectUuid: string): Promise<Task[]> {
    await this.db!.read()
    return this.db!.data.tasks.filter(t => t.project_uuid === projectUuid)
  }

  async getOne(uuid: string): Promise<Task | null> {
    await this.db!.read()
    return this.db!.data.tasks.find(t => t.uuid === uuid) || null
  }

  async create(task: Omit<Task, 'uuid' | 'created_at' | 'updated_at'>): Promise<Task> {
    await this.db!.read()
    const now = new Date().toISOString()
    const newTask: Task = {
      uuid: randomUUID(),
      ...task,
      created_at: now,
      updated_at: now
    }
    this.db!.data.tasks.push(newTask)
    await this.db!.write()
    return newTask
  }

  async update(uuid: string, updates: Partial<Omit<Task, 'uuid' | 'created_at'>>): Promise<Task | null> {
    await this.db!.read()
    const task = this.db!.data.tasks.find(t => t.uuid === uuid)
    if (!task) return null
    
    Object.assign(task, updates, { updated_at: new Date().toISOString() })
    await this.db!.write()
    return task
  }

  async delete(uuid: string): Promise<boolean> {
    await this.db!.read()
    const index = this.db!.data.tasks.findIndex(t => t.uuid === uuid)
    if (index === -1) return false
    
    this.db!.data.tasks.splice(index, 1)
    await this.db!.write()
    return true
  }

  async deleteByProject(projectUuid: string): Promise<number> {
    await this.db!.read()
    const initialLength = this.db!.data.tasks.length
    this.db!.data.tasks = this.db!.data.tasks.filter(t => t.project_uuid !== projectUuid)
    const deletedCount = initialLength - this.db!.data.tasks.length
    
    if (deletedCount > 0) {
      await this.db!.write()
    }
    return deletedCount
  }

  getDbPath(): string {
    return this.dbPath
  }
}

export const taskTable = new TaskTable()

