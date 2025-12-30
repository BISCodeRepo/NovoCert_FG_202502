import { useState, useEffect } from "react";
import {
  PathInput,
  TextInput,
  FileInput,
  StepRunButton,
} from "../../components/form";
import type { Project, Task } from "../../types";

function Step3() {
  const [projectName, setProjectName] = useState("");
  const [mgfSourceType, setMgfSourceType] = useState<"step1" | "custom">(
    "custom"
  );
  const [step1Projects, setStep1Projects] = useState<Project[]>([]);
  const [selectedStep1ProjectUuid, setSelectedStep1ProjectUuid] =
    useState<string>("");
  const [step1Tasks, setStep1Tasks] = useState<Task[]>([]);
  const [selectedStep1TaskUuid, setSelectedStep1TaskUuid] =
    useState<string>("");
  const [spectraPath, setSpectraPath] = useState("");
  const [casanovoConfigPath, setCasanovoConfigPath] = useState("");
  const [modelPath, setModelPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // Get the Step1 projects
  useEffect(() => {
    const loadStep1Projects = async () => {
      try {
        const projects = await window.db.getProjects();
        const tasks = await window.db.getTasks();

        // Filter projects that have Step1 tasks
        const step1ProjectsList: Project[] = [];
        for (const project of projects) {
          const projectTasks = tasks.filter(
            (task) => task.project_uuid === project.uuid && task.step === "1"
          );
          if (projectTasks.length > 0) {
            step1ProjectsList.push(project);
          }
        }

        setStep1Projects(step1ProjectsList);
      } catch (error) {
        console.error("Step1 프로젝트 조회 실패:", error);
      }
    };

    if (mgfSourceType === "step1") {
      loadStep1Projects();
    }
  }, [mgfSourceType]);

  // Get the Step1 task of the selected project
  useEffect(() => {
    const loadStep1Tasks = async () => {
      if (!selectedStep1ProjectUuid) {
        setStep1Tasks([]);
        setSelectedStep1TaskUuid("");
        return;
      }

      try {
        const tasks = await window.db.getTasksByProject(
          selectedStep1ProjectUuid
        );
        const step1TaskList = tasks.filter((task) => task.step === "1");
        setStep1Tasks(step1TaskList);
        setSelectedStep1TaskUuid(""); // Reset task when project changes
      } catch (error) {
        console.error("Step1 task 조회 실패:", error);
      }
    };

    if (mgfSourceType === "step1" && selectedStep1ProjectUuid) {
      loadStep1Tasks();
    }
  }, [mgfSourceType, selectedStep1ProjectUuid]);

  // Find the most recently modified .mgf file in the outputPath directory of the selected Step1 task
  useEffect(() => {
    const findLatestMgfFile = async () => {
      if (mgfSourceType === "step1" && selectedStep1TaskUuid) {
        const selectedTask = step1Tasks.find(
          (task) => task.uuid === selectedStep1TaskUuid
        );
        if (selectedTask?.parameters?.outputPath) {
          const outputPath = selectedTask.parameters.outputPath as string;
          try {
            // Find the most recently modified .mgf file in the outputPath directory
            const result = await window.fs.findLatestFile(outputPath, "mgf");
            if (result.success && result.path) {
              setSpectraPath(result.path);
            } else {
              setSpectraPath("");
              setMessage({
                type: "error",
                text: result.error || "MGF file not found",
              });
            }
          } catch (error) {
            console.error("MGF file lookup failed:", error);
            setSpectraPath("");
            setMessage({
              type: "error",
              text: "Error occurred while looking for MGF file",
            });
          }
        }
      } else if (mgfSourceType === "custom") {
        setSpectraPath("");
      }
    };

    findLatestMgfFile();
  }, [mgfSourceType, selectedStep1TaskUuid, step1Tasks]);

  // Check if all required parameters are entered
  const isFormValid = () => {
    const spectraPathValid =
      mgfSourceType === "step1"
        ? selectedStep1ProjectUuid !== "" &&
          selectedStep1TaskUuid !== "" &&
          spectraPath.trim() !== ""
        : spectraPath.trim() !== "";

    return (
      projectName.trim() !== "" &&
      spectraPathValid &&
      casanovoConfigPath.trim() !== "" &&
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

      if (result.success) {
        setMessage({
          type: "success",
          text: `Project "${projectName}" has been created and Step 3 is running. (Container ID: ${result.containerId?.substring(
            0,
            12
          )})`,
        });
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
                    value="step1"
                    checked={mgfSourceType === "step1"}
                    onChange={(e) =>
                      setMgfSourceType(e.target.value as "step1" | "custom")
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Step1 Project</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="mgfSource"
                    value="custom"
                    checked={mgfSourceType === "custom"}
                    onChange={(e) =>
                      setMgfSourceType(e.target.value as "step1" | "custom")
                    }
                    className="mr-2"
                  />
                  <span className="text-sm text-gray-700">Custom Path</span>
                </label>
              </div>

              {mgfSourceType === "step1" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Step1 Project
                      <span className="text-red-500 ml-1">*</span>
                    </label>
                    <select
                      value={selectedStep1ProjectUuid}
                      onChange={(e) => {
                        setSelectedStep1ProjectUuid(e.target.value);
                        setSelectedStep1TaskUuid(""); // 프로젝트 변경 시 task 초기화
                        setSpectraPath(""); // 파일 경로도 초기화
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Step1 Project</option>
                      {step1Projects.map((project) => (
                        <option key={project.uuid} value={project.uuid}>
                          {project.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedStep1ProjectUuid && step1Tasks.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Select Step1 Task
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <select
                        value={selectedStep1TaskUuid}
                        onChange={(e) => {
                          setSelectedStep1TaskUuid(e.target.value);
                          setSpectraPath(""); // Reset file path when task changes
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="">Select Step1 Task</option>
                        {step1Tasks.map((task) => (
                          <option key={task.uuid} value={task.uuid}>
                            Task {task.uuid.substring(0, 8)}... ({task.status})
                            - {new Date(task.created_at).toLocaleString()}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {selectedStep1TaskUuid && spectraPath && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        MGF 파일 경로
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700">
                        {spectraPath}
                      </div>
                      <p className="mt-1 text-xs text-gray-500">
                        The most recently created .mgf file in the output directory of the selected Step1 task has been automatically selected.
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

            <FileInput
              label="Casanovo Config File Path"
              value={casanovoConfigPath}
              onChange={setCasanovoConfigPath}
              placeholder="/path/to/casanovo.yaml"
              required={true}
              description="The full path of the Casanovo configuration file (Step2 output, mounted inside the container at /app/data/casanovo.yaml)"
              filters={[{ name: "YAML Files", extensions: ["yaml", "yml"] }]}
            />

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
        </div>
      </div>
    </div>
  );
}

export default Step3;
