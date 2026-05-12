import { useEffect, useMemo, useState } from "react";
import { useExperiment } from "../contexts/ExperimentContext";
import type { Project } from "../types";
import { filterTasksByBranch, getResumeStepPage } from "../utils/experimentTasks";

interface ExperimentsProps {
  onNavigate: (page: string, uuid: string) => void;
}

type StepCountEntry =
  | { step: number; variant: "single"; successCount: number; failedCount: number }
  | {
      step: 3;
      variant: "split";
      target: { successCount: number; failedCount: number };
      decoy: { successCount: number; failedCount: number };
    };

function Experiments({ onNavigate }: ExperimentsProps) {
  const { experiments, currentExperiment, selectExperiment } = useExperiment();
  const [tasks, setTasks] = useState<Project[]>([]);

  useEffect(() => {
    const loadTasks = async () => {
      const data = await window.db.getProjects();
      setTasks(data);
    };

    loadTasks();
    const intervalId = setInterval(loadTasks, 3000);

    return () => clearInterval(intervalId);
  }, []);

  const experimentSummaries = useMemo(() => {
    return experiments.map((experiment) => {
      const experimentTasks = tasks.filter((task) => task.experiment_uuid === experiment.uuid);
      const stepCounts: StepCountEntry[] = [1, 2, 3, 4, 5, 6].map((step) => {
        const stepTasks = experimentTasks.filter((task) => String(task.step) === String(step));
        if (step === 3) {
          const targetTasks = filterTasksByBranch(stepTasks, "target");
          const decoyTasks = filterTasksByBranch(stepTasks, "decoy");
          return {
            step: 3,
            variant: "split" as const,
            target: {
              successCount: targetTasks.filter((t) => t.status === "success").length,
              failedCount: targetTasks.filter((t) => t.status === "failed").length,
            },
            decoy: {
              successCount: decoyTasks.filter((t) => t.status === "success").length,
              failedCount: decoyTasks.filter((t) => t.status === "failed").length,
            },
          };
        }
        return {
          step,
          variant: "single" as const,
          successCount: stepTasks.filter((t) => t.status === "success").length,
          failedCount: stepTasks.filter((t) => t.status === "failed").length,
        };
      });

      return {
        experiment,
        stepCounts,
        totalCount: experimentTasks.length,
        runningCount: experimentTasks.filter((task) => task.status === "running").length,
        successCount: experimentTasks.filter((task) => task.status === "success").length,
        failedCount: experimentTasks.filter((task) => task.status === "failed").length,
      };
    });
  }, [experiments, tasks]);

  const handleOpenExperiment = async (uuid: string) => {
    selectExperiment(uuid);
    const allTasks = await window.db.getProjects();
    const experimentTasks = allTasks.filter((task) => task.experiment_uuid === uuid);
    const page = getResumeStepPage(experimentTasks);
    onNavigate(page, "");
  };

  const handleCreateExperiment = () => {
    onNavigate("pipeline", "");
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Experiments</h1>
          <p className="text-sm text-gray-500">
            View experiments and how many tasks have been run for each pipeline step.
          </p>
        </div>
        <button
          type="button"
          onClick={handleCreateExperiment}
          className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
        >
          New Experiment
        </button>
      </div>

      <div className="w-full bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Experiment
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Step Counts
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Created At
              </th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {experimentSummaries.map(
              ({ experiment, stepCounts, runningCount, successCount, failedCount }) => (
                <tr
                  key={experiment.uuid}
                  className={experiment.uuid === currentExperiment?.uuid ? "bg-blue-50" : "hover:bg-gray-50"}
                >
                  <td className="px-6 py-4">
                    <button
                      type="button"
                      onClick={() => onNavigate("experiment-detail", experiment.uuid)}
                      className="text-left text-sm font-semibold text-gray-900 hover:text-blue-600 hover:underline"
                    >
                      {experiment.name}
                    </button>
                    {experiment.description && (
                      <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                        {experiment.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 items-center">
                      <div className="flex flex-wrap justify-center gap-1">
                        {stepCounts.flatMap((entry) =>
                          entry.variant === "split"
                            ? [
                                <span
                                  key="s3-target-success"
                                  className={`rounded px-2 py-1 text-xs font-medium ${
                                    entry.target.successCount > 0
                                      ? "bg-green-600 text-white"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  S3 target: {entry.target.successCount}
                                </span>,
                                <span
                                  key="s3-decoy-success"
                                  className={`rounded px-2 py-1 text-xs font-medium ${
                                    entry.decoy.successCount > 0
                                      ? "bg-green-600 text-white"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  S3 decoy: {entry.decoy.successCount}
                                </span>,
                              ]
                            : [
                                <span
                                  key={`s${entry.step}-success`}
                                  className={`rounded px-2 py-1 text-xs font-medium ${
                                    entry.successCount > 0
                                      ? "bg-green-600 text-white"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  S{entry.step}: {entry.successCount}
                                </span>,
                              ]
                        )}
                      </div>
                      <div className="flex flex-wrap justify-center gap-1">
                        {stepCounts.flatMap((entry) =>
                          entry.variant === "split"
                            ? [
                                <span
                                  key="s3-target-failed"
                                  className={`rounded px-2 py-1 text-xs font-medium ${
                                    entry.target.failedCount > 0
                                      ? "bg-red-500 text-white"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  S3 target: {entry.target.failedCount}
                                </span>,
                                <span
                                  key="s3-decoy-failed"
                                  className={`rounded px-2 py-1 text-xs font-medium ${
                                    entry.decoy.failedCount > 0
                                      ? "bg-red-500 text-white"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  S3 decoy: {entry.decoy.failedCount}
                                </span>,
                              ]
                            : [
                                <span
                                  key={`s${entry.step}-failed`}
                                  className={`rounded px-2 py-1 text-xs font-medium ${
                                    entry.failedCount > 0
                                      ? "bg-red-500 text-white"
                                      : "bg-gray-100 text-gray-400"
                                  }`}
                                >
                                  S{entry.step}: {entry.failedCount}
                                </span>,
                              ]
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-center text-xs text-gray-600">
                    Running {runningCount} / Success {successCount} / Failed {failedCount}
                  </td>
                  <td className="px-6 py-4 text-center text-sm text-gray-500">
                    {new Date(experiment.created_at).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleOpenExperiment(experiment.uuid)}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Experiments;
