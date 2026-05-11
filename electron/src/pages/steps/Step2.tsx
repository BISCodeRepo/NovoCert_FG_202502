import { useState, useEffect } from "react";
import { PathInput, TextInput, StepRunButton } from "../../components/form";
import ProjectStatusMonitor from "../../components/ProjectStatusMonitor";
import ExperimentDagStatus from "../../components/ExperimentDagStatus";
import StepDescriptionModal from "../../components/StepDescriptionModal";
import { useStepRunningProject } from "../../hooks/useStepRunningProject";
import { useStepRunningStatus } from "../../hooks/useStepRunningStatus";
import { useExperiment } from "../../contexts/ExperimentContext";
import { filterTasksByExperiment, getNextTaskName, getTaskRootOutputPath, latestTaskForStep, TaskBranch } from "../../utils/experimentTasks";
import type { StepPageProps } from "../../types";
import type { Project } from "../../types/project";

function Step2(_: StepPageProps) {
  const { currentExperiment } = useExperiment();
  const [branch, setBranch] = useState<TaskBranch>("target");
  const [projectName, setProjectName] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [projectUuid, setProjectUuid] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [step2Tasks, setStep2Tasks] = useState<Project[]>([]);

  // Check for running tasks when page loads
  useStepRunningProject({
    step: 2,
    setProjectUuid,
    setContainerId,
    setProjectName,
  });

  // Check if there's a running project (polling status)
  const hasRunningProject = useStepRunningStatus(projectUuid);

  // Persist input values
  useEffect(() => {
    const saved = localStorage.getItem('step2_inputs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.outputPath) setOutputPath(parsed.outputPath);
      } catch (error) {
        console.error('Error loading saved Step2 inputs:', error);
      }
    }
  }, []);

  // Save input values when they change
  useEffect(() => {
    const inputs = {
      projectName,
      branch,
      outputPath,
    };
    localStorage.setItem('step2_inputs', JSON.stringify(inputs));
  }, [projectName, branch, outputPath]);

  useEffect(() => {
    const loadStep2Tasks = async () => {
      try {
        const allTasks = await window.db.getProjects();
        setStep2Tasks(
          filterTasksByExperiment(allTasks, currentExperiment?.uuid).filter((project) => String(project.step) === "2")
        );
      } catch (error) {
        console.error("Failed to load Step 2 tasks for name validation:", error);
      }
    };
    loadStep2Tasks();
  }, [currentExperiment?.uuid]);

  useEffect(() => {
    const applyPreviousStepDefaults = async () => {
      const allTasks = await window.db.getProjects();
      const previousTask = latestTaskForStep(allTasks, 1, currentExperiment?.uuid, branch);
      setProjectName(getNextTaskName(allTasks, currentExperiment?.uuid, currentExperiment?.name, 2, branch));
      if (!previousTask) {
        setOutputPath("");
        return;
      }

      setOutputPath(getTaskRootOutputPath(previousTask));
    };

    applyPreviousStepDefaults();
  }, [currentExperiment?.uuid, currentExperiment?.name, branch]);

  const normalizedProjectName = projectName.trim().toLowerCase();
  const isDuplicateProjectName =
    normalizedProjectName !== "" &&
    step2Tasks.some(
      (project) => project.name.trim().toLowerCase() === normalizedProjectName
    );

  // Check if all required parameters are entered
  const isFormValid = () => {
    return projectName.trim() !== "" && outputPath.trim() !== "" && !isDuplicateProjectName;
  };

  // Run Step 2 button click handler
  const handleRunStep2 = async () => {
    if (!isFormValid()) {
      return;
    }
    const latestStep2Tasks = filterTasksByExperiment(await window.db.getProjects(), currentExperiment?.uuid).filter(
      (project) => String(project.step) === "2"
    );
    const isDuplicateAtRunTime = latestStep2Tasks.some(
      (project) =>
        project.name.trim().toLowerCase() === projectName.trim().toLowerCase()
    );
    if (isDuplicateAtRunTime) {
      setStep2Tasks(latestStep2Tasks);
      setMessage({
        type: "error",
        text: "A Step 2 task with the same name already exists. Please choose a different task name.",
      });
      return;
    }
    if (isDuplicateProjectName) {
      setMessage({
        type: "error",
        text: "A Step 2 task with the same name already exists. Please choose a different task name.",
      });
      return;
    }

    setIsRunning(true);
    setMessage(null);

    try {
      const result = await window.step.runStep2({
        experimentUuid: currentExperiment?.uuid,
        branch,
        projectName,
        outputPath,
      });

      if (result.success && result.project) {
        setProjectUuid(result.project.uuid);
        setContainerId(result.containerId || null);
        setMessage(null);
        console.log("Step2 execution result:", result);
      } else {
        setMessage({
          type: "error",
          text: `Step 2 execution failed: ${result.error}`,
        });
      }
    } catch (error: unknown) {
      console.error("Step2 execution error:", error);
      setMessage({
        type: "error",
        text: `Unexpected error: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-full flex gap-6">
      {/* Left: Project and Step information */}
      <div className="w-1/3">
        <div className="bg-white rounded-lg shadow-sm p-6 sticky top-0">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900">Step 2</h2>
              <button
                onClick={() => setIsDescriptionModalOpen(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="Step Description"
              >
              <svg
                  className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              </button>
            </div>
            <p className="text-sm text-gray-500">Download Casanovo Config</p>
          </div>

<ExperimentDagStatus currentStep={2} refreshTrigger={projectUuid} />

     
        </div>
      </div>

      {/* Right: Parameter input */}
      <div className="flex-1">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Parameter Settings
          </h2>

          <div className="space-y-6">
            <div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Branch <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="flex gap-3">
                  {(["target", "decoy"] as TaskBranch[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setBranch(option)}
                      className={`px-4 py-2 rounded-lg border text-sm font-medium capitalize ${
                        branch === option
                          ? "border-blue-500 bg-blue-50 text-blue-700"
                          : "border-gray-300 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
              <TextInput
                label="Task Name"
                value={projectName}
                onChange={setProjectName}
                placeholder="Enter the task name"
                required={true}
                readOnly
                description="Generated from the experiment, branch, and step."
              />
              {isDuplicateProjectName && (
                <p className="mt-1 text-xs text-red-600">
                  This task name already exists in Step 2. Please enter a different name.
                </p>
              )}
            </div>

            <PathInput
              label="Output Folder Path"
              value={outputPath}
              onChange={setOutputPath}
              placeholder="/path/to/output/folder"
              required={true}
              description="The full path of the folder to save the Casanovo configuration file (mounted inside the container at /app/output/)"
            />
          </div>

          {/* Model Download Information */}
          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-blue-900 mb-2">
                  Casanovo Model Required for Step 3
                </h3>
                <p className="text-sm text-blue-800 mb-3">
                  Step 3 (De novo Peptide Sequencing) requires a Casanovo model file (.ckpt). 
                  Please download the model from the official GitHub releases page before proceeding to Step 3.
                </p>
                <a
                  href="https://github.com/Noble-Lab/casanovo/releases"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg
                    className="w-4 h-4"
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
                  Download Model from GitHub Releases
                </a>
                <p className="text-xs text-blue-700 mt-2">
                  Look for files with <code className="bg-blue-100 px-1 py-0.5 rounded">.ckpt</code> extension in the releases.
                </p>
              </div>
            </div>
          </div>

          {/* Run Button */}
          <StepRunButton
            stepNumber={2}
            onClick={handleRunStep2}
            isFormValid={isFormValid()}
            isRunning={isRunning || hasRunningProject}
            buttonLabel="Download YAML File"
            message={message}
          />
          {/* Task Status Monitor */}
          <ProjectStatusMonitor 
            projectUuid={projectUuid}
            projectName={projectName}
            containerId={containerId}
            stepNumber={2}
          />
        </div>
      </div>

      <StepDescriptionModal
        isOpen={isDescriptionModalOpen}
        onClose={() => setIsDescriptionModalOpen(false)}
        stepNumber={2}
        stepTitle="Download Casanovo Config"
        description="In this step, the Casanovo configuration file is downloaded. Note: Step 3 requires a Casanovo model file (.ckpt) which can be downloaded from the GitHub releases page."
        requiredInputs={[
          "Task name",
          "Output folder path (bind mount to /app/output/)",
        ]}
      />
    </div>
  );
}

export default Step2;
