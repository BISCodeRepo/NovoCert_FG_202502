import { useState, useEffect } from "react";
import {
  PathInput,
  TextInput,
  FileInput,
  StepRunButton,
} from "../../components/form";
import ProjectStatusMonitor from "../../components/ProjectStatusMonitor";
import { useStepProjectSelector } from "../../hooks/useStepProjectSelector";
import { useStepRunningProject } from "../../hooks/useStepRunningProject";
import { useStepRunningStatus } from "../../hooks/useStepRunningStatus";
import StepProjectList from "../../components/StepProjectList";
import StepDescriptionModal from "../../components/StepDescriptionModal";
import type { StepPageProps } from "../../types";

function Step6({ onNavigate }: StepPageProps) {
  const [projectName, setProjectName] = useState("");
  const [csvFilePath, setCsvFilePath] = useState("");
  const [previousStepPath, setPreviousStepPath] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [projectUuid, setProjectUuid] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);

  // Check for running projects when page loads
  useStepRunningProject({
    step: 6,
    setProjectUuid,
    setContainerId,
    setProjectName,
  });

  // Check if there's a running project (polling status)
  const hasRunningProject = useStepRunningStatus(projectUuid);

  // Persist input values
  useEffect(() => {
    const saved = localStorage.getItem('step6_inputs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.projectName) setProjectName(parsed.projectName);
        if (parsed.csvFilePath) setCsvFilePath(parsed.csvFilePath);
        if (parsed.previousStepPath) setPreviousStepPath(parsed.previousStepPath);
      } catch (error) {
        console.error('Error loading saved Step6 inputs:', error);
      }
    }
  }, []);

  // Save input values when they change
  useEffect(() => {
    const inputs = {
      projectName,
      csvFilePath,
      previousStepPath,
    };
    localStorage.setItem('step6_inputs', JSON.stringify(inputs));
  }, [projectName, csvFilePath, previousStepPath]);

  // Use Step5 project selector for previous step project/CSV file
  const previousStepSelector = useStepProjectSelector({
    step: 5,
    defaultSourceType: "step",
    extensions: ["csv"],
    onFileFound: (path) => setPreviousStepPath(path),
  });

  // Update previousStepPath when selector finds file or switches to custom
  useEffect(() => {
    if (previousStepSelector.sourceType === "custom") {
      setPreviousStepPath("");
    } else if (previousStepSelector.foundFilePath) {
      setPreviousStepPath(previousStepSelector.foundFilePath);
    }
  }, [previousStepSelector.sourceType, previousStepSelector.foundFilePath, previousStepSelector.error]);

  // Check if all required parameters are entered
  const isFormValid = () => {
    const previousStepPathValid =
      previousStepSelector.sourceType === "step"
        ? previousStepSelector.selectedProjectUuid !== "" &&
          previousStepSelector.foundFilePath !== "" &&
          previousStepPath.trim() !== ""
        : previousStepPath.trim() !== "";

    return (
      projectName.trim() !== "" &&
      csvFilePath.trim() !== "" &&
      previousStepPathValid
    );
  };

  // Run Step 6 button click handler
  const handleRunStep6 = async () => {
    if (!isFormValid()) {
      return;
    }

    setIsRunning(true);
    setMessage(null);

    try {
      const result = await window.step.runStep6({
        projectName,
        csvFilePath,
        previousStepPath,
      });

      if (result.success && result.project) {
        setProjectUuid(result.project.uuid);
        setContainerId(result.containerId || null);
        setMessage(null);
        console.log("Step6 execution result:", result);
      } else {
        setMessage({
          type: "error",
          text: `Step 6 execution failed: ${result.error}`,
        });
      }
    } catch (error: unknown) {
      console.error("Step6 execution error:", error);
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
      <div className="w-1/3">
        <div className="bg-white rounded-lg shadow-sm p-6 sticky top-0">
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <h2 className="text-2xl font-bold text-gray-900">Step 6</h2>
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
            <p className="text-sm text-gray-500">Post Analysis</p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Step 6 Projects
            </h3>
            <StepProjectList step={6} refreshTrigger={projectUuid} onNavigate={onNavigate} />
          </div>
        </div>
      </div>

      <div className="flex-1">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            Parameter Settings
          </h2>

          <div className="space-y-6">
            <TextInput
              label="Project Name"
              value={projectName}
              onChange={setProjectName}
              placeholder="Enter the project name"
              required={true}
              description="Enter the name of the project to start a new one"
            />

            <FileInput
              label="CSV File Path"
              value={csvFilePath}
              onChange={setCsvFilePath}
              placeholder="/path/to/file.csv"
              required={true}
              description="The full path of the CSV file"
              filters={[{ name: "CSV Files", extensions: ["csv"] }]}
            />

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Previous Step Project or CSV File Source
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="previousStepSource"
                    value="step"
                    checked={previousStepSelector.sourceType === "step"}
                    onChange={() => previousStepSelector.setSourceType("step")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Step5 Project</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="previousStepSource"
                    value="custom"
                    checked={previousStepSelector.sourceType === "custom"}
                    onChange={() => previousStepSelector.setSourceType("custom")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Custom CSV File</span>
                </label>
              </div>

              {previousStepSelector.sourceType === "step" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Step5 Project
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={previousStepSelector.selectedProjectUuid}
                      onChange={(e) => {
                        previousStepSelector.setSelectedProjectUuid(e.target.value);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Step5 Project</option>
                      {previousStepSelector.projects.map((project) => (
                        <option key={project.uuid} value={project.uuid}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {previousStepSelector.selectedProjectUuid && (
                    <div>
                      {previousStepSelector.foundFilePath ? (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            CSV File Path
                            <span className="text-red-500 ml-1">*</span>
                          </label>
                          <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
                            {previousStepSelector.foundFilePath}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            The most recently created .csv file in the output directory of the selected Step5 project has been automatically selected.
                          </p>
                        </>
                      ) : null}
                      {previousStepSelector.error && (
                        <p className="mt-2 text-sm text-red-600">
                          {previousStepSelector.error}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <FileInput
                  label="Previous Step CSV File Path"
                  value={previousStepPath}
                  onChange={setPreviousStepPath}
                  placeholder="/path/to/previous/step.csv"
                  required={true}
                  description="The full path of the CSV file from the previous step"
                  filters={[{ name: "CSV Files", extensions: ["csv"] }]}
                />
              )}
            </div>
          </div>

          {/* Run Button */}
          <StepRunButton
            stepNumber={6}
            onClick={handleRunStep6}
            isFormValid={isFormValid()}
            isRunning={isRunning || hasRunningProject}
            message={message}
          />
          {/* Project Status Monitor */}
          <ProjectStatusMonitor 
            projectUuid={projectUuid}
            projectName={projectName}
            containerId={containerId}
            stepNumber={6}
          />
        </div>
      </div>

      <StepDescriptionModal
        isOpen={isDescriptionModalOpen}
        onClose={() => setIsDescriptionModalOpen(false)}
        stepNumber={6}
        stepTitle="Post Analysis"
        description="In this step, Post Analysis is performed."
        requiredInputs={[
          "Project name",
          "CSV file path",
          "Previous step project or CSV file",
        ]}
      />
    </div>
  );
}

export default Step6;
