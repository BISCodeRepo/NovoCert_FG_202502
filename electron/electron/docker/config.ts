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
    name: 'NovoCert P1 - Decoy Spectra Generation',
    image: 'huswim/novocert-p1',
    description: 'Decoy Spectra 생성 도구',
    platform: 'linux/arm64',
    step: 'step1'
  },
  {
    name: 'NovoCert P2-1 - Download Casanovo Config',
    image: 'huswim/novocert-p2-1',
    description: 'Casanovo 설정 다운로드',
    platform: 'linux/arm64',
    step: 'step2'
  },
  {
    name: 'NovoCert P2-2 - De-novo Peptide Sequencing',
    image: 'huswim/novocert-p2-2',
    description: 'De-novo 펩타이드 시퀀싱',
    platform: 'linux/arm64',
    step: 'step3'
  },
  {
    name: 'NovoCert P3 - Feature Calculation',
    image: 'huswim/novocert-p3',
    description: '특성 계산',
    platform: 'linux/arm64',
    step: 'step4'
  },
  {
    name: 'NovoCert P4 - Percolator and FDR Control',
    image: 'huswim/novocert-p4',
    description: 'Percolator 및 FDR 제어 (Percolator 호환성으로 amd64)',
    platform: 'linux/amd64',
    step: 'step5'
  }
]

