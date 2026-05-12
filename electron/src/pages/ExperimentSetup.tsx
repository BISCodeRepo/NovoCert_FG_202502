import { useEffect, useMemo, useState } from "react";
import { useExperiment } from "../contexts/ExperimentContext";

interface ExperimentSetupProps {
  onNavigate: (page: string, uuid: string) => void;
}

type StartMode = "new" | "existing";

function ExperimentSetup({ onNavigate }: ExperimentSetupProps) {
  const { experiments, currentExperiment, isLoading, createExperiment, selectExperiment } = useExperiment();
  const [mode, setMode] = useState<StartMode>("new");
  const [selectedExperimentUuid, setSelectedExperimentUuid] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setSelectedExperimentUuid(currentExperiment?.uuid || experiments[0]?.uuid || "");
  }, [currentExperiment, experiments]);

  const selectedExperiment = useMemo(
    () => experiments.find((experiment) => experiment.uuid === selectedExperimentUuid) || null,
    [experiments, selectedExperimentUuid]
  );

  const handleStart = async () => {
    setMessage(null);

    if (mode === "existing") {
      if (!selectedExperimentUuid) {
        setMessage("Select an experiment to continue.");
        return;
      }

      selectExperiment(selectedExperimentUuid);
      onNavigate("step1", "");
      return;
    }

    const nextTitle = title.trim();
    if (!nextTitle) {
      setMessage("Experiment title is required.");
      return;
    }

    try {
      await createExperiment(nextTitle, description);
      onNavigate("step1", "");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to create experiment.");
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <p className="text-sm text-gray-500">Loading experiments...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-900 mb-3">Experiment</h1>
        <p className="text-sm text-gray-500">
          Start with a new experiment or continue an existing one. Every task in the steps will be tied to the selected experiment.
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setMode("new")}
            className={`rounded-lg border px-4 py-4 text-left transition-colors ${
              mode === "new"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">New Experiment</p>
            <p className="mt-1 text-xs text-gray-500">
              Create a new experiment and run Step 1 from a clean pipeline context.
            </p>
          </button>
          <button
            type="button"
            onClick={() => setMode("existing")}
            className={`rounded-lg border px-4 py-4 text-left transition-colors ${
              mode === "existing"
                ? "border-blue-500 bg-blue-50"
                : "border-gray-200 hover:bg-gray-50"
            }`}
          >
            <p className="text-sm font-semibold text-gray-900">Existing Experiment</p>
            <p className="mt-1 text-xs text-gray-500">
              Select an existing experiment and continue running tasks in that experiment.
            </p>
          </button>
        </div>

        {mode === "new" ? (
          <div className="space-y-5">
            <div>
              <label htmlFor="experiment-title" className="block text-sm font-medium text-gray-700 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                id="experiment-title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                placeholder="Enter experiment title"
              />
            </div>

            <div>
              <label htmlFor="experiment-description" className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                id="experiment-description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={6}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none resize-y"
                placeholder="Describe the goal, dataset, or notes for this experiment"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label htmlFor="experiment-select" className="block text-sm font-medium text-gray-700 mb-2">
                Experiment <span className="text-red-500">*</span>
              </label>
              <select
                id="experiment-select"
                value={selectedExperimentUuid}
                onChange={(event) => setSelectedExperimentUuid(event.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
              >
                {experiments.map((experiment) => (
                  <option key={experiment.uuid} value={experiment.uuid}>
                    {experiment.name}
                  </option>
                ))}
              </select>
            </div>

            {selectedExperiment && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                <p className="text-sm font-semibold text-gray-900">{selectedExperiment.name}</p>
                <p className="mt-1 text-xs text-gray-500">
                  Created at {new Date(selectedExperiment.created_at).toLocaleString()}
                </p>
                {selectedExperiment.description && (
                  <p className="mt-3 text-sm text-gray-600">{selectedExperiment.description}</p>
                )}
              </div>
            )}
          </div>
        )}

        {message && <p className="text-sm text-red-600">{message}</p>}

        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleStart}
            className="px-5 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
          >
            Start Step 1
          </button>
        </div>
      </div>
    </div>
  );
}

export default ExperimentSetup;
