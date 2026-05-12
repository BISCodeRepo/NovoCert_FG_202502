/**
 * Docker image configuration
 * Define the list of Docker images used by the application.
 */

export interface DockerImageConfig {
  name: string       
  image: string       
  description: string 
  platform?: string   
  step?: string       
}

/**
 * Returns the native Docker platform string based on the host CPU architecture.
 * Apple Silicon / ARM Windows → linux/arm64
 * Intel Mac / x86 Windows   → linux/amd64
 */
function getNativePlatform(): string {
  return process.arch === 'arm64' ? 'linux/arm64' : 'linux/amd64'
}

/**
 * List of required Docker images
 */
export const REQUIRED_IMAGES: DockerImageConfig[] = [
  {
    name: 'NovoCert P1 - Decoy Spectra Generation',
    image: 'huswim/novocert-p1:1.1.1',
    description: 'Decoy Spectra Generation Tool',
    platform: 'linux/amd64',
    step: 'step1'
  },
  {
    name: 'NovoCert P2-1 - Download Casanovo Config',
    image: 'huswim/novocert-p2-1:1.1.1',
    description: 'Download Casanovo Config',
    platform: 'linux/amd64',
    step: 'step2'
  },
  {
    name: 'NovoCert P2-2 - De novo Peptide Sequencing',
    image: 'huswim/novocert-p2-2:1.1.1',
    description: 'De novo Peptide Sequencing',
    platform: 'linux/amd64',
    step: 'step3'
  },
  {
    name: 'NovoCert P3 - Feature Calculation',
    image: 'huswim/novocert-p3:1.1.1',
    description: 'Feature Calculation',
    platform: 'linux/amd64',
    step: 'step4'
  },
  {
    name: 'NovoCert P4 - Percolator and FDR Control',
    image: 'huswim/novocert-p4:1.1.1',
    description: 'Percolator and FDR Control (for Percolator compatibility on amd64)',
    platform: 'linux/amd64',
    step: 'step5'
  }
]

