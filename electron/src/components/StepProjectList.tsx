import { useState, useEffect } from "react";
import type { Project } from "../types";

interface StepProjectListProps {
  step: number;
  refreshTrigger?: string | null; // refresh trigger (new task created)
  onNavigate?: (page: string, uuid: string) => void; // navigation handler
}

function StepProjectList({ step, refreshTrigger, onNavigate }: StepProjectListProps) {
  const [tasks, setTasks] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadTasks = async () => {
    try {
      const allTasks = await window.db.getProjects();
      const stepTasks = allTasks
        .filter((project) => String(project.step) === String(step))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      setTasks(stepTasks);
    } catch (error) {
      console.error(`Failed to load Step${step} tasks:`, error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTasks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // Refresh when refreshTrigger changes (new task created)
  useEffect(() => {
    if (refreshTrigger) {
      loadTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTrigger]);

  // Polling for running tasks
  useEffect(() => {
    const checkRunningTasks = async () => {
      // Always fetch latest tasks from DB to get current status
      const allTasks = await window.db.getProjects();
      const stepTasks = allTasks
        .filter((project) => String(project.step) === String(step))
        .sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
      
      const runningTasks = stepTasks.filter((p) => p.status === "running");

      if (runningTasks.length === 0) {
        // No running tasks, but refresh the list in case status changed
        setTasks(stepTasks);
        return;
      }

      let hasUpdates = false;

      for (const project of runningTasks) {
        try {
          const stepNumber = project.step;
          if (!stepNumber) {
            continue;
          }

          const stepKey = `step${stepNumber}`;
          const stepData = project.parameters[stepKey] as
            | { containerId?: string }
            | undefined;
          const containerId = stepData?.containerId;

          if (!containerId) {
            continue;
          }

          const result = await window.docker.isContainerRunning(containerId);

          if (result.success && !result.running) {
            // when the container is stopped, check the current project status
            const currentProject = await window.db.getProject(project.uuid);
            // do not update if the project is already failed
            if (currentProject && currentProject.status === "running") {
              // check the exit code of the container to determine the actual success or failure
              const exitCodeResult = await window.docker.getContainerExitCode(containerId);
              console.log(`[StepProjectList] Container ${containerId} exit code:`, exitCodeResult.exitCode);
              console.log(`[StepProjectList] Exit code type: ${typeof exitCodeResult.exitCode}, value: ${exitCodeResult.exitCode}`);
              if (exitCodeResult.success && exitCodeResult.exitCode !== null) {
                // if the exit code is 0, then success, otherwise failure
                const newStatus = exitCodeResult.exitCode === 0 ? "success" : "failed";
                console.log(`[StepProjectList] Exit Code = ${exitCodeResult.exitCode}, Status = ${newStatus}`);
                await window.db.updateProject(project.uuid, { status: newStatus });
                hasUpdates = true;
              } else {
                // Container not found - likely removed by --rm after successful completion
                // If container is not running and we can't get exit code, assume success
                console.log(`[StepProjectList] Cannot get exit code, assuming success (container likely removed by --rm)`);
                console.log(`[StepProjectList] success: ${exitCodeResult.success}, exitCode: ${exitCodeResult.exitCode}`);
                await window.db.updateProject(project.uuid, { status: "success" });
                hasUpdates = true;
              }
            }
          }
        } catch (err) {
          console.error(
            `Error checking container for task ${project.uuid}:`,
            err
          );
        }
      }

      // Reload tasks if there were any updates
      if (hasUpdates) {
        await loadTasks();
      } else {
        // Even if no updates, refresh the list to show any status changes from other sources
        setTasks(stepTasks);
      }
    };

    checkRunningTasks();

    const intervalId = setInterval(checkRunningTasks, 2000);

    return () => {
      clearInterval(intervalId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running":
        return "text-blue-600 bg-blue-50";
      case "success":
        return "text-green-600 bg-green-50";
      case "failed":
        return "text-red-600 bg-red-50";
      case "pending":
        return "text-gray-600 bg-gray-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-8">
        <p className="text-sm text-gray-500">Loading...</p>
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-gray-500">No tasks found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {tasks.map((project) => (
        <div
          key={project.uuid}
          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <div className="flex-1">
            {onNavigate ? (
              <button
                onClick={() => onNavigate("project-detail", project.uuid)}
                className="text-sm font-medium text-gray-900 hover:text-blue-600 hover:underline transition-colors text-left"
              >
                {project.name}
              </button>
            ) : (
              <p className="text-sm font-medium text-gray-900">{project.name}</p>
            )}
          </div>
          <div className="ml-4 flex items-center gap-2">
            {project.status === "running" && (
              <svg
                className="w-4 h-4 text-blue-600 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            )}
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                project.status
              )}`}
            >
              {project.status}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StepProjectList;

