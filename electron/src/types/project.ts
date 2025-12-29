export type ProjectStatus = "pending" | "running" | "failed" | "success";

export interface Project {
  uuid: string;
  name: string;
  status: ProjectStatus;
  parameters: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const PROJECT_STATUS_LABELS: Record<ProjectStatus, string> = {
  pending: "대기",
  running: "실행중",
  failed: "실패",
  success: "성공",
};

export const PROJECT_STATUS_COLORS: Record<ProjectStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  running: "bg-blue-100 text-blue-800",
  failed: "bg-red-100 text-red-800",
  success: "bg-green-100 text-green-800",
};

