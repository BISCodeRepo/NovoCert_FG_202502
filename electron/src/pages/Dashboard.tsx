import { useState, useEffect, useMemo } from "react";
import {
  Project,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
} from "../types";

interface DashboardProps {
  onNavigate: (page: string, uuid: string) => void;
}

function Dashboard({ onNavigate }: DashboardProps) {
  const [allProjects, setAllProjects] = useState<Project[]>([]);
  const [dbPath, setDbPath] = useState("");
  const [selectedStep, setSelectedStep] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");

  useEffect(() => {
    loadProjects();
    loadDbPath();
  }, []);

  // 필터링된 프로젝트 목록
  const filteredProjects = useMemo(() => {
    let filtered = allProjects;

    // Step 필터링 (step은 int로 저장되어 있음)
    if (selectedStep !== "all") {
      const stepNumber = parseInt(selectedStep.replace("step", ""));
      filtered = filtered.filter((p) => {
        if (p.step === null || p.step === undefined) {
          return false;
        }
        // step이 문자열이든 숫자든 모두 처리
        const projectStep = typeof p.step === "string" ? parseInt(p.step) : p.step;
        return projectStep === stepNumber;
      });
    }

    // Status 필터링
    if (selectedStatus !== "all") {
      filtered = filtered.filter((p) => p.status === selectedStatus);
    }

    return filtered;
  }, [allProjects, selectedStep, selectedStatus]);

  // polling: running status projects' container status check
  useEffect(() => {
    const checkRunningProjects = async () => {
      // filter running status projects
      const runningProjects = allProjects.filter(p => p.status === 'running');
      
      if (runningProjects.length === 0) {
        return;
      }

      // check container status for each running project
      for (const project of runningProjects) {
        try {
          const stepNumber = project.step;
          if (!stepNumber) {
            continue;
          }

          const stepKey = `step${stepNumber}`;
          const stepData = project.parameters[stepKey] as { containerId?: string } | undefined;
          const containerId = stepData?.containerId;

          if (!containerId) {
            continue;
          }

          // check if container is running
          const result = await window.docker.isContainerRunning(containerId);
          
          if (result.success && !result.running) {
            // update project status to success if container is stopped
            await window.db.updateProject(project.uuid, { status: 'success' });
            // refresh project list
            loadProjects();
          }
        } catch (err) {
          console.error(`Error checking container for project ${project.uuid}:`, err);
        }
      }
    };

    // immediately check
    checkRunningProjects();

    // check every 2 seconds
    const intervalId = setInterval(checkRunningProjects, 2000);

    return () => {
      clearInterval(intervalId);
    };
  }, [allProjects]);

  const loadProjects = async () => {
    const data = (await window.db.getProjects()) as Project[];
    // created_at을 기준으로 내림차순 정렬
    data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setAllProjects(data);
  };

  const loadDbPath = async () => {
    const path = await window.db.getDbPath();
    setDbPath(path);
  };

  const deleteProject = async (uuid: string) => {
    await window.db.deleteProject(uuid);
    loadProjects();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Projects</h1>

      {/* DB 경로 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Database Path:</span> {dbPath}
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Project List{" "}
              <span className="text-gray-500">({filteredProjects.length})</span>
            </h2>
            <div className="flex gap-4">
              {/* Step 필터 */}
              <div className="flex items-center gap-2">
                <label htmlFor="step-filter" className="text-sm font-medium text-gray-700">
                  Step:
                </label>
                <select
                  id="step-filter"
                  value={selectedStep}
                  onChange={(e) => setSelectedStep(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All</option>
                  <option value="step1">Step 1</option>
                  <option value="step2">Step 2</option>
                  <option value="step3">Step 3</option>
                  <option value="step4">Step 4</option>
                  <option value="step5">Step 5</option>
                </select>
              </div>
              {/* Status 필터 */}
              <div className="flex items-center gap-2">
                <label htmlFor="status-filter" className="text-sm font-medium text-gray-700">
                  Status:
                </label>
                <select
                  id="status-filter"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">All</option>
                  <option value="pending">Pending</option>
                  <option value="running">Running</option>
                  <option value="failed">Failed</option>
                  <option value="success">Success</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
            <p className="mt-4 text-gray-500">No projects found</p>
            <p className="text-sm text-gray-400">
              Start by creating a new project
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    UUID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Project Name
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Step
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created At
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Updated At
                  </th>
                  <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProjects.map((project) => (
                  <tr key={project.uuid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                      <button
                        onClick={() => onNavigate("project-detail", project.uuid)}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                        title={project.uuid}
                      >
                        {project.uuid.split("-")[0]}...
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {project.name}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span
                        className={`px-3 py-1 inline-block rounded-full text-xs font-semibold ${
                          PROJECT_STATUS_COLORS[project.status]
                        }`}
                      >
                        {PROJECT_STATUS_LABELS[project.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {project.step !== null && project.step !== undefined 
                        ? `Step ${typeof project.step === 'string' ? project.step : project.step}` 
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {project.created_at ? new Date(project.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-center">
                      {project.updated_at ? new Date(project.updated_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center text-sm">
                      <button
                        onClick={() => deleteProject(project.uuid)}
                        className="text-red-600 hover:text-red-900 font-medium"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dashboard;

