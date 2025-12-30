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
          text: `프로젝트 "${projectName}"가 생성되었고, Step 2가 실행 중입니다. (Container ID: ${result.containerId?.substring(
            0,
            12
          )})`,
        });
        console.log("Step2 실행 결과:", result);
      } else {
        setMessage({
          type: "error",
          text: `Step 2 실행 실패: ${result.error}`,
        });
      }
    } catch (error: unknown) {
      console.error("Step2 실행 중 에러:", error);
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 2</h2>
            <p className="text-sm text-gray-500">Download Casanovo Config</p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Step Description
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>이 단계에서는 Casanovo 설정 파일을 다운로드합니다.</p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-700 mb-2">필요한 입력:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>프로젝트 이름</li>
                  <li>출력 폴더 경로 (bind mount to /app/output/)</li>
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
                모든 파라미터를 입력한 후 실행 버튼을 클릭하세요.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 오른쪽: 파라미터 입력 */}
      <div className="flex-1">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">
            파라미터 설정
          </h2>

          <div className="space-y-6">
            <TextInput
              label="Project Name"
              value={projectName}
              onChange={setProjectName}
              placeholder="프로젝트 이름 입력"
              required={true}
              description="새로 시작할 프로젝트의 이름을 입력하세요"
            />

            <PathInput
              label="Output Folder Path"
              value={outputPath}
              onChange={setOutputPath}
              placeholder="/path/to/output/folder"
              required={true}
              description="Casanovo 설정 파일을 저장할 폴더의 전체 경로 (컨테이너 내부 /app/output/에 마운트됩니다)"
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
