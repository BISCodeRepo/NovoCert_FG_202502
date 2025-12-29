export type CheckStatus = "pending" | "checking" | "success" | "error";

export interface DockerInstallStatus {
  status: CheckStatus;
  version?: string;
  error?: string;
}

export interface DockerRunningStatus {
  status: CheckStatus;
  info?: string;
  error?: string;
}

export interface DockerImageInfo {
  name: string;
  image: string;
  description: string;
  exists: boolean;
  platform?: string;
  step?: string;
  error?: string;
}

export interface DockerImageDownloadProgress {
  image: string;
  name: string;
  status: "downloading" | "success" | "error";
  error?: string;
}

export interface DockerImagesStatus {
  status: CheckStatus;
  images?: DockerImageInfo[];
  downloadProgress?: DockerImageDownloadProgress[];
  downloadResults?: Array<{ image: string; success: boolean; error?: string }>;
  error?: string;
}

