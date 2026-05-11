import { useEffect, useMemo, useState } from "react";
import { useExperiment } from "../contexts/ExperimentContext";
import type { Project } from "../types";

interface ExperimentsProps {
  onNavigate: (page: string, uuid: string) => void;
}

function Experiments({ onNavigate }: ExperimentsProps) {
  const { experiments, currentExperiment, selectExperiment, createExperiment } = useExperiment();
  const [tasks, setTasks] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);

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
      const stepCounts = [1, 2, 3, 4, 5, 6].map((step) => {
        const stepTasks = experimentTasks.filter((task) => String(task.step) === String(step));
        return {
          step,
          count: stepTasks.length,
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

  const handleOpenExperiment = (uuid: string) => {
    selectExperiment(uuid);
    onNavigate("experiment", "");
  };

  const handleCreateExperiment = async () => {
    const name = window.prompt("New experiment name", `Experiment ${experiments.length + 1}`);
    if (name === null) {
      return;
    }

    setError(null);
    try {
      await createExperiment(name);
      onNavigate("experiment", "");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Failed to create experiment.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
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

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
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
              ({ experiment, stepCounts, totalCount, runningCount, successCount, failedCount }) => (
                <tr
                  key={experiment.uuid}
                  className={experiment.uuid === currentExperiment?.uuid ? "bg-blue-50" : "hover:bg-gray-50"}
                >
                  <td className="px-6 py-4">
                    <div className="text-sm font-semibold text-gray-900">{experiment.name}</div>
                    {experiment.description && (
                      <div className="mt-1 text-xs text-gray-500 line-clamp-2">
                        {experiment.description}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1 items-center">
                      <div className="flex gap-1">
                        {stepCounts.map(({ step, successCount }) => (
                          <span
                            key={step}
                            className={`rounded px-2 py-1 text-xs font-medium ${
                              successCount > 0
                                ? "bg-green-600 text-white"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            S{step}: {successCount}
                          </span>
                        ))}
                      </div>
                      <div className="flex gap-1">
                        {stepCounts.map(({ step, failedCount }) => (
                          <span
                            key={step}
                            className={`rounded px-2 py-1 text-xs font-medium ${
                              failedCount > 0
                                ? "bg-red-500 text-white"
                                : "bg-gray-100 text-gray-400"
                            }`}
                          >
                            S{step}: {failedCount}
                          </span>
                        ))}
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
