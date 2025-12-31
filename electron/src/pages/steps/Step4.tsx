import { useState, useEffect } from "react";
import {
  PathInput,
  TextInput,
  FileInput,
  StepRunButton,
} from "../../components/form";
import ProjectStatusMonitor from "../../components/ProjectStatusMonitor";
import { useStepProjectSelector } from "../../hooks/useStepProjectSelector";
import StepProjectList from "../../components/StepProjectList";
import StepDescriptionModal from "../../components/StepDescriptionModal";

function Step4() {
  const [projectName, setProjectName] = useState("");
  const [targetMgfDir, setTargetMgfDir] = useState("");
  const [targetResultPath, setTargetResultPath] = useState("");
  const [decoyMgfDir, setDecoyMgfDir] = useState("");
  const [decoyResultPath, setDecoyResultPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [projectUuid, setProjectUuid] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);

  // Use Step1 project selector for Target MGF Directory
  const targetMgfSelector = useStepProjectSelector({
    step: 1,
    defaultSourceType: "step",
    returnDirectory: true,
    onFileFound: (path) => setTargetMgfDir(path),
    onError: (error) =>
      setMessage({ type: "error", text: error }),
  });

  // Use Step1 project selector for Decoy MGF Directory
  const decoyMgfSelector = useStepProjectSelector({
    step: 1,
    defaultSourceType: "step",
    returnDirectory: true,
    onFileFound: (path) => setDecoyMgfDir(path),
    onError: (error) =>
      setMessage({ type: "error", text: error }),
  });

  // Use Step3 project selector for Target DNPS Result File
  const targetResultSelector = useStepProjectSelector({
    step: 3,
    defaultSourceType: "step",
    extensions: ["mztab"],
    onFileFound: (path) => setTargetResultPath(path),
    onError: (error) =>
      setMessage({ type: "error", text: error }),
  });

  // Use Step3 project selector for Decoy DNPS Result File
  const decoyResultSelector = useStepProjectSelector({
    step: 3,
    defaultSourceType: "step",
    extensions: ["mztab"],
    onFileFound: (path) => setDecoyResultPath(path),
    onError: (error) =>
      setMessage({ type: "error", text: error }),
  });

  // Update paths when selectors find paths or switch to custom
  useEffect(() => {
    if (targetMgfSelector.sourceType === "custom") {
      setTargetMgfDir("");
    } else if (targetMgfSelector.foundFilePath) {
      setTargetMgfDir(targetMgfSelector.foundFilePath);
    }
  }, [targetMgfSelector.sourceType, targetMgfSelector.foundFilePath]);

  useEffect(() => {
    if (decoyMgfSelector.sourceType === "custom") {
      setDecoyMgfDir("");
    } else if (decoyMgfSelector.foundFilePath) {
      setDecoyMgfDir(decoyMgfSelector.foundFilePath);
    }
  }, [decoyMgfSelector.sourceType, decoyMgfSelector.foundFilePath]);

  useEffect(() => {
    if (targetResultSelector.sourceType === "custom") {
      setTargetResultPath("");
    } else if (targetResultSelector.foundFilePath) {
      setTargetResultPath(targetResultSelector.foundFilePath);
    }
  }, [targetResultSelector.sourceType, targetResultSelector.foundFilePath]);

  useEffect(() => {
    if (decoyResultSelector.sourceType === "custom") {
      setDecoyResultPath("");
    } else if (decoyResultSelector.foundFilePath) {
      setDecoyResultPath(decoyResultSelector.foundFilePath);
    }
  }, [decoyResultSelector.sourceType, decoyResultSelector.foundFilePath]);

  // Check if all required parameters are entered
  const isFormValid = () => {
    const targetMgfDirValid =
      targetMgfSelector.sourceType === "step"
        ? targetMgfSelector.selectedProjectUuid !== "" &&
          targetMgfDir.trim() !== ""
        : targetMgfDir.trim() !== "";

    const decoyMgfDirValid =
      decoyMgfSelector.sourceType === "step"
        ? decoyMgfSelector.selectedProjectUuid !== "" &&
          decoyMgfDir.trim() !== ""
        : decoyMgfDir.trim() !== "";

    const targetResultPathValid =
      targetResultSelector.sourceType === "step"
        ? targetResultSelector.selectedProjectUuid !== "" &&
          targetResultPath.trim() !== ""
        : targetResultPath.trim() !== "";

    const decoyResultPathValid =
      decoyResultSelector.sourceType === "step"
        ? decoyResultSelector.selectedProjectUuid !== "" &&
          decoyResultPath.trim() !== ""
        : decoyResultPath.trim() !== "";

    return (
      projectName.trim() !== "" &&
      targetMgfDirValid &&
      targetResultPathValid &&
      decoyMgfDirValid &&
      decoyResultPathValid &&
      outputPath.trim() !== ""
    );
  };

  // Run Step 4 버튼 클릭 핸들러
  const handleRunStep4 = async () => {
    if (!isFormValid()) {
      return;
    }

    setIsRunning(true);
    setMessage(null);

    try {
      const result = await window.step.runStep4({
        projectName,
        targetMgfDir,
        targetResultPath,
        decoyMgfDir,
        decoyResultPath,
        outputPath,
      });

      if (result.success && result.project) {
        setProjectUuid(result.project.uuid);
        setContainerId(result.containerId || null);
        setMessage(null);
        console.log("Step4 execution result:", result);
      } else {
        setMessage({
          type: "error",
          text: `Step 4 execution failed: ${result.error}`,
        });
      }
    } catch (error: unknown) {
      console.error("Step4 execution error:", error);
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
              <h2 className="text-2xl font-bold text-gray-900">Step 4</h2>
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

          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Step 4 Projects
            </h3>
            <StepProjectList step={4} />
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

            {/* Target MGF Directory */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target MGF Directory Source
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="targetMgfSource"
                    value="step"
                    checked={targetMgfSelector.sourceType === "step"}
                    onChange={() => targetMgfSelector.setSourceType("step")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Step1 Project</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="targetMgfSource"
                    value="custom"
                    checked={targetMgfSelector.sourceType === "custom"}
                    onChange={() => targetMgfSelector.setSourceType("custom")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Custom Path</span>
                </label>
              </div>

              {targetMgfSelector.sourceType === "step" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Step1 Project
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={targetMgfSelector.selectedProjectUuid}
                      onChange={(e) => {
                        targetMgfSelector.setSelectedProjectUuid(e.target.value);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Step1 Project</option>
                      {targetMgfSelector.projects.map((project) => (
                        <option key={project.uuid} value={project.uuid}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {targetMgfSelector.selectedProjectUuid && targetMgfSelector.foundFilePath && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        MGF Directory 경로
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
                        {targetMgfSelector.foundFilePath}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <PathInput
                  label="Target MGF Directory"
                  value={targetMgfDir}
                  onChange={setTargetMgfDir}
                  placeholder="/path/to/target/mgf"
                  required={true}
                  description="The full path of the directory containing the Target MGF files (mounted inside the container at /app/target/mgf)"
                />
              )}
            </div>

            {/* Target DNPS Result File */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target DNPS Result File Source
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="targetResultSource"
                    value="step"
                    checked={targetResultSelector.sourceType === "step"}
                    onChange={() => targetResultSelector.setSourceType("step")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Step3 Project</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="targetResultSource"
                    value="custom"
                    checked={targetResultSelector.sourceType === "custom"}
                    onChange={() => targetResultSelector.setSourceType("custom")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Custom Path</span>
                </label>
              </div>

              {targetResultSelector.sourceType === "step" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Step3 Project
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={targetResultSelector.selectedProjectUuid}
                      onChange={(e) => {
                        targetResultSelector.setSelectedProjectUuid(e.target.value);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Step3 Project</option>
                      {targetResultSelector.projects.map((project) => (
                        <option key={project.uuid} value={project.uuid}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {targetResultSelector.selectedProjectUuid && targetResultSelector.foundFilePath && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Result File Path
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
                        {targetResultSelector.foundFilePath}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <FileInput
                  label="Target DNPS Result File"
                  value={targetResultPath}
                  onChange={setTargetResultPath}
                  placeholder="/path/to/target/result.mztab"
                  required={true}
                  description="The full path of the Target DNPS result file (mztab, mounted inside the container at /app/target/result.mztab)"
                  filters={[{ name: "MZTAB Files", extensions: ["mztab"] }]}
                />
              )}
            </div>

            {/* Decoy MGF Directory */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decoy MGF Directory Source
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="decoyMgfSource"
                    value="step"
                    checked={decoyMgfSelector.sourceType === "step"}
                    onChange={() => decoyMgfSelector.setSourceType("step")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Step1 Project</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="decoyMgfSource"
                    value="custom"
                    checked={decoyMgfSelector.sourceType === "custom"}
                    onChange={() => decoyMgfSelector.setSourceType("custom")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Custom Path</span>
                </label>
              </div>

              {decoyMgfSelector.sourceType === "step" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Step1 Project
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={decoyMgfSelector.selectedProjectUuid}
                      onChange={(e) => {
                        decoyMgfSelector.setSelectedProjectUuid(e.target.value);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Step1 Project</option>
                      {decoyMgfSelector.projects.map((project) => (
                        <option key={project.uuid} value={project.uuid}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {decoyMgfSelector.selectedProjectUuid && decoyMgfSelector.foundFilePath && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        MGF Directory Path
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
                        {decoyMgfSelector.foundFilePath}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <PathInput
                  label="Decoy MGF Directory"
                  value={decoyMgfDir}
                  onChange={setDecoyMgfDir}
                  placeholder="/path/to/decoy/mgf"
                  required={true}
                  description="The full path of the directory containing the Decoy MGF files (mounted inside the container at /app/decoy/mgf)"
                />
              )}
            </div>

            {/* Decoy DNPS Result File */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decoy DNPS Result File Source
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="decoyResultSource"
                    value="step"
                    checked={decoyResultSelector.sourceType === "step"}
                    onChange={() => decoyResultSelector.setSourceType("step")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Step3 Project</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="decoyResultSource"
                    value="custom"
                    checked={decoyResultSelector.sourceType === "custom"}
                    onChange={() => decoyResultSelector.setSourceType("custom")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Custom Path</span>
                </label>
              </div>

              {decoyResultSelector.sourceType === "step" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Step3 Project
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={decoyResultSelector.selectedProjectUuid}
                      onChange={(e) => {
                        decoyResultSelector.setSelectedProjectUuid(e.target.value);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Step3 Project</option>
                      {decoyResultSelector.projects.map((project) => (
                        <option key={project.uuid} value={project.uuid}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {decoyResultSelector.selectedProjectUuid && decoyResultSelector.foundFilePath && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Result File Path
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
                        {decoyResultSelector.foundFilePath}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <FileInput
                  label="Decoy DNPS Result File"
                  value={decoyResultPath}
                  onChange={setDecoyResultPath}
                  placeholder="/path/to/decoy/result.mztab"
                  required={true}
                  description="The full path of the Decoy DNPS result file (mztab, mounted inside the container at /app/decoy/result.mztab)"
                  filters={[{ name: "MZTAB Files", extensions: ["mztab"] }]}
                />
              )}
            </div>

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
            stepNumber={4}
            onClick={handleRunStep4}
            isFormValid={isFormValid()}
            isRunning={isRunning}
            message={message}
          />
          {/* Project Status Monitor */}
          <ProjectStatusMonitor 
            projectUuid={projectUuid}
            projectName={projectName}
            containerId={containerId}
            stepNumber={4}
          />
        </div>
      </div>

      <StepDescriptionModal
        isOpen={isDescriptionModalOpen}
        onClose={() => setIsDescriptionModalOpen(false)}
        stepNumber={4}
        stepTitle="Percolator and FDR Control"
        description="In this step, Feature Calculation is performed (using p3 image)."
        requiredInputs={[
          "Project name",
          "Target MGF directory",
          "Target DNPS result file (mztab)",
          "Decoy MGF directory",
          "Decoy DNPS result file (mztab)",
          "Output folder path",
        ]}
      />
    </div>
  );
}

export default Step4;

