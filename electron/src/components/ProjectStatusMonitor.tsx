import { useState, useEffect } from "react";

interface ProjectStatusMonitorProps {
  projectUuid: string | null;
  projectName?: string;
  containerId?: string | null;
  stepNumber?: number;
}

function ProjectStatusMonitor({ projectUuid, projectName, containerId, stepNumber }: ProjectStatusMonitorProps) {
  const [projectStatus, setProjectStatus] = useState<string | null>(null);

  // 프로젝트 UUID가 변경되면 상태 초기화 및 로드
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

  // 폴링: 프로젝트가 running 상태일 때 2초마다 컨테이너 상태 확인
  useEffect(() => {
    if (!projectUuid || projectStatus !== 'running') {
      return;
    }

    const checkProjectStatus = async () => {
      try {
        const project = await window.db.getProject(projectUuid);
        if (project) {
          setProjectStatus(project.status);
          
          // running 상태이고 컨테이너가 종료되었는지 확인
          if (project.status === 'running') {
            const stepNumber = project.step;
            if (stepNumber) {
              const stepKey = `step${stepNumber}`;
              const stepData = project.parameters[stepKey] as { containerId?: string } | undefined;
              const containerId = stepData?.containerId;

              if (containerId) {
                const result = await window.docker.isContainerRunning(containerId);
                if (result.success && !result.running) {
                  // 컨테이너가 종료되었으면 프로젝트 상태 업데이트
                  const updatedProject = await window.db.updateProject(projectUuid, { status: 'success' });
                  if (updatedProject) {
                    setProjectStatus(updatedProject.status);
                  }
                }
              }
            }
          }
        }
      } catch (err) {
        console.error('Error checking project status:', err);
      }
    };

    // 즉시 한 번 체크
    checkProjectStatus();

    // 2초마다 체크
    const intervalId = setInterval(checkProjectStatus, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [projectUuid, projectStatus]);

  // 프로젝트 UUID가 없거나 상태가 없으면 표시하지 않음
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
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
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
                ) : null}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-800 mb-1">
                {projectStatus === 'running' 
                  ? 'Project Created Successfully' 
                  : projectStatus === 'success'
                  ? 'Project Completed Successfully'
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
                ) : (
                  <>
                    Project <span className="font-medium text-gray-800">"{projectName}"</span> status: {projectStatus}
                  </>
                )}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-medium">Container ID:</span>
                <span className="font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200">
                  {containerId.substring(0, 12)}...
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProjectStatusMonitor;

