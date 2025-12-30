interface ProjectCreatedMessageProps {
  projectName: string;
  containerId: string | null;
  stepNumber: number;
}

function ProjectCreatedMessage({ projectName, containerId, stepNumber }: ProjectCreatedMessageProps) {
  if (!containerId) {
    return null;
  }

  return (
    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
      <div className="flex items-start gap-3">
        <svg
          className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <div className="flex-1">
          <p className="text-sm font-semibold text-gray-700 mb-1">
            Project Created Successfully
          </p>
          <p className="text-sm text-gray-600">
            Project <span className="font-medium">"{projectName}"</span> has been created and Step {stepNumber} is running.
          </p>
          <p className="text-xs text-gray-500 mt-1">
            Container ID: <span className="font-mono">{containerId.substring(0, 12)}...</span>
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProjectCreatedMessage;

