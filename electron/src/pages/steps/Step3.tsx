import { useState, useEffect } from "react";
import {
  PathInput,
  TextInput,
  FileInput,
  StepRunButton,
} from "../../components/form";
import ProjectStatusMonitor from "../../components/ProjectStatusMonitor";
import { useStepProjectSelector } from "../../hooks/useStepProjectSelector";

function Step3() {
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

  // Use Step1 project selector for MGF file
  const mgfSelector = useStepProjectSelector({
    step: 1,
    defaultSourceType: "step",
    extensions: ["mgf"],
    onFileFound: (path) => setSpectraPath(path),
    onError: (error) =>
      setMessage({ type: "error", text: error }),
  });

  // Use Step2 project selector for Config file
  const configSelector = useStepProjectSelector({
    step: 2,
    defaultSourceType: "step",
    extensions: ["yaml", "yml"],
    onFileFound: (path) => setCasanovoConfigPath(path),
    onError: (error) =>
      setMessage({ type: "error", text: error }),
  });

  // Update spectraPath when selector finds file or switches to custom
  useEffect(() => {
    if (mgfSelector.sourceType === "custom") {
      setSpectraPath("");
    } else if (mgfSelector.foundFilePath) {
      setSpectraPath(mgfSelector.foundFilePath);
    }
  }, [mgfSelector.sourceType, mgfSelector.foundFilePath]);

  // Update casanovoConfigPath when selector finds file or switches to custom
  useEffect(() => {
    if (configSelector.sourceType === "custom") {
      setCasanovoConfigPath("");
    } else if (configSelector.foundFilePath) {
      setCasanovoConfigPath(configSelector.foundFilePath);
    }
  }, [configSelector.sourceType, configSelector.foundFilePath]);

  // Check if all required parameters are entered
  const isFormValid = () => {
    const spectraPathValid =
      mgfSelector.sourceType === "step"
        ? mgfSelector.selectedProjectUuid !== "" &&
          spectraPath.trim() !== ""
        : spectraPath.trim() !== "";

    const configPathValid =
      configSelector.sourceType === "step"
        ? configSelector.selectedProjectUuid !== "" &&
          casanovoConfigPath.trim() !== ""
        : casanovoConfigPath.trim() !== "";

    return (
      projectName.trim() !== "" &&
      spectraPathValid &&
      configPathValid &&
      modelPath.trim() !== "" &&
      outputPath.trim() !== ""
    );
  };

  // Run Step 3 button click handler
  const handleRunStep3 = async () => {
    if (!isFormValid()) {
      return;
    }

    setIsRunning(true);
    setMessage(null);

    try {
      // If the Step1 task is selected, use the actual spectraPath which is already selected
      const finalSpectraPath = spectraPath;

      const result = await window.step.runStep3({
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 3</h2>
            <p className="text-sm text-gray-500">De-novo Peptide Sequencing</p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Step Description
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                In this step, Casanovo is used to perform de-novo peptide sequencing.
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-700 mb-2">Required input:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Project name</li>
                  <li>Spectra MGF file path</li>
                  <li>Casanovo configuration file path (Step2 output)</li>
                  <li>Model file path (.ckpt)</li>
                  <li>Output folder path</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex gap-2">
              <svg
                className="w-5 h-5 text-yellow-600 flex-shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <p className="text-xs text-yellow-800">
                Please click the Run button after entering all parameters.
              </p>
            </div>
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
                    checked={mgfSelector.sourceType === "step"}
                    onChange={() => mgfSelector.setSourceType("step")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Step1 Project</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="mgfSource"
                    value="custom"
                    checked={mgfSelector.sourceType === "custom"}
                    onChange={() => mgfSelector.setSourceType("custom")}
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Custom Path</span>
                </label>
              </div>

              {mgfSelector.sourceType === "step" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Step1 Project
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={mgfSelector.selectedProjectUuid}
                      onChange={(e) => {
                        mgfSelector.setSelectedProjectUuid(e.target.value);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Step1 Project</option>
                      {mgfSelector.projects.map((project) => (
                        <option key={project.uuid} value={project.uuid}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {mgfSelector.selectedProjectUuid && mgfSelector.foundFilePath && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        MGF 파일 경로
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
                        {mgfSelector.foundFilePath}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        The most recently created .mgf file in the output directory of the selected Step1 project has been automatically selected.
                      </p>
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
                  <span className="text-sm text-gray-700">Step2 Project</span>
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
                      Select Step2 Project
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={configSelector.selectedProjectUuid}
                      onChange={(e) => {
                        configSelector.setSelectedProjectUuid(e.target.value);
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Step2 Project</option>
                      {configSelector.projects.map((project) => (
                        <option key={project.uuid} value={project.uuid}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {configSelector.selectedProjectUuid && configSelector.foundFilePath && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Config 파일 경로
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
                        {configSelector.foundFilePath}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        The most recently created .yaml or .yml file in the output directory of the selected Step2 project has been automatically selected.
                      </p>
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
            isRunning={isRunning}
            message={message}
          />
          {/* Project Status Monitor */}
          <ProjectStatusMonitor 
            projectUuid={projectUuid}
            projectName={projectName}
            containerId={containerId}
            stepNumber={3}
          />
        </div>
      </div>
    </div>
  );
}

export default Step3;
