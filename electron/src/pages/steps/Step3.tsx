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
import { filterTasksByExperiment, getNextTaskName, getTaskRootOutputPath, latestTaskForStep, resolveMgfPathFromStep1Task, TaskBranch } from "../../utils/experimentTasks";
import type { StepPageProps } from "../../types";
import type { Project } from "../../types/project";


function Step3(_: StepPageProps) {
  const { currentExperiment } = useExperiment();
  const [branch, setBranch] = useState<TaskBranch>("target");
  const [projectName, setProjectName] = useState("");
  const [spectraPath, setSpectraPath] = useState("");
  const [casanovoConfigPath, setCasanovoConfigPath] = useState("");
  const [modelPath, setModelPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [projectUuid, setProjectUuid] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [step3Tasks, setStep3Tasks] = useState<Project[]>([]);

  // Check for running tasks when page loads
  useStepRunningProject({
    step: 3,
    setProjectUuid,
    setContainerId,
    setProjectName,
  });

  // Check if there's a running project (polling status)
  const hasRunningProject = useStepRunningStatus(projectUuid);

  // Persist input values
  useEffect(() => {
    const saved = localStorage.getItem('step3_inputs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.spectraPath) setSpectraPath(parsed.spectraPath);
        if (parsed.casanovoConfigPath) setCasanovoConfigPath(parsed.casanovoConfigPath);
        if (parsed.modelPath) setModelPath(parsed.modelPath);
        if (parsed.outputPath) setOutputPath(parsed.outputPath);
      } catch (error) {
        console.error('Error loading saved Step3 inputs:', error);
      }
    }
  }, []);

  // Save input values when they change
  useEffect(() => {
    const inputs = {
      projectName,
      branch,
      spectraPath,
      casanovoConfigPath,
      modelPath,
      outputPath,
    };
    localStorage.setItem('step3_inputs', JSON.stringify(inputs));
  }, [projectName, branch, spectraPath, casanovoConfigPath, modelPath, outputPath]);

  useEffect(() => {
    const loadStep3Tasks = async () => {
      try {
        const allTasks = await window.db.getProjects();
        setStep3Tasks(
          filterTasksByExperiment(allTasks, currentExperiment?.uuid).filter((project) => String(project.step) === "3")
        );
      } catch (error) {
        console.error("Failed to load Step 3 tasks for name validation:", error);
      }
    };
    loadStep3Tasks();
  }, [currentExperiment?.uuid]);

  const refreshTaskInfo = useCallback(async () => {
    const allTasks = await window.db.getProjects();
    setStep3Tasks(
      filterTasksByExperiment(allTasks, currentExperiment?.uuid).filter((project) => String(project.step) === "3")
    );
    setProjectName(getNextTaskName(allTasks, currentExperiment?.uuid, currentExperiment?.name, 3, branch));
  }, [currentExperiment?.uuid, currentExperiment?.name, branch]);

  // MGF source state (replaces mgfSelector hook)
  const [mgfSourceType, setMgfSourceType] = useState<"step" | "custom">("step");
  const [step1Tasks, setStep1Tasks] = useState<Project[]>([]);
  const [selectedStep1TaskUuid, setSelectedStep1TaskUuid] = useState("");
  const [mgfFoundPath, setMgfFoundPath] = useState("");
  const [mgfError, setMgfError] = useState<string | null>(null);

  // Use Step2 task selector for Config file (no branch filter)
  const configSelector = useStepProjectSelector({
    step: 2,
    defaultSourceType: "step",
    extensions: ["yaml", "yml"],
    onFileFound: (path) => setCasanovoConfigPath(path),
  });

  // Load Step 1 tasks (no branch filter – step 1 runs only once)
  const loadStep1Tasks = useCallback(async () => {
    const allTasks = await window.db.getProjects();
    return filterTasksByExperiment(allTasks, currentExperiment?.uuid)
      .filter((t) => String(t.step) === "1");
  }, [currentExperiment?.uuid]);

  useEffect(() => {
    loadStep1Tasks().then(setStep1Tasks);
  }, [loadStep1Tasks]);

  const [step1InputPathPreview, setStep1InputPathPreview] = useState("");

  // Find MGF file from Step 1: target → inputPath (folder or .mgf file); decoy → step1 output folder
  useEffect(() => {
    const findMgf = async () => {
      if (mgfSourceType !== "step" || !selectedStep1TaskUuid) {
        setMgfFoundPath("");
        setSpectraPath("");
        setMgfError(null);
        setStep1InputPathPreview("");
        return;
      }
      const task = step1Tasks.find((t) => t.uuid === selectedStep1TaskUuid);
      if (!task) {
        setMgfFoundPath("");
        setSpectraPath("");
        setStep1InputPathPreview("");
        return;
      }

      if (branch === "target") {
        const raw = String(
          task.parameters?.inputPath ??
            (task.parameters?.step1 as { inputPath?: string } | undefined)?.inputPath ??
            ""
        ).trim();
        setStep1InputPathPreview(raw);
      } else {
        setStep1InputPathPreview("");
      }

      const resolved = await resolveMgfPathFromStep1Task(task, branch);
      if (resolved.path) {
        setMgfFoundPath(resolved.path);
        setSpectraPath(resolved.path);
        setMgfError(null);
      } else {
        setMgfFoundPath("");
        setSpectraPath("");
        setMgfError(resolved.error || "Could not resolve MGF path.");
      }
    };

    findMgf();
  }, [selectedStep1TaskUuid, branch, step1Tasks, mgfSourceType]);

  // Clear spectraPath when switching to custom MGF source
  useEffect(() => {
    if (mgfSourceType === "custom") {
      setMgfFoundPath("");
      setSelectedStep1TaskUuid("");
      setMgfError(null);
      setSpectraPath("");
      setStep1InputPathPreview("");
    }
  }, [mgfSourceType]);

  // Update casanovoConfigPath when selector finds file or switches to custom
  useEffect(() => {
    if (configSelector.sourceType === "custom") {
      setCasanovoConfigPath("");
    } else if (configSelector.foundFilePath) {
      setCasanovoConfigPath(configSelector.foundFilePath);
    }
  }, [configSelector.sourceType, configSelector.foundFilePath]);

  useEffect(() => {
    const applyPreviousStepDefaults = async () => {
      const allTasks = await window.db.getProjects();
      const tasks1 = await loadStep1Tasks();
      setStep1Tasks(tasks1);

      const step1Task = latestTaskForStep(allTasks, 1, currentExperiment?.uuid);
      const step2Task = latestTaskForStep(allTasks, 2, currentExperiment?.uuid);

      setSelectedStep1TaskUuid(step1Task?.uuid || "");
      configSelector.setSelectedProjectUuid(step2Task?.uuid || "");
      setProjectName(getNextTaskName(allTasks, currentExperiment?.uuid, currentExperiment?.name, 3, branch));

      if (!step2Task) {
        setOutputPath("");
        return;
      }

      setOutputPath(getTaskRootOutputPath(step2Task));
    };

    applyPreviousStepDefaults();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentExperiment?.uuid, currentExperiment?.name, branch]);

  const normalizedProjectName = projectName.trim().toLowerCase();
  const isDuplicateProjectName =
    normalizedProjectName !== "" &&
    step3Tasks.some(
      (project) => project.name.trim().toLowerCase() === normalizedProjectName
    );

  // Check if all required parameters are entered
  const isFormValid = () => {
    const spectraPathValid =
      mgfSourceType === "step"
        ? selectedStep1TaskUuid !== "" && mgfFoundPath !== "" && spectraPath.trim() !== ""
        : spectraPath.trim() !== "";

    const configPathValid =
      configSelector.sourceType === "step"
        ? configSelector.selectedProjectUuid !== "" &&
          configSelector.foundFilePath !== "" &&
          casanovoConfigPath.trim() !== ""
        : casanovoConfigPath.trim() !== "";

    return (
      projectName.trim() !== "" &&
      spectraPathValid &&
      configPathValid &&
      modelPath.trim() !== "" &&
      outputPath.trim() !== "" &&
      !isDuplicateProjectName
    );
  };

  // Run Step 3 button click handler
  const handleRunStep3 = async () => {
    if (!isFormValid()) {
      return;
    }
    const latestStep3Tasks = filterTasksByExperiment(await window.db.getProjects(), currentExperiment?.uuid).filter(
      (project) => String(project.step) === "3"
    );
    const isDuplicateAtRunTime = latestStep3Tasks.some(
      (project) =>
        project.name.trim().toLowerCase() === projectName.trim().toLowerCase()
    );
    if (isDuplicateAtRunTime) {
      setStep3Tasks(latestStep3Tasks);
      setMessage({
        type: "error",
        text: "A Step 3 task with the same name already exists. Please choose a different task name.",
      });
      return;
    }
    if (isDuplicateProjectName) {
      setMessage({
        type: "error",
        text: "A Step 3 task with the same name already exists. Please choose a different task name.",
      });
      return;
    }

    setIsRunning(true);
    setMessage(null);

    try {
      let finalSpectraPath = spectraPath.trim();
      if (mgfSourceType === "step") {
        const all = await window.db.getProjects();
        const step1Task = all.find((p) => p.uuid === selectedStep1TaskUuid);
        const resolved = await resolveMgfPathFromStep1Task(step1Task, branch);
        if (!resolved.path) {
          setMessage({
            type: "error",
            text: resolved.error || "Could not resolve MGF path from Step 1.",
          });
          setIsRunning(false);
          return;
        }
        finalSpectraPath = resolved.path;
      }

      const result = await window.step.runStep3({
        experimentUuid: currentExperiment?.uuid,
        branch,
        projectName,
        spectraPath: finalSpectraPath,
        casanovoConfigPath,
        modelPath,
        outputPath,
      });

      if (result.success && result.project) {
        setProjectUuid(result.project.uuid);
        setContainerId(result.containerId || null);
        setMessage(null);
        console.log("Step3 execution result:", result);
      } else {
        setMessage({
          type: "error",
          text: `Step 3 execution failed: ${result.error}`,
        });
      }
    } catch (error: unknown) {
      console.error("Step3 execution error:", error);
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
              <h2 className="text-2xl font-bold text-gray-900">Step 3</h2>
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
            <p className="text-sm text-gray-500">De novo Peptide Sequencing</p>
          </div>

<ExperimentDagStatus currentStep={3} refreshTrigger={projectUuid} />


        </div>
      </div>

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
                  This task name already exists in Step 3. Please enter a different name.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Spectra MGF File Source
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="mgfSource"
                    value="step"
                    checked={mgfSourceType === "step"}
                    onChange={() => setMgfSourceType("step")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Step1 Task</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="mgfSource"
                    value="custom"
                    checked={mgfSourceType === "custom"}
                    onChange={() => setMgfSourceType("custom")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Custom Path</span>
                </label>
              </div>

              {mgfSourceType === "step" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Step1 Task
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={selectedStep1TaskUuid}
                      onChange={(e) => setSelectedStep1TaskUuid(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Step1 Task</option>
                      {step1Tasks.map((project) => (
                        <option key={project.uuid} value={project.uuid}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedStep1TaskUuid && (
                    <div>
                      {mgfFoundPath ? (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            MGF File Path
                            <span className="text-red-500 ml-1">*</span>
                          </label>
                          <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
                            {mgfFoundPath}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            {branch === "target"
                              ? "MGF file resolved from Step 1 input path (parameters.inputPath): a folder is scanned for .mgf files; a path ending in .mgf is used as-is."
                              : "The MGF file from Step 1 output folder (generated decoy spectra)."}
                          </p>
                          {branch === "target" && step1InputPathPreview ? (
                            <p className="mt-2 text-xs text-gray-600">
                              <span className="font-medium text-gray-700">Step 1 input path:</span>{" "}
                              <span className="font-mono break-all">{step1InputPathPreview}</span>
                            </p>
                          ) : null}
                        </>
                      ) : null}
                      {mgfError && (
                        <p className="mt-2 text-sm text-red-600">{mgfError}</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <FileInput
                  label="Spectra MGF File Path"
                  value={spectraPath}
                  onChange={setSpectraPath}
                  placeholder="/path/to/spectra.mgf"
                  required={true}
                  description="The full path of the Spectra MGF file (mounted inside the container at /app/data/mgf/spectra.mgf)"
                  filters={[{ name: "MGF Files", extensions: ["mgf"] }]}
                />
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Casanovo Config File Source
                <span className="text-red-500 ml-1">*</span>
              </label>
              <div className="flex gap-4 mb-3">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="configSource"
                    value="step"
                    checked={configSelector.sourceType === "step"}
                    onChange={() => configSelector.setSourceType("step")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Step2 Task</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="configSource"
                    value="custom"
                    checked={configSelector.sourceType === "custom"}
                    onChange={() => configSelector.setSourceType("custom")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Custom Path</span>
                </label>
              </div>

              {configSelector.sourceType === "step" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Step2 Task
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={configSelector.selectedProjectUuid}
                      onChange={(e) => {
                        configSelector.setSelectedProjectUuid(e.target.value);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Step2 Task</option>
                      {configSelector.tasks.map((project) => (
                        <option key={project.uuid} value={project.uuid}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {configSelector.selectedProjectUuid && (
                    <div>
                      {configSelector.foundFilePath ? (
                        <>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Config File Path
                            <span className="text-red-500 ml-1">*</span>
                          </label>
                          <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
                            {configSelector.foundFilePath}
                          </div>
                          <p className="mt-1 text-xs text-gray-500">
                            The most recently created .yaml or .yml file in the output directory of the selected Step2 task has been automatically selected.
                          </p>
                        </>
                      ) : null}
                      {configSelector.error && (
                        <p className="mt-2 text-sm text-red-600">
                          {configSelector.error}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
            <FileInput
              label="Casanovo Config File Path"
              value={casanovoConfigPath}
              onChange={setCasanovoConfigPath}
              placeholder="/path/to/casanovo.yaml"
              required={true}
              description="The full path of the Casanovo configuration file (Step2 output, mounted inside the container at /app/data/casanovo.yaml)"
              filters={[{ name: "YAML Files", extensions: ["yaml", "yml"] }]}
            />
              )}
            </div>

            <FileInput
              label="Model File Path"
              value={modelPath}
              onChange={setModelPath}
              placeholder="/path/to/model.ckpt"
              required={true}
              description="The full path of the Casanovo model file (.ckpt, mounted inside the container at /app/data/model.ckpt)"
              filters={[{ name: "Model Files", extensions: ["ckpt"] }]}
            />

            <PathInput
              label="Output Folder Path"
              value={outputPath}
              onChange={setOutputPath}
              placeholder="/path/to/output/folder"
              required={true}
              description="The full path of the folder to save the results (mounted inside the container at /app/output/)"
            />
          </div>

          {/* Run Button */}
          <StepRunButton
            stepNumber={3}
            onClick={handleRunStep3}
            isFormValid={isFormValid()}
            isRunning={isRunning || hasRunningProject}
            message={message}
          />
          {/* Task Status Monitor */}
          <ProjectStatusMonitor
            projectUuid={projectUuid}
            projectName={projectName}
            containerId={containerId}
            stepNumber={3}
            onTaskComplete={refreshTaskInfo}
          />
        </div>
      </div>

      <StepDescriptionModal
        isOpen={isDescriptionModalOpen}
        onClose={() => setIsDescriptionModalOpen(false)}
        stepNumber={3}
        stepTitle="De novo Peptide Sequencing"
        description="In this step, Casanovo is used to perform de novo peptide sequencing."
        requiredInputs={[
          "Task name",
          "Spectra MGF file path",
          "Casanovo configuration file path (Step2 output)",
          "Model file path (.ckpt)",
          "Output folder path",
        ]}
      />
    </div>
  );
}

export default Step3;
