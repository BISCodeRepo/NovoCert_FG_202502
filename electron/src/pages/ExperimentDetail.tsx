import { useEffect, useMemo, useState } from "react";
import ParameterViewer from "../components/ParameterViewer";
import { useExperiment } from "../contexts/ExperimentContext";
import type { Experiment } from "../types/experiment";
import type { Project } from "../types/project";
import { PROJECT_STATUS_COLORS, PROJECT_STATUS_LABELS } from "../types/project";
import { getTaskBranch } from "../utils/experimentTasks";

interface ExperimentDetailProps {
  uuid: string;
  onNavigate: (page: string, uuid: string) => void;
}

function sortExperimentTasks(tasks: Project[]): Project[] {
  return [...tasks].sort((a, b) => {
    const na = parseInt(String(a.step ?? "0"), 10);
    const nb = parseInt(String(b.step ?? "0"), 10);
    const stepA = Number.isNaN(na) ? 0 : na;
    const stepB = Number.isNaN(nb) ? 0 : nb;
    if (stepA !== stepB) return stepA - stepB;
    return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
  });
}

const PIPELINE_STEPS = [1, 2, 3, 4, 5, 6] as const;

type StepFilterValue = "all" | (typeof PIPELINE_STEPS)[number];

function taskStepNumber(task: Project): number | null {
  if (task.step == null || task.step === "") return null;
  const n = parseInt(String(task.step), 10);
  return Number.isNaN(n) ? null : n;
}

function ExperimentDetail({ uuid, onNavigate }: ExperimentDetailProps) {
  const { selectExperiment } = useExperiment();
  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [tasks, setTasks] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [stepFilter, setStepFilter] = useState<StepFilterValue>("all");

  useEffect(() => {
    setStepFilter("all");
  }, [uuid]);

  useEffect(() => {
    setLoading(true);
    selectExperiment(uuid);

    const loadOnce = async () => {
      try {
        const [expData, allProjects] = await Promise.all([
          window.db.getExperiment(uuid),
          window.db.getProjects(),
        ]);
        if (!expData) {
          setError("Experiment not found.");
          setExperiment(null);
          setTasks([]);
          return;
        }
        setExperiment(expData as Experiment);
        const filtered = allProjects.filter((p) => p.experiment_uuid === uuid);
        setTasks(sortExperimentTasks(filtered));
        setError(null);
      } catch (e) {
        console.error(e);
        setError("Failed to load experiment.");
      } finally {
        setLoading(false);
      }
    };

    loadOnce();
    const intervalId = setInterval(loadOnce, 3000);
    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- sync header experiment only when uuid changes
  }, [uuid]);

  const sortedTasks = useMemo(() => sortExperimentTasks(tasks), [tasks]);

  const stepCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const s of PIPELINE_STEPS) counts[s] = 0;
    for (const task of sortedTasks) {
      const n = taskStepNumber(task);
      if (n !== null && n >= 1 && n <= 6) counts[n] += 1;
    }
    return counts;
  }, [sortedTasks]);

  const filteredTasks = useMemo(() => {
    if (stepFilter === "all") return sortedTasks;
    return sortedTasks.filter((t) => taskStepNumber(t) === stepFilter);
  }, [sortedTasks, stepFilter]);

  if (loading && !experiment && !error) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error || !experiment) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-semibold">{error || "Experiment not found."}</p>
        <button
          type="button"
          onClick={() => onNavigate("experiments", "")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Back to list
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => onNavigate("experiments", "")}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to experiments
        </button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">{experiment.name}</h1>
        {experiment.description && (
          <p className="mt-2 text-sm text-gray-600 max-w-3xl">{experiment.description}</p>
        )}
        <p className="mt-2 text-xs text-gray-500 font-mono break-all">{experiment.uuid}</p>
      </div>

      <div className="mb-4">
        <h2 className="text-lg font-semibold text-gray-900">
          Tasks
          {stepFilter === "all"
            ? ` (${sortedTasks.length})`
            : ` (${filteredTasks.length} / ${sortedTasks.length})`}
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Click a path to open it in the file explorer (same as task detail).
        </p>

        <div className="mt-4">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Filter by step</p>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStepFilter("all")}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                stepFilter === "all"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All ({sortedTasks.length})
            </button>
            {PIPELINE_STEPS.map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setStepFilter(step)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  stepFilter === step
                    ? "bg-blue-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                Step {step} ({stepCounts[step]})
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {sortedTasks.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center border border-dashed border-gray-200 rounded-lg">
            No tasks yet for this experiment.
          </p>
        ) : filteredTasks.length === 0 ? (
          <p className="text-sm text-gray-500 py-8 text-center border border-dashed border-gray-200 rounded-lg">
            No tasks for Step {stepFilter}.
          </p>
        ) : (
          filteredTasks.map((task) => {
            const branch = getTaskBranch(task);
            return (
              <div
                key={task.uuid}
                className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
              >
                <div className="px-6 py-4 border-b border-gray-100 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-semibold text-gray-900">{task.name}</h3>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-gray-600">
                      <span className="font-mono text-gray-500">{task.uuid}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                        PROJECT_STATUS_COLORS[task.status]
                      }`}
                    >
                      {PROJECT_STATUS_LABELS[task.status]}
                    </span>
                    <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2 py-1 rounded-md">
                      Step {task.step ?? "—"}
                    </span>
                    {branch ? (
                      <span className="text-xs font-medium capitalize text-blue-800 bg-blue-50 px-2 py-1 rounded-md">
                        {branch}
                      </span>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => onNavigate("project-detail", task.uuid)}
                      className="text-xs font-medium text-blue-600 hover:underline"
                    >
                      Task detail
                    </button>
                  </div>
                </div>
                <div className="px-6 py-2 text-xs text-gray-500 border-b border-gray-50">
                  Created {new Date(task.created_at).toLocaleString()} · Updated{" "}
                  {new Date(task.updated_at).toLocaleString()}
                </div>
                <details className="group">
                  <summary className="px-6 py-3 cursor-pointer text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100">
                    Parameters & output paths
                  </summary>
                  <div className="border-t border-gray-200">
                    <ParameterViewer data={task.parameters} />
                  </div>
                </details>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ExperimentDetail;
