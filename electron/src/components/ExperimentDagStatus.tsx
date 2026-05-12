import { useEffect, useMemo, useState } from "react";
import { useExperiment } from "../contexts/ExperimentContext";
import type { Project } from "../types";
import { filterTasksByBranch, filterTasksByExperiment, getTaskBranch, TaskBranch } from "../utils/experimentTasks";

interface ExperimentDagStatusProps {
  currentStep?: number;
  refreshTrigger?: string | null;
}

interface DagNode {
  id: string;
  label: string;
  step: number;
  branch?: TaskBranch;
  /** Shown in UI; step 2 is a single optional download */
  optional?: boolean;
}

/** Step 1 once, Step 2 optional once, Step 3 twice (target + decoy), then merge. */
const dagNodes: DagNode[] = [
  { id: "step-1", label: "Step 1 · Decoy spectra", step: 1 },
  { id: "step-2", label: "Step 2 · Casanovo config", step: 2, optional: true },
  { id: "target-3", label: "Step 3 · Target (MGF)", step: 3, branch: "target" },
  { id: "decoy-3", label: "Step 3 · Decoy (MGF)", step: 3, branch: "decoy" },
  { id: "step-4", label: "Step 4", step: 4 },
  { id: "step-5", label: "Step 5", step: 5 },
  { id: "step-6", label: "Step 6", step: 6 },
];

const DAG_SECTIONS = [
  { title: "Setup", start: 0, end: 2 },
  { title: "De novo (run twice)", start: 2, end: 4 },
  { title: "Merge and analysis", start: 4, end: dagNodes.length },
] as const;

function statusClass(status?: string) {
  switch (status) {
    case "running":
      return "border-blue-400 bg-blue-50 text-blue-800";
    case "success":
      return "border-green-400 bg-green-50 text-green-800";
    case "failed":
      return "border-red-400 bg-red-50 text-red-800";
    case "pending":
      return "border-yellow-300 bg-yellow-50 text-yellow-800";
    default:
      return "border-gray-200 bg-gray-50 text-gray-500";
  }
}

function latestForNode(tasks: Project[], node: DagNode) {
  const scoped = node.branch ? filterTasksByBranch(tasks, node.branch) : tasks;
  return scoped
    .filter((task) => String(task.step) === String(node.step))
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null;
}

function getContainerId(task: Project) {
  const stepParams = task.parameters?.[`step${task.step}`] as { containerId?: string } | undefined;
  return stepParams?.containerId || null;
}

function ExperimentDagStatus({ currentStep, refreshTrigger }: ExperimentDagStatusProps) {
  const { currentExperiment } = useExperiment();
  const [tasks, setTasks] = useState<Project[]>([]);

  const loadAndUpdateTasks = async () => {
    if (!currentExperiment?.uuid) {
      setTasks([]);
      return;
    }

    const allTasks = await window.db.getProjects();
    const experimentTasks = filterTasksByExperiment(allTasks, currentExperiment.uuid);

    for (const task of experimentTasks.filter((item) => item.status === "running")) {
      const containerId = getContainerId(task);
      if (!containerId) {
        continue;
      }

      const runningResult = await window.docker.isContainerRunning(containerId);
      if (runningResult.success && !runningResult.running) {
        const exitCodeResult = await window.docker.getContainerExitCode(containerId);
        const nextStatus =
          exitCodeResult.success && exitCodeResult.exitCode !== null
            ? exitCodeResult.exitCode === 0
              ? "success"
              : "failed"
            : "success";
        await window.db.updateProject(task.uuid, { status: nextStatus });
        task.status = nextStatus;
      }
    }

    setTasks([...experimentTasks]);
  };

  useEffect(() => {
    loadAndUpdateTasks();
    const intervalId = setInterval(loadAndUpdateTasks, 2000);

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExperiment?.uuid, refreshTrigger]);

  const runningTasks = useMemo(
    () => tasks.filter((task) => task.status === "running"),
    [tasks]
  );

  const nodeData = useMemo(
    () =>
      dagNodes.map((node) => {
        const task = latestForNode(tasks, node);
        const count = (node.branch ? filterTasksByBranch(tasks, node.branch) : tasks).filter(
          (item) => String(item.step) === String(node.step)
        ).length;
        return { node, task, count };
      }),
    [tasks]
  );

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-gray-900">Experiment DAG</h3>
        <p className="mt-1 text-xs text-gray-500">
          {currentExperiment ? currentExperiment.name : "No experiment selected"}
        </p>
      </div>

      <div className="space-y-4">
        {DAG_SECTIONS.map(({ title, start, end }) => (
          <div key={title}>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {title}
            </div>
            <div className="grid grid-cols-1 gap-2">
              {nodeData.slice(start, end).map(({ node, task, count }) => (
                <DagNodeCard
                  key={node.id}
                  node={node}
                  task={task}
                  count={count}
                  active={currentStep === node.step}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 border-t border-gray-100 pt-4">
        <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-500">
          Running task
        </h4>
        {runningTasks.length === 0 ? (
          <p className="mt-2 text-sm text-gray-500">No task is currently running.</p>
        ) : (
          <div className="mt-2 space-y-2">
            {runningTasks.map((task) => (
              <div key={task.uuid} className="rounded-md border border-blue-200 bg-blue-50 p-3">
                <p className="text-sm font-medium text-blue-900">{task.name}</p>
                <p className="mt-1 text-xs text-blue-700">
                  Step {task.step}
                  {getTaskBranch(task) ? ` / ${getTaskBranch(task)}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DagNodeCard({
  node,
  task,
  count,
  active,
}: {
  node: DagNode;
  task: Project | null;
  count: number;
  active: boolean;
}) {
  const status = task?.status;

  return (
    <div
      className={`rounded-md border px-3 py-2 ${statusClass(status)} ${
        active ? "ring-2 ring-blue-500 ring-offset-1" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold">
          {node.label}
          {node.optional ? (
            <span className="ml-1.5 font-normal normal-case text-[10px] text-gray-500">(optional)</span>
          ) : null}
        </span>
        <span className="text-[10px] font-semibold uppercase">
          {status || "not run"}
        </span>
      </div>
      <div className="mt-1 flex items-center justify-between gap-2 text-[11px]">
        <span className="truncate">{task?.name || "No task yet"}</span>
        <span className="shrink-0">Runs: {count}</span>
      </div>
    </div>
  );
}

export default ExperimentDagStatus;
