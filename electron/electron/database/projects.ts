import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { randomUUID } from 'node:crypto'

export interface Project {
  uuid: string
  name: string
  status: string
  parameters: Record<string, unknown>
  created_at: string
  updated_at: string
}

interface ProjectDatabase {
  projects: Project[]
}

const defaultData: ProjectDatabase = {
  projects: []
}

class ProjectTable {
  private db: Low<ProjectDatabase> | null = null
  private dbPath: string = ''

  async init() {
    const userDataPath = app.getPath('userData')
    const dbDir = path.join(userDataPath, 'database')
    
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    this.dbPath = path.join(dbDir, 'projects.json')

    const adapter = new JSONFile<ProjectDatabase>(this.dbPath)
    this.db = new Low(adapter, defaultData)

    await this.db.read()

    if (!this.db.data) {
      this.db.data = defaultData
      await this.db.write()
    }

    console.log('Projects table initialized at:', this.dbPath)
  }

  async getAll(): Promise<Project[]> {
    await this.db!.read()
    return this.db!.data.projects
  }

  async getOne(uuid: string): Promise<Project | null> {
    await this.db!.read()
    return this.db!.data.projects.find(p => p.uuid === uuid) || null
  }

  async create(project: Omit<Project, 'uuid' | 'created_at' | 'updated_at'>): Promise<Project> {
    await this.db!.read()
    const now = new Date().toISOString()
    const newProject: Project = {
      uuid: randomUUID(),
      ...project,
      created_at: now,
      updated_at: now
    }
    this.db!.data.projects.push(newProject)
    await this.db!.write()
    return newProject
  }

  async update(uuid: string, updates: Partial<Omit<Project, 'uuid' | 'created_at'>>): Promise<Project | null> {
    await this.db!.read()
    const project = this.db!.data.projects.find(p => p.uuid === uuid)
    if (!project) return null
    
    const updatedProject = {
      ...project,
      ...updates,
      updated_at: new Date().toISOString()
    }

    const index = this.db!.data.projects.findIndex(p => p.uuid === uuid)
    this.db!.data.projects[index] = updatedProject
    
    await this.db!.write()
    return updatedProject
  }

  async delete(uuid: string): Promise<boolean> {
    await this.db!.read()
    const index = this.db!.data.projects.findIndex(p => p.uuid === uuid)
    if (index === -1) return false
    
    this.db!.data.projects.splice(index, 1)
    await this.db!.write()
    return true
  }

  getDbPath(): string {
    return this.dbPath
  }
}

export const projectTable = new ProjectTable()

