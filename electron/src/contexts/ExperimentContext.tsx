import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from "react";
import type { Experiment } from "../types";

interface ExperimentContextValue {
  experiments: Experiment[];
  currentExperiment: Experiment | null;
  isLoading: boolean;
  createExperiment: (name?: string, description?: string) => Promise<Experiment>;
  updateCurrentExperiment: (updates: { name?: string; description?: string }) => Promise<Experiment | null>;
  selectExperiment: (uuid: string) => void;
  refreshExperiments: () => Promise<void>;
}

const ExperimentContext = createContext<ExperimentContextValue | null>(null);

interface ExperimentProviderProps {
  children: ReactNode;
}

const CURRENT_EXPERIMENT_KEY = "current_experiment_uuid";

export function ExperimentProvider({ children }: ExperimentProviderProps) {
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [currentExperimentUuid, setCurrentExperimentUuid] = useState<string | null>(
    localStorage.getItem(CURRENT_EXPERIMENT_KEY)
  );
  const [isLoading, setIsLoading] = useState(true);

  const currentExperiment = useMemo(
    () => experiments.find((experiment) => experiment.uuid === currentExperimentUuid) || null,
    [experiments, currentExperimentUuid]
  );

  const refreshExperiments = async () => {
    const data = await window.db.getExperiments();
    data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setExperiments(data);
  };

  const createExperiment = async (name?: string, description?: string) => {
    const nextName = name?.trim() || `Experiment ${experiments.length + 1}`;
    const exists = experiments.some(
      (experiment) => experiment.name.trim().toLowerCase() === nextName.toLowerCase()
    );

    if (exists) {
      throw new Error(`Experiment name already exists: ${nextName}`);
    }

    const experiment = await window.db.addExperiment({
      name: nextName,
      description: description?.trim(),
    });
    setExperiments((prev) => [experiment, ...prev]);
    setCurrentExperimentUuid(experiment.uuid);
    localStorage.setItem(CURRENT_EXPERIMENT_KEY, experiment.uuid);
    return experiment;
  };

  const updateCurrentExperiment = async (updates: { name?: string; description?: string }) => {
    if (!currentExperimentUuid) {
      return null;
    }

    if (updates.name !== undefined) {
      const nextName = updates.name.trim();
      const exists = experiments.some(
        (experiment) =>
          experiment.uuid !== currentExperimentUuid &&
          experiment.name.trim().toLowerCase() === nextName.toLowerCase()
      );

      if (exists) {
        throw new Error(`Experiment name already exists: ${nextName}`);
      }

      updates.name = nextName;
    }

    const updated = await window.db.updateExperiment(currentExperimentUuid, updates);
    if (updated) {
      setExperiments((prev) =>
        prev
          .map((experiment) => (experiment.uuid === updated.uuid ? updated : experiment))
          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
    }
    return updated;
  };

  const selectExperiment = (uuid: string) => {
    setCurrentExperimentUuid(uuid);
    localStorage.setItem(CURRENT_EXPERIMENT_KEY, uuid);
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        const data = await window.db.getExperiments();
        data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        if (data.length === 0) {
          const first = await window.db.addExperiment({ name: "Experiment 1" });
          setExperiments([first]);
          setCurrentExperimentUuid(first.uuid);
          localStorage.setItem(CURRENT_EXPERIMENT_KEY, first.uuid);
          return;
        }

        setExperiments(data);
        setCurrentExperimentUuid(data[0].uuid);
        localStorage.setItem(CURRENT_EXPERIMENT_KEY, data[0].uuid);
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  return (
    <ExperimentContext.Provider
      value={{
        experiments,
        currentExperiment,
        isLoading,
        createExperiment,
        updateCurrentExperiment,
        selectExperiment,
        refreshExperiments,
      }}
    >
      {children}
    </ExperimentContext.Provider>
  );
}

export function useExperiment() {
  const context = useContext(ExperimentContext);
  if (!context) {
    throw new Error("useExperiment must be used within ExperimentProvider");
  }
  return context;
}
