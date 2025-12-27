import { useState, useEffect } from "react";
import {
  Project,
  ProjectStatus,
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
    // 연관된 태스크도 함께 삭제
    await window.db.deleteTasksByProject(uuid);
    await window.db.deleteProject(uuid);
    loadProjects();
  };

  const updateProjectStatus = async (uuid: string, status: ProjectStatus) => {
    await window.db.updateProject(uuid, { status });
    loadProjects();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">프로젝트 관리</h1>
      <p className="text-sm text-gray-500 mb-8">
        Electron + LowDB + Tailwind CSS
      </p>

      {/* DB 경로 */}
      <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">DB 경로:</span> {dbPath}
        </p>
      </div>

      {/* 프로젝트 목록 */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            프로젝트 목록{" "}
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
            <p className="mt-4 text-gray-500">프로젝트가 없습니다</p>
            <p className="text-sm text-gray-400">
              위에서 새 프로젝트를 추가해보세요
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
                    프로젝트 이름
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    생성일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    수정일
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작업
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
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={project.status}
                        onChange={(e) =>
                          updateProjectStatus(
                            project.uuid,
                            e.target.value as ProjectStatus
                          )
                        }
                        className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          PROJECT_STATUS_COLORS[project.status]
                        } border-0 cursor-pointer`}
                      >
                        <option value="pending">
                          {PROJECT_STATUS_LABELS.pending}
                        </option>
                        <option value="running">
                          {PROJECT_STATUS_LABELS.running}
                        </option>
                        <option value="failed">
                          {PROJECT_STATUS_LABELS.failed}
                        </option>
                        <option value="success">
                          {PROJECT_STATUS_LABELS.success}
                        </option>
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.created_at ? new Date(project.created_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {project.updated_at ? new Date(project.updated_at).toLocaleString() : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <button
                        onClick={() => deleteProject(project.uuid)}
                        className="text-red-600 hover:text-red-900 font-medium"
                      >
                        삭제
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

