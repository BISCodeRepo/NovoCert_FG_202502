# Docker Steps

Modules for executing Docker containers for each Step.

## 📁 Structure

```
docker/steps/
├── index.ts                # Export all step functions
├── README.md              # This document
├── step1/                 # Step 1: Decoy Spectra Generation
│   ├── index.ts          # step1 module export
│   ├── types.ts          # Step1 related type definitions
│   ├── executor.ts       # Docker container execution logic
│   └── workflow.ts       # Complete workflow (Project → Task → Docker)
├── step2/                 # Step 2: (TODO)
│   ├── index.ts
│   ├── types.ts
│   └── executor.ts
├── step3/                 # Step 3: (TODO)
│   ├── index.ts
│   ├── types.ts
│   └── executor.ts
├── step4/                 # Step 4: (TODO)
│   ├── index.ts
│   ├── types.ts
│   └── executor.ts
└── step5/                 # Step 5: (TODO)
    ├── index.ts
    ├── types.ts
    └── executor.ts
```

## 🎯 File Roles

### `types.ts`
Step-specific parameter and result type definitions
```typescript
export interface StepXParams { ... }
export interface StepXResult { ... }
```

### `executor.ts`
Handles only Docker container execution logic
```typescript
export async function runStepXContainer(params: StepXParams) { ... }
```

### `workflow.ts` (Optional)
Complete workflow logic (Project creation → Task creation → Docker execution → Status update)
```typescript
export async function executeStepXWorkflow(database: Database, params: StepXParams) { ... }
```

### `index.ts`
Module export
```typescript
export { runStepXContainer } from './executor'
export { executeStepXWorkflow } from './workflow'  // if exists
export type { StepXParams, StepXResult } from './types'
```

## 📝 How to Modify Each Step

### 1. Add Parameters (`types.ts`)

```typescript
export interface Step2Params {
  projectName: string
  inputPath: string
  outputPath: string
  
  // Add Step2-specific parameters here
  configPath?: string
  threads?: number
}
```

### 2. Modify Docker Execution Options (`executor.ts`)

#### Volumes (Bind Mounts)
```typescript
volumes: [
  `${inputPath}:/app/input`,
  `${outputPath}:/app/output`,
  `${configPath}:/app/config`,  // added
]
```

#### Environment Variables
```typescript
environment: {
  PROJECT_NAME: projectName,
  THREADS: params.threads?.toString() || '4',  // added
}
```

#### Command
```typescript
command: ['--verbose', '--format', 'json']  // add if needed
```

### 3. Add Workflow (Optional)

If a complete workflow is needed, create a `workflow.ts` file:

```typescript
import type { Database } from '../../../database'
import type { Step2Params, Step2Result } from './types'
import { runStep2Container } from './executor'

export async function executeStep2Workflow(
  database: Database,
  params: Step2Params
): Promise<Step2Result> {
  // 1. Create/Retrieve Project
  // 2. Create Task
  // 3. Execute Docker
  // 4. Update Status
}
```

## 🚀 Usage Examples

### Step 1 (Fully Implemented)

```typescript
// Using executor only
import { runStep1Container } from './docker'

const result = await runStep1Container({
  projectName: 'my-project',
  inputPath: '/path/to/input',
  outputPath: '/path/to/output'
})
```

```typescript
// Using workflow (Recommended)
import { executeStep1Workflow } from './docker'

const result = await executeStep1Workflow(database, {
  projectName: 'my-project',
  inputPath: '/path/to/input',
  outputPath: '/path/to/output'
})
```

### Usage in main.ts

```typescript
import { executeStep1Workflow } from './docker'

ipcMain.handle('step:runStep1', async (_, params) => {
  return await executeStep1Workflow(database, params)
})
```

## ✨ Benefits

1. **Modularity**: Each Step is separated into an independent folder
2. **Clear Responsibilities**: Roles separated into types, executor, and workflow
3. **Extensibility**: Easy to add new files
4. **Reusability**: executor and workflow can be used independently
5. **Maintainability**: Each Step's logic is clearly separated

## 🔧 Common Functions

All Steps use the `runDockerContainer()` function from `../container.ts`:

- **runDockerContainer**: Execute Docker container (common logic)
- **stopContainer**: Stop a running container
- **getContainerLogs**: Retrieve container logs
