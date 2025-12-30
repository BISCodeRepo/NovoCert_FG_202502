export type TaskStatus = "pending" | "running" | "failed" | "success";

export interface Task {
  uuid: string;
  project_uuid: string; // 외래키
  step: string;
  status: TaskStatus;
  parameters: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Pending",
  running: "Running",
  failed: "Failed",
  success: "Success",
};

export const TASK_STATUS_COLORS: Record<TaskStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  running: "bg-blue-100 text-blue-800",
  failed: "bg-red-100 text-red-800",
  success: "bg-green-100 text-green-800",
};

