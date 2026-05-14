import { useState, useEffect, useCallback } from "react";
import {
  PathInput,
  TextInput,
  FileInput,
  StepRunButton,
} from "../../components/form";
import ProjectStatusMonitor from "../../components/ProjectStatusMonitor";
import ExperimentDagStatus from "../../components/ExperimentDagStatus";
import { useStepProjectSelector } from "../../hooks/useStepProjectSelector";
import { useStepRunningProject } from "../../hooks/useStepRunningProject";
import { useStepRunningStatus } from "../../hooks/useStepRunningStatus";
import StepDescriptionModal from "../../components/StepDescriptionModal";
import { useExperiment } from "../../contexts/ExperimentContext";
import { filterTasksByExperiment, getNextTaskName, getTaskRootOutputPath, latestTaskForStep, resolveMgfPathFromStep1Task } from "../../utils/experimentTasks";
import type { StepPageProps } from "../../types";
import type { Project } from "../../types/project";

function Step4(_: StepPageProps) {
  const { currentExperiment } = useExperiment();
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
  const [step4Tasks, setStep4Tasks] = useState<Project[]>([]);

  // Check for running tasks when page loads
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

  useEffect(() => {
    const loadStep4Tasks = async () => {
      try {
        const allTasks = await window.db.getProjects();
        setStep4Tasks(
          filterTasksByExperiment(allTasks, currentExperiment?.uuid).filter((project) => String(project.step) === "4")
        );
      } catch (error) {
        console.error("Failed to load Step 4 tasks for name validation:", error);
      }
    };
    loadStep4Tasks();
  }, [currentExperiment?.uuid]);

  // Target MGF: resolved from Step 1 inputPath (not outputPath)
  const targetMgfSelector = useStepProjectSelector({
    step: 1,
    defaultSourceType: "step",
    successOnly: true,
    // no extensions — path resolution handled manually via resolveMgfPathFromStep1Task
  });

  // Decoy MGF: resolved from Step 1 outputPath (generated decoy)
  const decoyMgfSelector = useStepProjectSelector({
    step: 1,
    defaultSourceType: "step",
    extensions: ["mgf"],
    successOnly: true,
    onFileFound: (path) => setDecoySpectraMgfPath(path),
    onError: (error) =>
      setMessage({ type: "error", text: error }),
  });

  // Use Step3 task selector for Target DNPS Result File
  const targetResultSelector = useStepProjectSelector({
    step: 3,
    defaultSourceType: "step",
    extensions: ["mztab"],
    branch: "target",
    successOnly: true,
    onFileFound: (path) => setTargetDnpsPath(path),
    onError: (error) =>
      setMessage({ type: "error", text: error }),
  });

  // Use Step3 task selector for Decoy DNPS Result File
  const decoyResultSelector = useStepProjectSelector({
    step: 3,
    defaultSourceType: "step",
    extensions: ["mztab"],
    branch: "decoy",
    successOnly: true,
    onFileFound: (path) => setDecoyDnpsPath(path),
    onError: (error) =>
      setMessage({ type: "error", text: error }),
  });

  useEffect(() => {
    const applyPreviousStepDefaults = async () => {
      const allTasks = await window.db.getProjects();
      // Step1 has no branch — use the latest successful Step1 task for both MGF selectors
      const step1Task = latestTaskForStep(allTasks, 1, currentExperiment?.uuid);
      const targetStep3Task = latestTaskForStep(allTasks, 3, currentExperiment?.uuid, "target");
      const decoyStep3Task = latestTaskForStep(allTasks, 3, currentExperiment?.uuid, "decoy");

      targetMgfSelector.setSelectedProjectUuid(step1Task?.uuid || "");
      decoyMgfSelector.setSelectedProjectUuid(step1Task?.uuid || "");
      targetResultSelector.setSelectedProjectUuid(targetStep3Task?.uuid || "");
      decoyResultSelector.setSelectedProjectUuid(decoyStep3Task?.uuid || "");
      setProjectName(getNextTaskName(allTasks, currentExperiment?.uuid, currentExperiment?.name, 4));

      if (!targetStep3Task) {
        setOutputPath("");
        return;
      }

      setOutputPath(getTaskRootOutputPath(targetStep3Task));
    };

    applyPreviousStepDefaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExperiment?.uuid, currentExperiment?.name]);

  // Resolve target MGF path from Step 1 inputPath whenever the selected task changes
  useEffect(() => {
    const resolve = async () => {
      if (targetMgfSelector.sourceType !== "step" || !targetMgfSelector.selectedProjectUuid) {
        return;
      }
      const task = targetMgfSelector.tasks.find(
        (t) => t.uuid === targetMgfSelector.selectedProjectUuid
      );
      const result = await resolveMgfPathFromStep1Task(task, "target");
      if (result.path) {
        setTargetSpectraMgfPath(result.path);
      } else {
        setTargetSpectraMgfPath("");
        if (result.error) setMessage({ type: "error", text: result.error });
      }
    };
    resolve();
  }, [targetMgfSelector.selectedProjectUuid, targetMgfSelector.sourceType, targetMgfSelector.tasks]);

  const refreshTaskInfo = useCallback(async () => {
    const allTasks = await window.db.getProjects();
    setStep4Tasks(
      filterTasksByExperiment(allTasks, currentExperiment?.uuid).filter((project) => String(project.step) === "4")
    );
    setProjectName(getNextTaskName(allTasks, currentExperiment?.uuid, currentExperiment?.name, 4));
  }, [currentExperiment?.uuid, currentExperiment?.name]);

  // Sync path state from step selectors (only when a file is resolved from a step task)
  useEffect(() => {
    if (targetMgfSelector.sourceType === "step" && targetMgfSelector.foundFilePath) {
      setTargetSpectraMgfPath(targetMgfSelector.foundFilePath);
    }
  }, [targetMgfSelector.sourceType, targetMgfSelector.foundFilePath]);

  useEffect(() => {
    if (decoyMgfSelector.sourceType === "step" && decoyMgfSelector.foundFilePath) {
      setDecoySpectraMgfPath(decoyMgfSelector.foundFilePath);
    }
  }, [decoyMgfSelector.sourceType, decoyMgfSelector.foundFilePath]);

  useEffect(() => {
    if (targetResultSelector.sourceType === "step" && targetResultSelector.foundFilePath) {
      setTargetDnpsPath(targetResultSelector.foundFilePath);
    }
  }, [targetResultSelector.sourceType, targetResultSelector.foundFilePath]);

  useEffect(() => {
    if (decoyResultSelector.sourceType === "step" && decoyResultSelector.foundFilePath) {
      setDecoyDnpsPath(decoyResultSelector.foundFilePath);
    }
  }, [decoyResultSelector.sourceType, decoyResultSelector.foundFilePath]);

  const normalizedProjectName = projectName.trim().toLowerCase();
  const isDuplicateProjectName =
    normalizedProjectName !== "" &&
    step4Tasks.some(
      (project) => project.name.trim().toLowerCase() === normalizedProjectName
    );

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
      outputPath.trim() !== "" &&
      !isDuplicateProjectName
    );
  };

  // Run Step 4 button click handler
  const handleRunStep4 = async () => {
    if (!isFormValid()) {
      return;
    }
    const latestStep4Tasks = filterTasksByExperiment(await window.db.getProjects(), currentExperiment?.uuid).filter(
      (project) => String(project.step) === "4"
    );
    const isDuplicateAtRunTime = latestStep4Tasks.some(
      (project) =>
        project.name.trim().toLowerCase() === projectName.trim().toLowerCase()
    );
    if (isDuplicateAtRunTime) {
      setStep4Tasks(latestStep4Tasks);
      setMessage({
        type: "error",
        text: "A Step 4 task with the same name already exists. Please choose a different task name.",
      });
      return;
    }
    if (isDuplicateProjectName) {
      setMessage({
        type: "error",
        text: "A Step 4 task with the same name already exists. Please choose a different task name.",
      });
      return;
    }

    setIsRunning(true);
    setMessage(null);

    try {
      const result = await window.step.runStep4({
        experimentUuid: currentExperiment?.uuid,
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

<ExperimentDagStatus currentStep={4} refreshTrigger={projectUuid} />
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
                  This task name already exists in Step 4. Please enter a different name.
                </p>
              )}
            </div>

            {/* Target Spectra MGF File */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Spectra MGF File Source
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex gap-4 mb-3">
                <label className={`flex items-center ${targetMgfSelector.hasNoSuccessTasks ? "opacity-40 cursor-not-allowed" : ""}`}>
                  <input
                    type="radio"
                    name="targetMgfSource"
                    value="step"
                    checked={targetMgfSelector.sourceType === "step"}
                    disabled={targetMgfSelector.hasNoSuccessTasks}
                    onChange={() => targetMgfSelector.setSourceType("step")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Step1 Task</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="targetMgfSource"
                    value="custom"
                    checked={targetMgfSelector.sourceType === "custom"}
                    onChange={() => { targetMgfSelector.setSourceType("custom"); setTargetSpectraMgfPath(""); }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Custom Path</span>
                </label>
              </div>
              {targetMgfSelector.hasNoSuccessTasks && (
                <p className="text-xs text-amber-600 mb-2">No successful Step 1 tasks found. Please enter a custom path.</p>
              )}

              {targetMgfSelector.sourceType === "step" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Step1 Task
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={targetMgfSelector.selectedProjectUuid}
                      onChange={(e) => {
                        targetMgfSelector.setSelectedProjectUuid(e.target.value);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Step1 Task</option>
                      {targetMgfSelector.tasks.map((project) => (
                        <option key={project.uuid} value={project.uuid}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {targetMgfSelector.selectedProjectUuid && targetSpectraMgfPath && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        MGF File Path (from Step 1 input)
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
                        {targetSpectraMgfPath}
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
                <label className={`flex items-center ${targetResultSelector.hasNoSuccessTasks ? "opacity-40 cursor-not-allowed" : ""}`}>
                  <input
                    type="radio"
                    name="targetResultSource"
                    value="step"
                    checked={targetResultSelector.sourceType === "step"}
                    disabled={targetResultSelector.hasNoSuccessTasks}
                    onChange={() => targetResultSelector.setSourceType("step")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Step3 Task</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="targetResultSource"
                    value="custom"
                    checked={targetResultSelector.sourceType === "custom"}
                    onChange={() => { targetResultSelector.setSourceType("custom"); setTargetDnpsPath(""); }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Custom Path</span>
                </label>
              </div>
              {targetResultSelector.hasNoSuccessTasks && (
                <p className="text-xs text-amber-600 mb-2">No successful Step 3 (target) tasks found. Please enter a custom path.</p>
              )}

              {targetResultSelector.sourceType === "step" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Step3 Task
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={targetResultSelector.selectedProjectUuid}
                      onChange={(e) => {
                        targetResultSelector.setSelectedProjectUuid(e.target.value);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Step3 Task</option>
                      {targetResultSelector.tasks.map((project) => (
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
                <label className={`flex items-center ${decoyMgfSelector.hasNoSuccessTasks ? "opacity-40 cursor-not-allowed" : ""}`}>
                  <input
                    type="radio"
                    name="decoyMgfSource"
                    value="step"
                    checked={decoyMgfSelector.sourceType === "step"}
                    disabled={decoyMgfSelector.hasNoSuccessTasks}
                    onChange={() => decoyMgfSelector.setSourceType("step")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Step1 Task</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="decoyMgfSource"
                    value="custom"
                    checked={decoyMgfSelector.sourceType === "custom"}
                    onChange={() => { decoyMgfSelector.setSourceType("custom"); setDecoySpectraMgfPath(""); }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Custom Path</span>
                </label>
              </div>
              {decoyMgfSelector.hasNoSuccessTasks && (
                <p className="text-xs text-amber-600 mb-2">No successful Step 1 tasks found. Please enter a custom path.</p>
              )}

              {decoyMgfSelector.sourceType === "step" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Step1 Task
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={decoyMgfSelector.selectedProjectUuid}
                      onChange={(e) => {
                        decoyMgfSelector.setSelectedProjectUuid(e.target.value);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Step1 Task</option>
                      {decoyMgfSelector.tasks.map((project) => (
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
                <label className={`flex items-center ${decoyResultSelector.hasNoSuccessTasks ? "opacity-40 cursor-not-allowed" : ""}`}>
                  <input
                    type="radio"
                    name="decoyResultSource"
                    value="step"
                    checked={decoyResultSelector.sourceType === "step"}
                    disabled={decoyResultSelector.hasNoSuccessTasks}
                    onChange={() => decoyResultSelector.setSourceType("step")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Step3 Task</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="decoyResultSource"
                    value="custom"
                    checked={decoyResultSelector.sourceType === "custom"}
                    onChange={() => { decoyResultSelector.setSourceType("custom"); setDecoyDnpsPath(""); }}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Custom Path</span>
                </label>
              </div>
              {decoyResultSelector.hasNoSuccessTasks && (
                <p className="text-xs text-amber-600 mb-2">No successful Step 3 (decoy) tasks found. Please enter a custom path.</p>
              )}

              {decoyResultSelector.sourceType === "step" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Step3 Task
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={decoyResultSelector.selectedProjectUuid}
                      onChange={(e) => {
                        decoyResultSelector.setSelectedProjectUuid(e.target.value);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Step3 Task</option>
                      {decoyResultSelector.tasks.map((project) => (
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
          {/* Task Status Monitor */}
          <ProjectStatusMonitor 
            projectUuid={projectUuid}
            projectName={projectName}
            containerId={containerId}
            stepNumber={4}
            onTaskComplete={refreshTaskInfo}
          />
        </div>
      </div>

      <StepDescriptionModal
        isOpen={isDescriptionModalOpen}
        onClose={() => setIsDescriptionModalOpen(false)}
        stepNumber={4}
        stepTitle="Feature calculation(SA, delta retention time etc.)"
        description="In this step, Feature Calculation is performed (using p3 image)."
        requiredInputs={[
          "Task name",
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
