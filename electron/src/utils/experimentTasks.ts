import type { Project } from "../types";

export type TaskBranch = "target" | "decoy";

export function getDefaultTaskName(experimentName: string | undefined, step: number, branch?: TaskBranch) {
  const baseName = experimentName?.trim() || "experiment";
  if (branch && step <= 3) {
    return `${baseName}-${branch}-step${step}`;
  }
  return `${baseName}-step${step}`;
}

export function getNextTaskName(
  tasks: Project[],
  experimentUuid: string | undefined | null,
  experimentName: string | undefined,
  step: number,
  branch?: TaskBranch
) {
  const baseName = getDefaultTaskName(experimentName, step, branch);
  const existingNames = new Set(
    filterTasksByExperiment(tasks, experimentUuid).map((task) => task.name.trim().toLowerCase())
  );

  if (!existingNames.has(baseName.toLowerCase())) {
    return baseName;
  }

  let index = 2;
  while (existingNames.has(`${baseName}-${index}`.toLowerCase())) {
    index += 1;
  }
  return `${baseName}-${index}`;
}

export function getTaskBranch(task: Project): TaskBranch | null {
  const branch = task.parameters?.branch;
  return branch === "target" || branch === "decoy" ? branch : null;
}

export function filterTasksByExperiment(tasks: Project[], experimentUuid?: string | null) {
  if (!experimentUuid) {
    return [];
  }

  return tasks.filter((task) => task.experiment_uuid === experimentUuid);
}

export function filterTasksByBranch(tasks: Project[], branch?: TaskBranch | null) {
  if (!branch) {
    return tasks;
  }

  return tasks.filter((task) => getTaskBranch(task) === branch);
}

export function latestTaskForStep(tasks: Project[], step: number, experimentUuid?: string | null, branch?: TaskBranch | null) {
  return filterTasksByBranch(filterTasksByExperiment(tasks, experimentUuid), branch)
    .filter((task) => String(task.step) === String(step))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
}

/**
 * Open experiment at the earliest step that does not yet have a successful run.
 * Step 2 is optional and does not block resume. Step 3 requires both target and decoy successes.
 */
export function getResumeStepPage(experimentTasks: Project[]): string {
  const hasSuccess = (step: number, branch?: TaskBranch) => {
    let scoped = experimentTasks.filter((t) => String(t.step) === String(step));
    if (branch !== undefined) {
      scoped = filterTasksByBranch(scoped, branch);
    }
    return scoped.some((t) => t.status === "success");
  };

  if (!hasSuccess(1)) return "step1";
  if (!hasSuccess(3, "target") || !hasSuccess(3, "decoy")) return "step3";
  if (!hasSuccess(4)) return "step4";
  if (!hasSuccess(5)) return "step5";
  if (!hasSuccess(6)) return "step6";
  return "step6";
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

/**
 * Resolve the MGF file path from a Step 1 task for use in Step 3 or Step 4.
 * - target branch: looks at parameters.inputPath (the original MGF or folder)
 * - decoy branch:  looks at parameters.step1.outputPath (generated decoy MGF)
 */
export async function resolveMgfPathFromStep1Task(
  task: Project | undefined,
  branch: TaskBranch
): Promise<{ path: string | null; error: string | null }> {
  if (!task) {
    return { path: null, error: "No Step 1 task selected." };
  }

  if (branch === "target") {
    const inputPath = String(
      task.parameters?.inputPath ??
        (task.parameters?.step1 as { inputPath?: string } | undefined)?.inputPath ??
        ""
    ).trim();
    if (!inputPath) {
      return { path: null, error: "Step 1 task has no input path (parameters.inputPath)." };
    }
    if (inputPath.toLowerCase().endsWith(".mgf")) {
      return { path: inputPath, error: null };
    }
    const result = await window.fs.findLatestFile(inputPath, "mgf");
    if (result.success && result.path) {
      return { path: result.path, error: null };
    }
    return {
      path: null,
      error: result.error || `Cannot find an MGF file under Step 1 input path: ${inputPath}`,
    };
  }

  // decoy: use Step 1 output folder
  const step1Params = task.parameters?.step1 as { outputPath?: string } | undefined;
  const out = String(step1Params?.outputPath ?? "").trim();
  if (!out) {
    return { path: null, error: "Step 1 task has no output path (step1.outputPath)." };
  }
  const result = await window.fs.findLatestFile(out, "mgf");
  if (result.success && result.path) {
    return { path: result.path, error: null };
  }
  return {
    path: null,
    error: result.error || `Cannot find an MGF file in Step 1 output: ${out}`,
  };
}
