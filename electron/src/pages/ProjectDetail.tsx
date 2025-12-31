
import { useState, useEffect } from "react";
import { Project, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "../types/project";

interface ProjectDetailProps {
  uuid: string;
  onNavigate: (page: string, uuid: string) => void;
}

interface ParameterViewerProps {
  data: Record<string, unknown>;
  level?: number;
}

function ParameterViewer({ data, level = 0 }: ParameterViewerProps) {
  const entries = Object.entries(data);

  const isPath = (value: unknown): boolean => {
    if (typeof value !== "string") return false;
    // 경로처럼 보이는 문자열인지 확인 (/, \, : 포함)
    return /^[/\\]|^[A-Za-z]:[/\\]/.test(value);
  };

  const handlePathClick = async (filePath: string) => {
    try {
      // 파일인지 폴더인지 확인하기 위해 먼저 openPath 시도
      const result = await window.shell.openPath(filePath);
      if (!result.success) {
        // 실패하면 showItemInFolder 시도 (파일인 경우)
        await window.shell.showItemInFolder(filePath);
      }
    } catch (error) {
      console.error("Failed to open path:", error);
    }
  };

  return (
    <div className={level > 0 ? "ml-6 border-l-2 border-blue-200 pl-6" : "p-4"}>
      {entries.map(([key, value], index) => (
        <div
          key={key}
          className={`${
            index < entries.length - 1 ? "border-b border-gray-100 mb-4 pb-4" : ""
          }`}
        >
          {typeof value === "object" && value !== null && !Array.isArray(value) ? (
            <div className="space-y-2">
              <div className="mb-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 capitalize">
                  {key}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <ParameterViewer data={value as Record<string, unknown>} level={level + 1} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="min-w-[180px] flex-shrink-0">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
                  {key}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {isPath(value) ? (
                  <button
                    onClick={() => handlePathClick(String(value))}
                    className="w-full text-left text-xs text-gray-800 break-words font-mono bg-white px-4 py-2.5 rounded-md border border-gray-300 shadow-sm hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors group"
                    title="클릭하여 파일 탐색기에서 열기"
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      <span className="flex-1">{String(value)}</span>
                    </div>
                  </button>
                ) : (
                  <div className="text-xs text-gray-800 break-words font-mono bg-white px-4 py-2.5 rounded-md border border-gray-300 shadow-sm">
                    {typeof value === "string" ? (
                      <span className="text-gray-900">{value}</span>
                    ) : (
                      <span className="text-gray-700">{String(value)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ProjectDetail({ uuid, onNavigate }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        const projectData = await window.db.getProject(uuid);
        if (projectData) {
          setProject(projectData as Project);
        } else {
          setError("Project not found.");
        }
      } catch (err) {
        setError("Error loading data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [uuid]);

  // polling: when project is running, check if container is running every 2 seconds
  useEffect(() => {
    if (!project || project.status !== 'running') {
      return;
    }

    const checkCompletion = async () => {
      try {
        // find containerId by step number
        const stepNumber = project.step;
        if (!stepNumber) {
          return;
        }

        const stepKey = `step${stepNumber}`;
        const stepData = project.parameters[stepKey] as { containerId?: string } | undefined;
        const containerId = stepData?.containerId;

        if (!containerId) {
          return;
        }

        // check if container is running
        const result = await window.docker.isContainerRunning(containerId);
        
        if (result.success && !result.running) {
          // update project status to success if container is stopped
          const updatedProject = await window.db.updateProject(uuid, { status: 'success' });
          if (updatedProject) {
            setProject(updatedProject);
          }
        }
      } catch (err) {
        console.error('Error checking completion:', err);
      }
    };

    // immediately check
    checkCompletion();

    // check every 2 seconds
    const intervalId = setInterval(checkCompletion, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [project, uuid]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-semibold">{error}</p>
        <button
          onClick={() => onNavigate("dashboard", "")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go to Dashboard
        </button>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => onNavigate("dashboard", "")}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Go to Dashboard
        </button>
      </div>

      {/* Project information */}
      <div className="bg-gray-50 rounded-lg shadow-sm mb-8">
        {/* Header */}
        <div className="rounded-t-lg px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        </div>

        {/* Main Info Cards */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">UUID</p>
            <p className="text-xs font-mono text-gray-900 break-all">{project.uuid}</p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">상태</p>
            <span
              className={`px-3 py-1.5 inline-flex items-center rounded-md text-xs font-semibold ${
                PROJECT_STATUS_COLORS[project.status]
              }`}
            >
              {PROJECT_STATUS_LABELS[project.status]}
            </span>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Step</p>
            <p className="text-sm font-semibold text-gray-900">
              {project.step ? `Step ${typeof project.step === 'string' ? project.step : project.step}` : '-'}
            </p>
          </div>
        </div>

        {/* Date Info Cards */}
        <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Created At</p>
            <p className="text-sm font-medium text-gray-900">
              {project.created_at ? new Date(project.created_at).toLocaleString() : '-'}
            </p>
          </div>
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Updated At</p>
            <p className="text-sm font-medium text-gray-900">
              {project.updated_at ? new Date(project.updated_at).toLocaleString() : '-'}
            </p>
          </div>
        </div>

        {/* Parameters Section */}
        <div className="px-6 pb-6">
          <div className="bg-white rounded-lg p-4 border border-gray-200 shadow-sm mb-4">
            <h3 className="text-sm font-semibold text-gray-700">Project Parameters</h3>
          </div>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
            <ParameterViewer data={project.parameters} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProjectDetail;
