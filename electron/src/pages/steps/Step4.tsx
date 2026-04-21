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

function Step4({ onNavigate }: StepPageProps) {
  const [projectName, setProjectName] = useState("");
  const [targetSpectraMgfPath, setTargetSpectraMgfPath] = useState("");
  const [targetDnpsPath, setTargetDnpsPath] = useState("");
  const [decoySpectraMgfPath, setDecoySpectraMgfPath] = useState("");
  const [decoyDnpsPath, setDecoyDnpsPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
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
    step: 4,
    setProjectUuid,
    setContainerId,
    setProjectName,
  });

  // Check if there's a running project (polling status)
  const hasRunningProject = useStepRunningStatus(projectUuid);

  // Persist input values
  useEffect(() => {
    const saved = localStorage.getItem('step4_inputs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.projectName) setProjectName(parsed.projectName);
        if (parsed.targetSpectraMgfPath) setTargetSpectraMgfPath(parsed.targetSpectraMgfPath);
        if (parsed.targetDnpsPath) setTargetDnpsPath(parsed.targetDnpsPath);
        if (parsed.decoySpectraMgfPath) setDecoySpectraMgfPath(parsed.decoySpectraMgfPath);
        if (parsed.decoyDnpsPath) setDecoyDnpsPath(parsed.decoyDnpsPath);
        if (parsed.outputPath) setOutputPath(parsed.outputPath);
      } catch (error) {
        console.error('Error loading saved Step4 inputs:', error);
      }
    }
  }, []);

  // Save input values when they change
  useEffect(() => {
    const inputs = {
      projectName,
      targetSpectraMgfPath,
      targetDnpsPath,
      decoySpectraMgfPath,
      decoyDnpsPath,
      outputPath,
    };
    localStorage.setItem('step4_inputs', JSON.stringify(inputs));
  }, [projectName, targetSpectraMgfPath, targetDnpsPath, decoySpectraMgfPath, decoyDnpsPath, outputPath]);

  // Use Step1 project selector for Target Spectra MGF File
  const targetMgfSelector = useStepProjectSelector({
    step: 1,
    defaultSourceType: "step",
    extensions: ["mgf"],
    onFileFound: (path) => setTargetSpectraMgfPath(path),
    onError: (error) =>
      setMessage({ type: "error", text: error }),
  });

  // Use Step1 project selector for Decoy Spectra MGF File
  const decoyMgfSelector = useStepProjectSelector({
    step: 1,
    defaultSourceType: "step",
    extensions: ["mgf"],
    onFileFound: (path) => setDecoySpectraMgfPath(path),
    onError: (error) =>
      setMessage({ type: "error", text: error }),
  });

  // Use Step3 project selector for Target DNPS Result File
  const targetResultSelector = useStepProjectSelector({
    step: 3,
    defaultSourceType: "step",
    extensions: ["mztab"],
    onFileFound: (path) => setTargetDnpsPath(path),
    onError: (error) =>
      setMessage({ type: "error", text: error }),
  });

  // Use Step3 project selector for Decoy DNPS Result File
  const decoyResultSelector = useStepProjectSelector({
    step: 3,
    defaultSourceType: "step",
    extensions: ["mztab"],
    onFileFound: (path) => setDecoyDnpsPath(path),
    onError: (error) =>
      setMessage({ type: "error", text: error }),
  });

  // Update paths when selectors find paths or switch to custom
  useEffect(() => {
    if (targetMgfSelector.sourceType === "custom") {
      setTargetSpectraMgfPath("");
    } else if (targetMgfSelector.foundFilePath) {
      setTargetSpectraMgfPath(targetMgfSelector.foundFilePath);
    }
  }, [targetMgfSelector.sourceType, targetMgfSelector.foundFilePath]);

  useEffect(() => {
    if (decoyMgfSelector.sourceType === "custom") {
      setDecoySpectraMgfPath("");
    } else if (decoyMgfSelector.foundFilePath) {
      setDecoySpectraMgfPath(decoyMgfSelector.foundFilePath);
    }
  }, [decoyMgfSelector.sourceType, decoyMgfSelector.foundFilePath]);

  useEffect(() => {
    if (targetResultSelector.sourceType === "custom") {
      setTargetDnpsPath("");
    } else if (targetResultSelector.foundFilePath) {
      setTargetDnpsPath(targetResultSelector.foundFilePath);
    }
  }, [targetResultSelector.sourceType, targetResultSelector.foundFilePath]);

  useEffect(() => {
    if (decoyResultSelector.sourceType === "custom") {
      setDecoyDnpsPath("");
    } else if (decoyResultSelector.foundFilePath) {
      setDecoyDnpsPath(decoyResultSelector.foundFilePath);
    }
  }, [decoyResultSelector.sourceType, decoyResultSelector.foundFilePath]);

  // Check if all required parameters are entered
  const isFormValid = () => {
    const targetMgfPathValid =
      targetMgfSelector.sourceType === "step"
        ? targetMgfSelector.selectedProjectUuid !== "" &&
          targetSpectraMgfPath.trim() !== ""
        : targetSpectraMgfPath.trim() !== "";

    const decoyMgfPathValid =
      decoyMgfSelector.sourceType === "step"
        ? decoyMgfSelector.selectedProjectUuid !== "" &&
          decoySpectraMgfPath.trim() !== ""
        : decoySpectraMgfPath.trim() !== "";

    const targetDnpsPathValid =
      targetResultSelector.sourceType === "step"
        ? targetResultSelector.selectedProjectUuid !== "" &&
          targetDnpsPath.trim() !== ""
        : targetDnpsPath.trim() !== "";

    const decoyDnpsPathValid =
      decoyResultSelector.sourceType === "step"
        ? decoyResultSelector.selectedProjectUuid !== "" &&
          decoyDnpsPath.trim() !== ""
        : decoyDnpsPath.trim() !== "";

    return (
      projectName.trim() !== "" &&
      targetMgfPathValid &&
      targetDnpsPathValid &&
      decoyMgfPathValid &&
      decoyDnpsPathValid &&
      outputPath.trim() !== ""
    );
  };

  // Run Step 4 button click handler
  const handleRunStep4 = async () => {
    if (!isFormValid()) {
      return;
    }

    setIsRunning(true);
    setMessage(null);

    try {
      const result = await window.step.runStep4({
        projectName,
        targetSpectraMgfPath,
        targetDnpsPath,
        decoySpectraMgfPath,
        decoyDnpsPath,
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
            <p className="text-sm text-gray-500">Feature Calculation</p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Step 4 Projects
            </h3>
            <StepProjectList step={4} refreshTrigger={projectUuid} onNavigate={onNavigate} />
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

            {/* Target Spectra MGF File */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Spectra MGF File Source
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
                        MGF File Path
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
                        {targetMgfSelector.foundFilePath}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <FileInput
                  label="Target Spectra MGF File"
                  value={targetSpectraMgfPath}
                  onChange={setTargetSpectraMgfPath}
                  placeholder="/path/to/target/target.mgf"
                  required={true}
                  description="The full path of the Target Spectra MGF file (mounted inside the container at /app/target/mgf/target.mgf)"
                  filters={[{ name: "MGF Files", extensions: ["mgf"] }]}
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
                        DNPS Path
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
                  value={targetDnpsPath}
                  onChange={setTargetDnpsPath}
                  placeholder="/path/to/target/result.mztab"
                  required={true}
                  description="The full path of the Target DNPS result file (mztab, mounted inside the container at /app/target/result.mztab)"
                  filters={[{ name: "MZTAB Files", extensions: ["mztab"] }]}
                />
              )}
            </div>

            {/* Decoy Spectra MGF File */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Decoy Spectra MGF File Source
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
                        MGF File Path
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
                        {decoyMgfSelector.foundFilePath}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <FileInput
                  label="Decoy Spectra MGF File"
                  value={decoySpectraMgfPath}
                  onChange={setDecoySpectraMgfPath}
                  placeholder="/path/to/decoy/decoy.mgf"
                  required={true}
                  description="The full path of the Decoy Spectra MGF file (mounted inside the container at /app/decoy/mgf/target.mgf)"
                  filters={[{ name: "MGF Files", extensions: ["mgf"] }]}
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
                        DNPS Path
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
                  value={decoyDnpsPath}
                  onChange={setDecoyDnpsPath}
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
            isRunning={isRunning || hasRunningProject}
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
          "Target Spectra MGF file",
          "Target DNPS result file (mztab)",
          "Decoy Spectra MGF file",
          "Decoy DNPS result file (mztab)",
          "Output folder path",
        ]}
      />
    </div>
  );
}

export default Step4;
