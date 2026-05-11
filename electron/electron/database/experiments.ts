import { app } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { Low } from 'lowdb'
import { JSONFile } from 'lowdb/node'
import { randomUUID } from 'node:crypto'

export interface Experiment {
  uuid: string
  name: string
  description?: string
  created_at: string
  updated_at: string
}

interface ExperimentDatabase {
  experiments: Experiment[]
}

const defaultData: ExperimentDatabase = {
  experiments: []
}

function normalizeExperimentName(name: string) {
  return name.trim().toLowerCase()
}

class ExperimentTable {
  private db: Low<ExperimentDatabase> | null = null
  private dbPath: string = ''

  async init() {
    const userDataPath = app.getPath('userData')
    const dbDir = path.join(userDataPath, 'database')

    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true })
    }

    this.dbPath = path.join(dbDir, 'experiments.json')

    const adapter = new JSONFile<ExperimentDatabase>(this.dbPath)
    this.db = new Low(adapter, defaultData)

    await this.db.read()

    if (!this.db.data) {
      this.db.data = defaultData
      await this.db.write()
    }

    console.log('Experiments table initialized at:', this.dbPath)
  }

  async getAll(): Promise<Experiment[]> {
    await this.db!.read()
    return this.db!.data.experiments
  }

  async getOne(uuid: string): Promise<Experiment | null> {
    await this.db!.read()
    return this.db!.data.experiments.find(e => e.uuid === uuid) || null
  }

  async create(experiment: Omit<Experiment, 'uuid' | 'created_at' | 'updated_at'>): Promise<Experiment> {
    await this.db!.read()
    const normalizedName = normalizeExperimentName(experiment.name)
    const exists = this.db!.data.experiments.some(
      e => normalizeExperimentName(e.name) === normalizedName
    )

    if (exists) {
      throw new Error(`Experiment name already exists: ${experiment.name}`)
    }

    const now = new Date().toISOString()
    const newExperiment: Experiment = {
      uuid: randomUUID(),
      ...experiment,
      name: experiment.name.trim(),
      created_at: now,
      updated_at: now
    }
    this.db!.data.experiments.push(newExperiment)
    await this.db!.write()
    return newExperiment
  }

  async update(uuid: string, updates: Partial<Omit<Experiment, 'uuid' | 'created_at'>>): Promise<Experiment | null> {
    await this.db!.read()
    const experiment = this.db!.data.experiments.find(e => e.uuid === uuid)
    if (!experiment) return null

    if (updates.name !== undefined) {
      const normalizedName = normalizeExperimentName(updates.name)
      const exists = this.db!.data.experiments.some(
        e => e.uuid !== uuid && normalizeExperimentName(e.name) === normalizedName
      )

      if (exists) {
        throw new Error(`Experiment name already exists: ${updates.name}`)
      }

      updates.name = updates.name.trim()
    }

    const updatedExperiment = {
      ...experiment,
      ...updates,
      updated_at: new Date().toISOString()
    }

    const index = this.db!.data.experiments.findIndex(e => e.uuid === uuid)
    this.db!.data.experiments[index] = updatedExperiment

    await this.db!.write()
    return updatedExperiment
  }

  async delete(uuid: string): Promise<boolean> {
    await this.db!.read()
    const index = this.db!.data.experiments.findIndex(e => e.uuid === uuid)
    if (index === -1) return false

    this.db!.data.experiments.splice(index, 1)
    await this.db!.write()
    return true
  }

  getDbPath(): string {
    return this.dbPath
  }
}

export const experimentTable = new ExperimentTable()
