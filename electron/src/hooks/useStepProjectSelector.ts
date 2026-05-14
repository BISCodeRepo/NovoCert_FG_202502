import { useState, useEffect, useRef } from "react";
import { useExperiment } from "../contexts/ExperimentContext";
import type { Project } from "../types";
import { filterTasksByBranch, filterTasksByExperiment, TaskBranch } from "../utils/experimentTasks";

interface UseStepProjectSelectorOptions {
  step: number;
  defaultSourceType?: "step" | "custom";
  extensions?: string[]; // file extensions (for file finding)
  returnDirectory?: boolean; // true returns directory path, false returns file path
  branch?: TaskBranch;
  onFileFound?: (path: string) => void;
  onError?: (error: string) => void;
}

interface UseStepProjectSelectorReturn {
  sourceType: "step" | "custom";
  setSourceType: (type: "step" | "custom") => void;
  tasks: Project[];
  selectedProjectUuid: string;
  setSelectedProjectUuid: (uuid: string) => void;
  foundFilePath: string;
  isLoading: boolean;
  error: string | null;
}

export function useStepProjectSelector({
  step,
  defaultSourceType = "step",
  extensions = [],
  returnDirectory = false,
  branch,
  onFileFound,
  onError,
}: UseStepProjectSelectorOptions): UseStepProjectSelectorReturn {
  const { currentExperiment } = useExperiment();
  const [sourceType, setSourceType] = useState<"step" | "custom">(defaultSourceType);
  const [tasks, setTasks] = useState<Project[]>([]);
  const [selectedProjectUuid, setSelectedProjectUuid] = useState<string>("");
  const [foundFilePath, setFoundFilePath] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Keep callbacks and stable config in refs so they never trigger effect re-runs
  const onFileFoundRef = useRef(onFileFound);
  const onErrorRef = useRef(onError);
  const extensionsRef = useRef(extensions);
  const returnDirectoryRef = useRef(returnDirectory);
  useEffect(() => { onFileFoundRef.current = onFileFound; }, [onFileFound]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  useEffect(() => { extensionsRef.current = extensions; }, [extensions]);
  useEffect(() => { returnDirectoryRef.current = returnDirectory; }, [returnDirectory]);

  // Load tasks for the specified step
  useEffect(() => {
    const loadTasks = async () => {
      if (sourceType !== "step") {
        setTasks([]);
        return;
      }

      setIsLoading(true);
      try {
        const allTasks = await window.db.getProjects();
        const stepTasks = filterTasksByBranch(
          filterTasksByExperiment(allTasks, currentExperiment?.uuid),
          branch
        ).filter((project) => String(project.step) === String(step));
        setTasks(stepTasks);
      } catch (error) {
        console.error(`Failed to load Step${step} tasks:`, error);
        const errorMsg = `Failed to load Step${step} tasks`;
        setError(errorMsg);
        onErrorRef.current?.(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    loadTasks();
  }, [step, sourceType, currentExperiment?.uuid, branch]);

  // Find file in selected project's outputPath
  useEffect(() => {
    const findFile = async () => {
      if (sourceType !== "step" || !selectedProjectUuid) {
        setFoundFilePath("");
        setError(null);
        return;
      }

      const selectedProject = tasks.find(
        (project) => project.uuid === selectedProjectUuid
      );

      if (!selectedProject) {
        setFoundFilePath("");
        setError(null);
        return;
      }

      // Get outputPath from project parameters
      const stepParams = selectedProject.parameters?.[`step${step}`] as {
        outputPath?: string;
      } | undefined;

      if (!stepParams?.outputPath) {
        setFoundFilePath("");
        setError(null);
        return;
      }

      const outputPath = stepParams.outputPath;

      try {
        if (returnDirectoryRef.current) {
          setFoundFilePath(outputPath);
          onFileFoundRef.current?.(outputPath);
        } else if (extensionsRef.current.length > 0) {
          let foundPath: string | null = null;

          for (const ext of extensionsRef.current) {
            const result = await window.fs.findLatestFile(outputPath, ext);
            if (result.success && result.path) {
              foundPath = result.path;
              break;
            }
          }

          if (foundPath) {
            setFoundFilePath(foundPath);
            setError(null);
            onFileFoundRef.current?.(foundPath);
          } else {
            setFoundFilePath("");
            const errorMsg = `Cannot find a file with the extension: ${extensionsRef.current.join(", ")}`;
            setError(errorMsg);
            onErrorRef.current?.(errorMsg);
          }
        } else {
          setFoundFilePath(outputPath);
          setError(null);
          onFileFoundRef.current?.(outputPath);
        }
      } catch (error) {
        console.error("Error finding file:", error);
        setFoundFilePath("");
        const errorMsg = "Error finding file";
        setError(errorMsg);
        onErrorRef.current?.(errorMsg);
      }
    };

    findFile();
  }, [sourceType, selectedProjectUuid, tasks, step]);

  // Reset found file path when source type changes to custom
  useEffect(() => {
    if (sourceType === "custom") {
      setFoundFilePath("");
      setSelectedProjectUuid("");
      setError(null);
    }
  }, [sourceType]);

  return {
    sourceType,
    setSourceType,
    tasks,
    selectedProjectUuid,
    setSelectedProjectUuid,
    foundFilePath,
    isLoading,
    error,
  };
}
