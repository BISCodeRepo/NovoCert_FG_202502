
import { useState, useEffect } from "react";
import ParameterViewer from "../components/ParameterViewer";
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
          setError("Task not found.");
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
          // when the container is stopped, check the current project status
          const currentProject = await window.db.getProject(uuid);
          // do not update if the project is already failed
          if (currentProject && currentProject.status === 'running') {
            // check the exit code of the container to determine the actual success or failure
            const exitCodeResult = await window.docker.getContainerExitCode(containerId);
            console.log(`[ProjectDetail] Container ${containerId} exit code:`, exitCodeResult.exitCode);
            console.log(`[ProjectDetail] Exit code type: ${typeof exitCodeResult.exitCode}, value: ${exitCodeResult.exitCode}`);
            if (exitCodeResult.success && exitCodeResult.exitCode !== null) {
              // if the exit code is 0, then success, otherwise failure
              const newStatus = exitCodeResult.exitCode === 0 ? 'success' : 'failed';
              console.log(`[ProjectDetail] Exit Code = ${exitCodeResult.exitCode}, Status = ${newStatus}`);
              const updatedProject = await window.db.updateProject(uuid, { status: newStatus });
              if (updatedProject) {
                setProject(updatedProject);
              }
            } else {
              // Container not found - likely removed by --rm after successful completion
              // If container is not running and we can't get exit code, assume success
              console.log(`[ProjectDetail] Cannot get exit code, assuming success (container likely removed by --rm)`);
              console.log(`[ProjectDetail] success: ${exitCodeResult.success}, exitCode: ${exitCodeResult.exitCode}`);
              const updatedProject = await window.db.updateProject(uuid, { status: 'success' });
              if (updatedProject) {
                setProject(updatedProject);
              }
            }
          } else if (currentProject && currentProject.status === 'failed') {
            // already failed, only update the status
            setProject(currentProject);
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
        <p className="text-gray-500">Loading...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-semibold">{error}</p>
        <button
          type="button"
          onClick={() => onNavigate("experiments", "")}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Go to experiments
        </button>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={() => onNavigate("experiments", "")}
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; Go to experiments
        </button>
        {project.experiment_uuid ? (
          <button
            type="button"
            onClick={() => onNavigate("experiment-detail", project.experiment_uuid!)}
            className="text-sm text-blue-600 hover:underline"
          >
            &larr; Experiment overview
          </button>
        ) : null}
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
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Status</p>
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
            <h3 className="text-sm font-semibold text-gray-700">Task Parameters</h3>
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
