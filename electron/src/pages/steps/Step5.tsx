import { useState, useEffect, useCallback } from "react";
import {
  PathInput,
  TextInput,
  FileInput,
  StepRunButton,
} from "../../components/form";
import ProjectStatusMonitor from "../../components/ProjectStatusMonitor";
import ExperimentDagStatus from "../../components/ExperimentDagStatus";
import StepDescriptionModal from "../../components/StepDescriptionModal";
import { useStepRunningProject } from "../../hooks/useStepRunningProject";
import { useStepRunningStatus } from "../../hooks/useStepRunningStatus";
import { useExperiment } from "../../contexts/ExperimentContext";
import { filterTasksByExperiment, getNextTaskName, getTaskRootOutputPath, latestTaskForStep } from "../../utils/experimentTasks";
import type { StepPageProps } from "../../types";
import type { Project } from "../../types/project";

function Step5(_: StepPageProps) {
  const { currentExperiment } = useExperiment();
  const [projectName, setProjectName] = useState("");
  const [inputPath, setInputPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [projectUuid, setProjectUuid] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [step5Tasks, setStep5Tasks] = useState<Project[]>([]);

  // Check for running tasks when page loads
  useStepRunningProject({
    step: 5,
    setProjectUuid,
    setContainerId,
    setProjectName,
  });

  // Check if there's a running project (polling status)
  const hasRunningProject = useStepRunningStatus(projectUuid);

  // Persist input values
  useEffect(() => {
    const saved = localStorage.getItem('step5_inputs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.inputPath) setInputPath(parsed.inputPath);
        if (parsed.outputPath) setOutputPath(parsed.outputPath);
      } catch (error) {
        console.error('Error loading saved Step5 inputs:', error);
      }
    }
  }, []);

  // Save input values when they change
  useEffect(() => {
    const inputs = {
      projectName,
      inputPath,
      outputPath,
    };
    localStorage.setItem('step5_inputs', JSON.stringify(inputs));
  }, [projectName, inputPath, outputPath]);

  useEffect(() => {
    const loadStep5Tasks = async () => {
      try {
        const allTasks = await window.db.getProjects();
        setStep5Tasks(
          filterTasksByExperiment(allTasks, currentExperiment?.uuid).filter((project) => String(project.step) === "5")
        );
      } catch (error) {
        console.error("Failed to load Step 5 tasks for name validation:", error);
      }
    };
    loadStep5Tasks();
  }, [currentExperiment?.uuid]);

  const refreshTaskInfo = useCallback(async () => {
    const allTasks = await window.db.getProjects();
    setStep5Tasks(
      filterTasksByExperiment(allTasks, currentExperiment?.uuid).filter((project) => String(project.step) === "5")
    );
    setProjectName(getNextTaskName(allTasks, currentExperiment?.uuid, currentExperiment?.name, 5));
  }, [currentExperiment?.uuid, currentExperiment?.name]);

  useEffect(() => {
    const applyPreviousStepDefaults = async () => {
      const allTasks = await window.db.getProjects();
      const previousTask = latestTaskForStep(allTasks, 4, currentExperiment?.uuid);
      setProjectName(getNextTaskName(allTasks, currentExperiment?.uuid, currentExperiment?.name, 5));
      if (!previousTask) {
        setInputPath("");
        setOutputPath("");
        return;
      }

      const previousOutputPath = getTaskRootOutputPath(previousTask);
      setOutputPath(previousOutputPath);

      const stepOutputPath = (previousTask.parameters?.step4 as { outputPath?: string } | undefined)?.outputPath;
      if (stepOutputPath) {
        const pinResult = await window.fs.findLatestFile(stepOutputPath, "pin");
        setInputPath(pinResult.path || "");
      }
    };

    applyPreviousStepDefaults();
  }, [currentExperiment?.uuid, currentExperiment?.name]);

  const normalizedProjectName = projectName.trim().toLowerCase();
  const isDuplicateProjectName =
    normalizedProjectName !== "" &&
    step5Tasks.some(
      (project) => project.name.trim().toLowerCase() === normalizedProjectName
    );

  // Check if all required parameters are entered
  const isFormValid = () => {
    return (
      projectName.trim() !== "" &&
      inputPath.trim() !== "" &&
      outputPath.trim() !== "" &&
      !isDuplicateProjectName
    );
  };

  // Run Step 5 button click handler
  const handleRunStep5 = async () => {
    if (!isFormValid()) {
      return;
    }
    const latestStep5Tasks = filterTasksByExperiment(await window.db.getProjects(), currentExperiment?.uuid).filter(
      (project) => String(project.step) === "5"
    );
    const isDuplicateAtRunTime = latestStep5Tasks.some(
      (project) =>
        project.name.trim().toLowerCase() === projectName.trim().toLowerCase()
    );
    if (isDuplicateAtRunTime) {
      setStep5Tasks(latestStep5Tasks);
      setMessage({
        type: "error",
        text: "A Step 5 task with the same name already exists. Please choose a different task name.",
      });
      return;
    }
    if (isDuplicateProjectName) {
      setMessage({
        type: "error",
        text: "A Step 5 task with the same name already exists. Please choose a different task name.",
      });
      return;
    }

    setIsRunning(true);
    setMessage(null);

    try {
      const result = await window.step.runStep5({
        experimentUuid: currentExperiment?.uuid,
        projectName,
        inputPath,
        outputPath,
      });

      if (result.success && result.project) {
        setProjectUuid(result.project.uuid);
        setContainerId(result.containerId || null);
        setMessage(null);
        console.log("Step5 execution result:", result);
      } else {
        setMessage({
          type: "error",
          text: `Step 5 execution failed: ${result.error}`,
        });
      }
    } catch (error: unknown) {
      console.error("Error in Step5 execution:", error);
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
              <h2 className="text-2xl font-bold text-gray-900">Step 5</h2>
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
            <p className="text-sm text-gray-500">Percolator and FDR Control</p>
          </div>

<ExperimentDagStatus currentStep={5} refreshTrigger={projectUuid} />

      
        </div>
      </div>

      <div className="flex-1">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Parameter Settings
          </h2>

          <div className="space-y-6">
            <div>
              <TextInput
                label="Task Name"
                value={projectName}
                onChange={setProjectName}
                placeholder="Enter the task name"
                required={true}
                readOnly
                description="Generated from the experiment and step."
              />
              {isDuplicateProjectName && (
                <p className="mt-1 text-xs text-red-600">
                  This task name already exists in Step 5. Please enter a different name.
                </p>
              )}
            </div>

            <FileInput
              label="PIN File Path"
              value={inputPath}
              onChange={setInputPath}
              placeholder="/path/to/input.pin"
              required={true}
              description="The full path of the PIN file (mounted inside the container at /app/t_d.pin)"
              filters={[{ name: "PIN Files", extensions: ["pin"] }]}
            />

            <PathInput
              label="Output Folder Path"
              value={outputPath}
              onChange={setOutputPath}
              placeholder="/path/to/output/folder"
              required={true}
              description="The full path of the folder to save the results (mounted inside the container at /app/output)"
            />
          </div>

          {/* Run Button */}
          <StepRunButton
            stepNumber={5}
            onClick={handleRunStep5}
            isFormValid={isFormValid()}
            isRunning={isRunning || hasRunningProject}
            message={message}
          />
          {/* Task Status Monitor */}
          <ProjectStatusMonitor
            projectUuid={projectUuid}
            projectName={projectName}
            containerId={containerId}
            stepNumber={5}
            onTaskComplete={refreshTaskInfo}
          />
        </div>
      </div>

      <StepDescriptionModal
        isOpen={isDescriptionModalOpen}
        onClose={() => setIsDescriptionModalOpen(false)}
        stepNumber={5}
        stepTitle="Percolator and FDR Control"
        description="In this step, Percolator is used to control FDR(False Discovery Rate)"
        requiredInputs={[
          "Task Name",
          "PIN File Path",
          "Output Folder Path",
        ]}
      />
    </div>
  );
}

export default Step5;
