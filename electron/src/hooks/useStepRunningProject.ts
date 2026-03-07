import { useEffect } from "react";

interface UseStepRunningProjectOptions {
  step: number;
  setProjectUuid: (uuid: string | null) => void;
  setContainerId: (containerId: string | null) => void;
  setProjectName: (name: string) => void;
}

/**
 * Hook to automatically detect and track running projects for a specific step.
 * Checks for running projects when the component mounts and sets the state accordingly.
 */
export function useStepRunningProject({
  step,
  setProjectUuid,
  setContainerId,
  setProjectName,
}: UseStepRunningProjectOptions) {
  useEffect(() => {
    const checkRunningProject = async () => {
      try {
        const allProjects = await window.db.getProjects();
        const stepRunningProjects = allProjects
          .filter(
            (project) =>
              String(project.step) === String(step) &&
              project.status === "running"
          )
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime()
          );

        if (stepRunningProjects.length > 0) {
          const runningProject = stepRunningProjects[0];
          const stepKey = `step${step}`;
          const stepData = runningProject.parameters[stepKey] as
            | { containerId?: string }
            | undefined;
          const foundContainerId = stepData?.containerId;

          if (foundContainerId) {
            setProjectUuid(runningProject.uuid);
            setContainerId(foundContainerId);
            setProjectName(runningProject.name);
          }
        }
      } catch (error) {
        console.error(`Error checking running projects for step ${step}:`, error);
      }
    };

    checkRunningProject();
  }, [step, setProjectUuid, setContainerId, setProjectName]);
}
