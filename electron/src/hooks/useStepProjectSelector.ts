import { useState, useEffect } from "react";
import type { Project } from "../types";

interface UseStepProjectSelectorOptions {
  step: number;
  defaultSourceType?: "step" | "custom";
  extensions?: string[]; // 파일 확장자 (파일 찾기용)
  returnDirectory?: boolean; // true면 디렉토리 경로 반환, false면 파일 경로 반환
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
        console.error(`Step${step} 프로젝트 조회 실패:`, error);
        onError?.(`Step${step} 프로젝트 조회 실패`);
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
        return;
      }

      const selectedProject = projects.find(
        (project) => project.uuid === selectedProjectUuid
      );

      if (!selectedProject) {
        setFoundFilePath("");
        return;
      }

      // Get outputPath from project parameters
      const stepParams = selectedProject.parameters?.[`step${step}`] as {
        outputPath?: string;
      } | undefined;

      if (!stepParams?.outputPath) {
        setFoundFilePath("");
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
            onFileFound?.(foundPath);
          } else {
            setFoundFilePath("");
            onError?.(
              `파일을 찾을 수 없습니다. (확장자: ${extensions.join(", ")})`
            );
          }
        } else {
          // No extensions and not directory - just return outputPath
          setFoundFilePath(outputPath);
          onFileFound?.(outputPath);
        }
      } catch (error) {
        console.error("경로 검색 실패:", error);
        setFoundFilePath("");
        onError?.("경로 검색 중 오류가 발생했습니다");
      }
    };

    findFile();
  }, [sourceType, selectedProjectUuid, projects, step, extensions, returnDirectory, onFileFound, onError]);

  // Reset found file path when source type changes to custom
  useEffect(() => {
    if (sourceType === "custom") {
      setFoundFilePath("");
      setSelectedProjectUuid("");
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
  };
}

