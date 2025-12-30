
import { useState, useEffect } from "react";
import { Project, PROJECT_STATUS_LABELS, PROJECT_STATUS_COLORS } from "../types/project";

interface ProjectDetailProps {
  uuid: string;
  onNavigate: (page: string, uuid: string) => void;
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
          <div>
            <p className="text-xs text-gray-500 uppercase">Step</p>
            <p className="text-sm text-gray-800">{project.step || '-'}</p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-gray-200">
            <div>
                <p className="text-xs text-gray-500 uppercase">Created At</p>
                <p className="text-sm text-gray-800">{project.created_at ? new Date(project.created_at).toLocaleString() : '-'}</p>
            </div>
            <div>
                <p className="text-xs text-gray-500 uppercase">Updated At</p>
                <p className="text-sm text-gray-800">{project.updated_at ? new Date(project.updated_at).toLocaleString() : '-'}</p>
            </div>
        </div>
        <div className="px-6 py-4 bg-gray-50 rounded-b-lg">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">Project Parameters</h3>
            <pre className="bg-gray-100 p-3 rounded-md text-xs text-gray-600 overflow-x-auto">
                {JSON.stringify(project.parameters, null, 2)}
            </pre>
        </div>
      </div>
    </div>
  );
}

export default ProjectDetail;
