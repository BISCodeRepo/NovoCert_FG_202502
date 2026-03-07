import { useEffect } from "react";

interface UseStepRunningProjectOptions {
  step: number;
  setProjectUuid: (uuid: string | null) => void;
  setContainerId: (containerId: string | null) => void;
  setProjectName: (name: string) => void;
}

/**
 * Hook to automatically detect and track running projects for a specific step.
 * Checks for running projects when the component mounts and verifies actual container status.
 * If container is not running, updates project status based on exit code.
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
            // Verify actual container status
            const containerStatus = await window.docker.isContainerRunning(foundContainerId);
            console.log(`[useStepRunningProject] Container ${foundContainerId} status:`, containerStatus);
            
            if (containerStatus.success && containerStatus.running) {
              // Container is actually running
              console.log(`[useStepRunningProject] Container is running, setting project state`);
              setProjectUuid(runningProject.uuid);
              setContainerId(foundContainerId);
              setProjectName(runningProject.name);
            } else {
              // Container is not running, check current project status and update if needed
              console.log(`[useStepRunningProject] Container is not running, checking project status`);
              const currentProject = await window.db.getProject(runningProject.uuid);
              
              // Only update if project is still in running status
              if (currentProject && currentProject.status === 'running') {
                console.log(`[useStepRunningProject] Project is still running, checking exit code`);
                // Check exit code and update project status
                const exitCodeResult = await window.docker.getContainerExitCode(foundContainerId);
                console.log(`[useStepRunningProject] Exit code result:`, exitCodeResult);
                console.log(`[useStepRunningProject] Container ID: ${foundContainerId}`);
                console.log(`[useStepRunningProject] Exit Code: ${exitCodeResult.exitCode}`);
                console.log(`[useStepRunningProject] Exit Code Type: ${typeof exitCodeResult.exitCode}`);
                
                if (exitCodeResult.success && exitCodeResult.exitCode !== null) {
                  // Update project status based on exit code
                  const newStatus = exitCodeResult.exitCode === 0 ? 'success' : 'failed';
                  console.log(`[useStepRunningProject] Exit Code = ${exitCodeResult.exitCode}, Status = ${newStatus}`);
                  console.log(`[useStepRunningProject] Updating project status to: ${newStatus}`);
                  await window.db.updateProject(runningProject.uuid, { status: newStatus });
                } else {
                  // Container not found - likely removed by --rm after successful completion
                  // If container is not running and we can't get exit code, assume success
                  // (containers that fail usually remain for inspection)
                  console.log(`[useStepRunningProject] Container not found (likely removed by --rm), assuming success`);
                  console.log(`[useStepRunningProject] exitCodeResult.success: ${exitCodeResult.success}, exitCode: ${exitCodeResult.exitCode}`);
                  await window.db.updateProject(runningProject.uuid, { status: 'success' });
                }
              } else {
                console.log(`[useStepRunningProject] Project status is already ${currentProject?.status}, skipping update`);
              }
              
              // Don't set state for this project since it's no longer running
            }
          } else {
            // No containerId found, but project is marked as running - mark as failed
            console.log(`[useStepRunningProject] No containerId found for running project, marking as failed`);
            const currentProject = await window.db.getProject(runningProject.uuid);
            if (currentProject && currentProject.status === 'running') {
              await window.db.updateProject(runningProject.uuid, { status: 'failed' });
            }
          }
        }
      } catch (error) {
        console.error(`Error checking running projects for step ${step}:`, error);
      }
    };

    // Check immediately on mount
    checkRunningProject();
    
    // Poll every 2 seconds to continuously verify container status
    const intervalId = setInterval(checkRunningProject, 2000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [step, setProjectUuid, setContainerId, setProjectName]);
}
