import { useState } from "react";
import { PathInput, TextInput, StepRunButton } from "../../components/form";

function Step2() {
  const [projectName, setProjectName] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  // 모든 필수 파라미터가 입력되었는지 확인
  const isFormValid = () => {
    return projectName.trim() !== "" && outputPath.trim() !== "";
  };

  // Run Step 2 버튼 클릭 핸들러
  const handleRunStep2 = async () => {
    if (!isFormValid()) {
      return;
    }

    setIsRunning(true);
    setMessage(null);

    try {
      const result = await window.step.runStep2({
        projectName,
        outputPath,
      });

      if (result.success) {
        setMessage({
          type: "success",
          text: `Project "${projectName}" has been created and Step 2 is running. (Container ID: ${result.containerId?.substring(
            0,
            12
          )})`,
        });
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 2</h2>
            <p className="text-sm text-gray-500">Download Casanovo Config</p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Step Description
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>In this step, the Casanovo configuration file is downloaded.</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-700 mb-2">Required input:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Project name</li>
                  <li>Output folder path (bind mount to /app/output/)</li>
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

      {/* Right: Parameter input */}
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
              label="Output Folder Path"
              value={outputPath}
              onChange={setOutputPath}
              placeholder="/path/to/output/folder"
              required={true}
              description="The full path of the folder to save the Casanovo configuration file (mounted inside the container at /app/output/)"
            />
          </div>

          {/* Run Button */}
          <StepRunButton
            stepNumber={2}
            onClick={handleRunStep2}
            isFormValid={isFormValid()}
            isRunning={isRunning}
            message={message}
          />
        </div>
      </div>
    </div>
  );
}

export default Step2;
