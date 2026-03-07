import { useState, useEffect } from "react";

interface ProjectStatusMonitorProps {
  projectUuid: string | null;
  projectName?: string;
  containerId?: string | null;
  stepNumber?: number;
}

function ProjectStatusMonitor({ projectUuid, projectName, containerId, stepNumber }: ProjectStatusMonitorProps) {
  const [projectStatus, setProjectStatus] = useState<string | null>(null);
  const [isStopping, setIsStopping] = useState(false);

  // when the project UUID is changed, initialize and load the status
  useEffect(() => {
    if (!projectUuid) {
      setProjectStatus(null);
      return;
    }

    const loadProjectStatus = async () => {
      try {
        const project = await window.db.getProject(projectUuid);
        if (project) {
          setProjectStatus(project.status);
        }
      } catch (err) {
        console.error('Error loading project status:', err);
      }
    };

    loadProjectStatus();
  }, [projectUuid]);

  // polling: check the container status every 2 seconds when the project is running
  useEffect(() => {
    if (!projectUuid || projectStatus !== 'running') {
      return;
    }

    const checkProjectStatus = async () => {
      try {
        const project = await window.db.getProject(projectUuid);
        if (project) {
          setProjectStatus(project.status);
          
          // running status and check if the container is stopped
          // do not update if the project is already failed
          if (project.status === 'running') {
            const stepNumber = project.step;
            if (stepNumber) {
              const stepKey = `step${stepNumber}`;
              const stepData = project.parameters[stepKey] as { containerId?: string } | undefined;
              const containerId = stepData?.containerId;

              if (containerId) {
                const result = await window.docker.isContainerRunning(containerId);
                if (result.success && !result.running) {
                  // when the container is stopped, check the current project status
                  // do not update if the project is already failed
                  if (project.status === 'running') {
                    // check the exit code of the container to determine the actual success or failure
                    const exitCodeResult = await window.docker.getContainerExitCode(containerId);
                    if (exitCodeResult.success && exitCodeResult.exitCode !== null) {
                      // if the exit code is 0, then success, otherwise failure
                      const newStatus = exitCodeResult.exitCode === 0 ? 'success' : 'failed';
                      const updatedProject = await window.db.updateProject(projectUuid, { status: newStatus });
                      if (updatedProject) {
                        setProjectStatus(updatedProject.status);
                      }
                    }
                  } else if (project.status === 'failed') {
                    // already failed, only update the status
                    setProjectStatus('failed');
                  }
                }
              }
            }
          } else if (project.status === 'failed') {
            // already failed, only update the status
            setProjectStatus('failed');
          }
        }
      } catch (err) {
        console.error('Error checking project status:', err);
      }
    };

    // immediately check once
    checkProjectStatus();

    // check every 2 seconds
    const intervalId = setInterval(checkProjectStatus, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [projectUuid, projectStatus]);

  // Handle container stop and cleanup
  const handleStopContainer = async () => {
    if (!containerId || !projectUuid) {
      return;
    }

    if (!confirm(`Are you sure you want to stop and clean up the container for project "${projectName}"? This action cannot be undone.`)) {
      return;
    }

    setIsStopping(true);
    try {
      // Stop and cleanup container
      const result = await window.docker.stopAndCleanupContainer(containerId);
      
      if (result.success) {
        // Update project status to failed
        await window.db.updateProject(projectUuid, { status: 'failed' });
        setProjectStatus('failed');
      } else {
        alert(`Failed to stop container: ${result.error}`);
      }
    } catch (error) {
      console.error('Error stopping container:', error);
      alert(`Error stopping container: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsStopping(false);
    }
  };

  // do not show if the project UUID is not set or the status is not set
  if (!projectUuid || !projectStatus) {
    return null;
  }

  const showCreatedMessage = containerId && projectName && stepNumber;

  return (
    <div className="mt-6 p-5 bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="space-y-4">
        {/* Project Created Message Section */}
        {showCreatedMessage && (
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                projectStatus === 'running' 
                  ? 'bg-green-100' 
                  : projectStatus === 'success' 
                  ? 'bg-green-100' 
                  : projectStatus === 'failed'
                  ? 'bg-red-100'
                  : 'bg-gray-100'
              }`}>
                {projectStatus === 'running' ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-green-600 border-t-transparent"></div>
                ) : projectStatus === 'success' ? (
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : projectStatus === 'failed' ? (
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                ) : null}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 mb-1">
                {projectStatus === 'running' 
                  ? 'Project Created Successfully' 
                  : projectStatus === 'success'
                  ? 'Project Completed Successfully'
                  : projectStatus === 'failed'
                  ? 'Project Failed'
                  : 'Project Status'}
              </p>
              <p className="text-sm text-gray-600 mb-2">
                {projectStatus === 'running' ? (
                  <>
                    Project <span className="font-medium text-gray-800">"{projectName}"</span> has been created and Step {stepNumber} is running.
                  </>
                ) : projectStatus === 'success' ? (
                  <>
                    Project <span className="font-medium text-gray-800">"{projectName}"</span> has been completed successfully.
                  </>
                ) : projectStatus === 'failed' ? (
                  <>
                    Project <span className="font-medium text-gray-800">"{projectName}"</span> has been stopped or failed.
                  </>
                ) : (
                  <>
                    Project <span className="font-medium text-gray-800">"{projectName}"</span> status: {projectStatus}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
                <span className="font-medium">Container ID:</span>
                <span className="font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
                  {containerId.substring(0, 12)}...
                </span>
              </div>
              {projectStatus === 'running' && (
                <button
                  onClick={handleStopContainer}
                  disabled={isStopping}
                  className="mt-2 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isStopping ? (
                    <>
                      <svg
                        className="w-4 h-4 animate-spin"
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
                      Stopping...
                    </>
                  ) : (
                    <>
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                      Stop & Cleanup Container
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectStatusMonitor;

