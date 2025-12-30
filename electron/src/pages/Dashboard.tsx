import { useState, useEffect } from "react";
import {
  Project,
  PROJECT_STATUS_LABELS,
  PROJECT_STATUS_COLORS,
} from "../types";

interface DashboardProps {
  onNavigate: (page: string, uuid: string) => void;
}

function Dashboard({ onNavigate }: DashboardProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [dbPath, setDbPath] = useState("");

  useEffect(() => {
    loadProjects();
    loadDbPath();
  }, []);

  // polling: running status projects' container status check
  useEffect(() => {
    const checkRunningProjects = async () => {
      // filter running status projects
      const runningProjects = projects.filter(p => p.status === 'running');
      
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
  }, [projects]);

  const loadProjects = async () => {
    const data = (await window.db.getProjects()) as Project[];
    // created_at을 기준으로 내림차순 정렬
    data.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setProjects(data);
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
          <h2 className="text-xl font-semibold text-gray-900">
            Project List{" "}
            <span className="text-gray-500">({projects.length})</span>
          </h2>
        </div>

        {projects.length === 0 ? (
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
                {projects.map((project) => (
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

