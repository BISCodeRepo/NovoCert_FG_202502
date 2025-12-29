// 확장된 PATH로 명령어 실행을 위한 유틸리티
export function getExtendedPath(): string {
  const basePath = process.env.PATH || ''
  
  if (process.platform === 'win32') {
    return basePath
  }
  
  // macOS/Linux: 일반적인 Docker 설치 경로 추가
  const additionalPaths = [
    '/usr/local/bin',
    '/usr/bin',
    '/opt/homebrew/bin',
    '/Applications/Docker.app/Contents/Resources/bin'
  ]
  
  return `${basePath}:${additionalPaths.join(':')}`
}

