import type { Project } from "../types";

export function filterTasksByExperiment(tasks: Project[], experimentUuid?: string | null) {
  if (!experimentUuid) {
    return [];
  }

  return tasks.filter((task) => task.experiment_uuid === experimentUuid);
}

export function latestTaskForStep(tasks: Project[], step: number, experimentUuid?: string | null) {
  return filterTasksByExperiment(tasks, experimentUuid)
    .filter((task) => String(task.step) === String(step))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
}

export function getTaskRootOutputPath(task: Project | null) {
  return typeof task?.parameters?.outputPath === "string" ? task.parameters.outputPath : "";
}

export function getTaskStepOutputPath(task: Project | null) {
  if (!task?.step) {
    return "";
  }

  const stepParams = task.parameters?.[`step${task.step}`] as { outputPath?: string } | undefined;
  return stepParams?.outputPath || getTaskRootOutputPath(task);
}
