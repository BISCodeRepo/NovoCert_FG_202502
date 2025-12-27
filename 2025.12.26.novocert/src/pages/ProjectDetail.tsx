
import { useState, useEffect } from "react";
import { Project, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "../types/project";
import { Task, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from "../types/task";

interface ProjectDetailProps {
  uuid: string;
  onNavigate: (page: string, uuid: string) => void;
}

function ProjectDetail({ uuid, onNavigate }: ProjectDetailProps) {
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProjectDetails = async () => {
      try {
        setLoading(true);
        const projectData = await window.db.getProject(uuid);
        if (projectData) {
          setProject(projectData as Project);
          const taskData = await window.db.getTasksByProject(uuid);
          setTasks(taskData as Task[]);
        } else {
          setError("프로젝트를 찾을 수 없습니다.");
        }
      } catch (err) {
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjectDetails();
  }, [uuid]);

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
          대시보드로 돌아가기
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
          &larr; 대시보드로 돌아가기
        </button>
      </div>

      {/* 프로젝트 정보 */}
      <div className="bg-white rounded-lg shadow-sm mb-8">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <p className="text-xs text-gray-500 uppercase">UUID</p>
            <p className="text-sm font-mono text-gray-800">{project.uuid}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">상태</p>
            <p
              className={`px-3 py-1 inline-block rounded-full text-xs font-semibold ${
                PROJECT_STATUS_COLORS[project.status]
              }`}
            >
              {PROJECT_STATUS_LABELS[project.status]}
            </p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200">
            <div>
                <p className="text-xs text-gray-500 uppercase">생성일</p>
                <p className="text-sm text-gray-800">{project.created_at ? new Date(project.created_at).toLocaleString() : '-'}</p>
            </div>
            <div>
                <p className="text-xs text-gray-500 uppercase">수정일</p>
                <p className="text-sm text-gray-800">{project.updated_at ? new Date(project.updated_at).toLocaleString() : '-'}</p>
            </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">프로젝트 파라미터</h3>
            <pre className="bg-gray-100 p-3 rounded-md text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(project.parameters, null, 2)}
            </pre>
        </div>
      </div>

      {/* 태스크 목록 */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            관련 태스크 <span className="text-gray-500">({tasks.length})</span>
          </h2>
        </div>
        {tasks.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-gray-500">이 프로젝트에 대한 태스크가 없습니다.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Task UUID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Step</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created At</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasks.map((task) => (
                  <tr key={task.uuid} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-500">
                      <button
                        onClick={() => onNavigate("task-detail", task.uuid)}
                        className="text-blue-600 hover:text-blue-800 hover:underline"
                        title={task.uuid}
                      >
                        {task.uuid.split("-")[0]}...
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{task.step}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-3 py-1 inline-block rounded-full text-xs font-semibold ${
                          TASK_STATUS_COLORS[task.status]
                        }`}
                      >
                        {TASK_STATUS_LABELS[task.status]}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(task.created_at).toLocaleString()}
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

export default ProjectDetail;
