/**
 * Docker 이미지 설정
 * 애플리케이션에서 사용할 Docker 이미지 목록을 정의합니다.
 */

export interface DockerImageConfig {
  name: string        // 표시할 이름
  image: string       // 실제 이미지 이름 (예: nginx:latest)
  description: string // 설명
  platform?: string   // 플랫폼 (예: linux/amd64, linux/arm64)
  step?: string       // 해당하는 단계 (예: step1, step2)
}

/**
 * 필요한 Docker 이미지 목록
 */
export const REQUIRED_IMAGES: DockerImageConfig[] = [
  {
    name: 'NovoCert Decoy Spectra',
    image: 'ghcr.io/huswim/novocert-docker-1-decoy-spectra-generation:main',
    description: 'Decoy Spectra 생성 도구',
    platform: 'linux/amd64',
    step: 'step1'
  },
  {
    name: 'PostgreSQL',
    image: 'postgres:latest',
    description: '관계형 데이터베이스 (임시 - Step2)',
    platform: 'linux/amd64',
    step: 'step2'
  },
  {
    name: 'Redis',
    image: 'redis:latest',
    description: '인메모리 데이터 저장소 (임시 - Step3)',
    platform: 'linux/amd64',
    step: 'step3'
  },
  {
    name: 'Nginx',
    image: 'nginx:latest',
    description: '웹 서버 및 리버스 프록시 (임시 - Step4)',
    platform: 'linux/amd64',
    step: 'step4'
  }
]

