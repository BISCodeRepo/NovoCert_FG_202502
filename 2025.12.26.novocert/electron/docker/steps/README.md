# Docker Steps

각 Step별 Docker 컨테이너 실행을 위한 모듈입니다.

## 📁 구조

```
docker/steps/
├── index.ts                # 모든 step 함수 export
├── README.md              # 이 문서
├── step1/                 # Step 1: Decoy Spectra Generation
│   ├── index.ts          # step1 모듈 export
│   ├── types.ts          # Step1 관련 타입 정의
│   ├── executor.ts       # Docker 컨테이너 실행 로직
│   └── workflow.ts       # 전체 워크플로우 (Project → Task → Docker)
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

## 🎯 파일 역할

### `types.ts`
Step별 파라미터, 결과 타입 정의
```typescript
export interface StepXParams { ... }
export interface StepXResult { ... }
```

### `executor.ts`
Docker 컨테이너 실행 로직만 담당
```typescript
export async function runStepXContainer(params: StepXParams) { ... }
```

### `workflow.ts` (선택)
전체 워크플로우 로직 (Project 생성 → Task 생성 → Docker 실행 → 상태 업데이트)
```typescript
export async function executeStepXWorkflow(database: Database, params: StepXParams) { ... }
```

### `index.ts`
모듈 export
```typescript
export { runStepXContainer } from './executor'
export { executeStepXWorkflow } from './workflow'  // 있는 경우
export type { StepXParams, StepXResult } from './types'
```

## 📝 Step별 수정 방법

### 1. 파라미터 추가 (`types.ts`)

```typescript
export interface Step2Params {
  projectName: string
  inputPath: string
  outputPath: string
  uid?: string
  gid?: string
  // 여기에 Step2 전용 파라미터 추가
  configPath?: string
  threads?: number
}
```

### 2. Docker 실행 옵션 수정 (`executor.ts`)

#### Volumes (Bind Mounts)
```typescript
volumes: [
  `${inputPath}:/app/input`,
  `${outputPath}:/app/output`,
  `${configPath}:/app/config`,  // 추가
]
```

#### Environment Variables
```typescript
environment: {
  PROJECT_NAME: projectName,
  THREADS: params.threads?.toString() || '4',  // 추가
}
```

#### Command
```typescript
command: ['--verbose', '--format', 'json']  // 필요시 추가
```

### 3. Workflow 추가 (선택)

전체 워크플로우가 필요한 경우 `workflow.ts` 파일 생성:

```typescript
import type { Database } from '../../../database'
import type { Step2Params, Step2Result } from './types'
import { runStep2Container } from './executor'

export async function executeStep2Workflow(
  database: Database,
  params: Step2Params
): Promise<Step2Result> {
  // 1. Project 생성/조회
  // 2. Task 생성
  // 3. Docker 실행
  // 4. 상태 업데이트
}
```

## 🚀 사용 예시

### Step 1 (완전 구현됨)

```typescript
// executor만 사용
import { runStep1Container } from './docker'

const result = await runStep1Container({
  projectName: 'my-project',
  inputPath: '/path/to/input',
  outputPath: '/path/to/output'
})
```

```typescript
// workflow 사용 (권장)
import { executeStep1Workflow } from './docker'

const result = await executeStep1Workflow(database, {
  projectName: 'my-project',
  inputPath: '/path/to/input',
  outputPath: '/path/to/output'
})
```

### main.ts에서 사용

```typescript
import { executeStep1Workflow } from './docker'

ipcMain.handle('step:runStep1', async (_, params) => {
  return await executeStep1Workflow(database, params)
})
```

## ✨ 장점

1. **모듈화**: 각 Step이 독립적인 폴더로 분리
2. **명확한 책임**: types, executor, workflow로 역할 분리
3. **확장성**: 새로운 파일 추가가 자유로움
4. **재사용성**: executor와 workflow를 독립적으로 사용 가능
5. **유지보수**: 각 Step의 로직이 명확히 분리됨

## 🔧 공통 함수

모든 Step은 `../executor.ts`의 `runDockerContainer()` 함수를 사용합니다:

- **runDockerContainer**: Docker 컨테이너 실행 (공통 로직)
- **stopContainer**: 실행 중인 컨테이너 중지
- **getContainerLogs**: 컨테이너 로그 조회

