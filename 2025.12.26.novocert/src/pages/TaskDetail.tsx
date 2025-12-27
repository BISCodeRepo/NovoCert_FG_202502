
import { useState, useEffect } from "react";
import { Task, TASK_STATUS_LABELS, TASK_STATUS_COLORS } from "../types/task";

interface TaskDetailProps {
  uuid: string;
  onNavigate: (page: string, uuid: string) => void;
}

function TaskDetail({ uuid, onNavigate }: TaskDetailProps) {
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTaskDetails = async () => {
      try {
        setLoading(true);
        const taskData = await window.db.getTask(uuid);
        if (taskData) {
          setTask(taskData as Task);
        } else {
          setError("태스크를 찾을 수 없습니다.");
        }
      } catch (err) {
        setError("데이터를 불러오는 중 오류가 발생했습니다.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchTaskDetails();
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

  if (!task) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => onNavigate("project-detail", task.project_uuid)}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; 프로젝트 상세로 돌아가기
        </button>
      </div>

      {/* 태스크 정보 */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b border-gray-200">
          <h1 className="text-2xl font-bold text-gray-900">Task Details</h1>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <p className="text-xs text-gray-500 uppercase">Task UUID</p>
            <p className="text-sm font-mono text-gray-800">{task.uuid}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Project UUID</p>
            <p className="text-sm font-mono text-gray-800">{task.project_uuid}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Step</p>
            <p className="text-sm text-gray-800">{task.step}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Status</p>
            <p
              className={`px-3 py-1 inline-block rounded-full text-xs font-semibold ${
                TASK_STATUS_COLORS[task.status]
              }`}
            >
              {TASK_STATUS_LABELS[task.status]}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Created At</p>
            <p className="text-sm text-gray-800">{new Date(task.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase">Updated At</p>
            <p className="text-sm text-gray-800">{new Date(task.updated_at).toLocaleString()}</p>
          </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">태스크 파라미터</h3>
            <pre className="bg-gray-100 p-3 rounded-md text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(task.parameters, null, 2)}
            </pre>
        </div>
      </div>
    </div>
  );
}

export default TaskDetail;
