import { useState } from "react";
import {
  PathInput,
  TextInput,
  NumberInput,
  StepRunButton,
} from "../../components/form";
import ProjectStatusMonitor from "../../components/ProjectStatusMonitor";

function Step1() {
  const [projectName, setProjectName] = useState("");
  const [inputPath, setInputPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [memory, setMemory] = useState("8");
  const [precursorTolerance, setPrecursorTolerance] = useState("16");
  const [randomSeed, setRandomSeed] = useState("32");
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [projectUuid, setProjectUuid] = useState<string | null>(null);
  const [containerId, setContainerId] = useState<string | null>(null);

  // Check if all required parameters are entered
  const isFormValid = () => {
    return (
      projectName.trim() !== "" &&
      inputPath.trim() !== "" &&
      outputPath.trim() !== "" &&
      memory.trim() !== "" &&
      precursorTolerance.trim() !== "" &&
      randomSeed.trim() !== ""
    );
  };

  // Run Step 1 버튼 클릭 핸들러
  const handleRunStep1 = async () => {
    if (!isFormValid()) {
      return;
    }

    setIsRunning(true);
    setMessage(null);

    try {
      const result = await window.step.runStep1({
        projectName,
        inputPath,
        outputPath,
        memory: memory.trim(),
        precursorTolerance: precursorTolerance.trim(),
        randomSeed: randomSeed.trim(),
      });

      if (result.success && result.project) {
        setProjectUuid(result.project.uuid);
        setContainerId(result.containerId || null);
        setMessage(null);
        console.log("Step1 실행 결과:", result);
      } else {
        setMessage({
          type: "error",
          text: `Step 1 실행 실패: ${result.error}`,
        });
      }
    } catch (error: unknown) {
      console.error("Step1 실행 중 에러:", error);
      setMessage({
        type: "error",
        text: `예상치 못한 오류: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
      });
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="h-full flex gap-6">
      {/* 왼쪽: 프로젝트 및 Step 정보 */}
      <div className="w-1/3">
        <div className="bg-white rounded-lg shadow-sm p-6 sticky top-0">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 1</h2>
            <p className="text-sm text-gray-500">Decoy Spectra Generation</p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Step Description
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>In this step, Decoy Spectra are generated from the input data.</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-700 mb-2">Required Input:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Project Name</li>
                  <li>Input Folder Path (bind mount to /app/input)</li>
                  <li>Output Folder Path (bind mount to /app/output)</li>
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
                Please enter all parameters and click the Run button.
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

            <PathInput
              label="Input Folder Path"
              value={inputPath}
              onChange={setInputPath}
              placeholder="/path/to/input/folder"
              required={true}
              description="The full path of the folder containing the input data (mounted inside the container at /app/input)"
            />

            <PathInput
              label="Output Folder Path"
              value={outputPath}
              onChange={setOutputPath}
              placeholder="/path/to/output/folder"
              required={true}
              description="The full path of the folder to save the results (mounted inside the container at /app/output)"
            />

            <NumberInput
              label="Memory"
              value={memory}
              onChange={setMemory}
              placeholder="4"
              required={true}
              description="Memory allocation (integer, unit: GB) - passed as MEMORY environment variable (e.g. 4 → 4G)"
            />

            <NumberInput
              label="Precursor Tolerance"
              value={precursorTolerance}
              onChange={setPrecursorTolerance}
              placeholder="20"
              required={true}
              description="Precursor Tolerance value (integer) - passed as PRECURSOR_TOLERANCE environment variable"
            />

            <NumberInput
              label="Random Seed"
              value={randomSeed}
              onChange={setRandomSeed}
              placeholder="100"
              required={true}
              description="Random seed value (integer) - passed as RANDOM_SEED environment variable"
            />
          </div>

          {/* Run Button */}
          <StepRunButton
            stepNumber={1}
            onClick={handleRunStep1}
            isFormValid={isFormValid()}
            isRunning={isRunning}
            message={message}
          />
          {/* Project Status Monitor */}
          <ProjectStatusMonitor 
            projectUuid={projectUuid}
            projectName={projectName}
            containerId={containerId}
            stepNumber={1}
          />
        </div>
      </div>
    </div>
  );
}

export default Step1;
