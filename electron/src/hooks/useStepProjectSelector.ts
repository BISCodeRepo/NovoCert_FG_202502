import { useState, useEffect } from "react";
import type { Project } from "../types";

interface UseStepProjectSelectorOptions {
  step: number;
  defaultSourceType?: "step" | "custom";
  extensions?: string[]; // file extensions (for file finding)
  returnDirectory?: boolean; // true returns directory path, false returns file path
  onFileFound?: (path: string) => void;
  onError?: (error: string) => void;
}

interface UseStepProjectSelectorReturn {
  sourceType: "step" | "custom";
  setSourceType: (type: "step" | "custom") => void;
  projects: Project[];
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
  onFileFound,
  onError,
}: UseStepProjectSelectorOptions): UseStepProjectSelectorReturn {
  const [sourceType, setSourceType] = useState<"step" | "custom">(defaultSourceType);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectUuid, setSelectedProjectUuid] = useState<string>("");
  const [foundFilePath, setFoundFilePath] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load projects for the specified step
  useEffect(() => {
    const loadProjects = async () => {
      if (sourceType !== "step") {
        setProjects([]);
        return;
      }

      setIsLoading(true);
      try {
        const allProjects = await window.db.getProjects();
        const stepProjects = allProjects.filter(
          (project) => String(project.step) === String(step)
        );
        setProjects(stepProjects);
      } catch (error) {
        console.error(`Failed to load Step${step} projects:`, error);
        const errorMsg = `Failed to load Step${step} projects`;
        setError(errorMsg);
        onError?.(errorMsg);
      } finally {
        setIsLoading(false);
      }
    };

    loadProjects();
  }, [step, sourceType, onError]);

  // Find file in selected project's outputPath
  useEffect(() => {
    const findFile = async () => {
      if (sourceType !== "step" || !selectedProjectUuid) {
        setFoundFilePath("");
        setError(null);
        return;
      }

      const selectedProject = projects.find(
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
        if (returnDirectory) {
          // Return directory path directly
          setFoundFilePath(outputPath);
          onFileFound?.(outputPath);
        } else if (extensions.length > 0) {
          // Try to find files with each extension
          let foundPath: string | null = null;

          for (const ext of extensions) {
            const result = await window.fs.findLatestFile(outputPath, ext);
            if (result.success && result.path) {
              foundPath = result.path;
              break; // Use the first found file
            }
          }

          if (foundPath) {
            setFoundFilePath(foundPath);
            setError(null);
            onFileFound?.(foundPath);
          } else {
            setFoundFilePath("");
            const errorMsg = `Cannot find a file with the extension: ${extensions.join(", ")}`;
            setError(errorMsg);
            onError?.(errorMsg);
          }
        } else {
          // No extensions and not directory - just return outputPath
          setFoundFilePath(outputPath);
          setError(null);
          onFileFound?.(outputPath);
        }
      } catch (error) {
        console.error("Error finding file:", error);
        setFoundFilePath("");
        const errorMsg = "Error finding file";
        setError(errorMsg);
        onError?.(errorMsg);
      }
    };

    findFile();
  }, [sourceType, selectedProjectUuid, projects, step, extensions, returnDirectory, onFileFound, onError]);

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
    projects,
    selectedProjectUuid,
    setSelectedProjectUuid,
    foundFilePath,
    isLoading,
    error,
  };
}

