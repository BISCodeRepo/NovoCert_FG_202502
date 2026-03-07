import { useState, useEffect } from "react";

/**
 * Hook to check if a project is currently running (polling status).
 * This is used to disable the "Run Step" button when a project is already running.
 * 
 * @param projectUuid - The UUID of the project to check
 * @returns boolean indicating if the project is currently running
 */
export function useStepRunningStatus(projectUuid: string | null): boolean {
  const [hasRunningProject, setHasRunningProject] = useState(false);

  useEffect(() => {
    const checkRunningProject = async () => {
      if (!projectUuid) {
        setHasRunningProject(false);
        return;
      }

      try {
        const project = await window.db.getProject(projectUuid);
        if (project && project.status === 'running') {
          setHasRunningProject(true);
        } else {
          setHasRunningProject(false);
        }
      } catch (error) {
        console.error('Error checking running project:', error);
        setHasRunningProject(false);
      }
    };

    checkRunningProject();
    // Check every 2 seconds to match polling interval
    const intervalId = setInterval(checkRunningProject, 2000);
    return () => clearInterval(intervalId);
  }, [projectUuid]);

  return hasRunningProject;
}
