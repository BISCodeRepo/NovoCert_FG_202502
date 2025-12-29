import { useState } from "react";
import { PathInput, TextInput } from "../../components/form";

function Step1() {
  const [projectName, setProjectName] = useState("");
  const [inputPath, setInputPath] = useState("");
  const [outputPath, setOutputPath] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // 모든 필수 파라미터가 입력되었는지 확인
  const isFormValid = () => {
    return (
      projectName.trim() !== "" &&
      inputPath.trim() !== "" &&
      outputPath.trim() !== ""
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
        // uid와 gid는 선택사항 - 기본값 1000:1000 사용
      });

      if (result.success) {
        setMessage({
          type: 'success',
          text: `프로젝트 "${projectName}"가 생성되었고, Step 1이 실행 중입니다. (Container ID: ${result.containerId?.substring(0, 12)})`
        });
        console.log('Step1 실행 결과:', result);
      } else {
        setMessage({
          type: 'error',
          text: `Step 1 실행 실패: ${result.error}`
        });
      }
    } catch (error: unknown) {
      console.error('Step1 실행 중 에러:', error);
      setMessage({
        type: 'error',
        text: `예상치 못한 오류: ${error instanceof Error ? error.message : 'Unknown error'}`
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
              Step 설명
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                이 단계에서는 입력 데이터로부터 Decoy Spectra를 생성합니다.
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-700 mb-2">필요한 입력:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>프로젝트 이름</li>
                  <li>입력 폴더 경로 (bind mount to /app/input)</li>
                  <li>출력 폴더 경로 (bind mount to /app/output)</li>
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
              label="Input Folder Path"
              value={inputPath}
              onChange={setInputPath}
              placeholder="/path/to/input/folder"
              required={true}
              description="입력 데이터가 있는 폴더의 전체 경로 (컨테이너 내부 /app/input에 마운트됩니다)"
            />

            <PathInput
              label="Output Folder Path"
              value={outputPath}
              onChange={setOutputPath}
              placeholder="/path/to/output/folder"
              required={true}
              description="결과를 저장할 폴더의 전체 경로 (컨테이너 내부 /app/output에 마운트됩니다)"
            />
          </div>

          {/* Run Button */}
          <div className="mt-8 pt-6 border-t">
            <button
              onClick={handleRunStep1}
              disabled={!isFormValid() || isRunning}
              className={`w-full px-6 py-3 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-all ${
                isFormValid() && !isRunning
                  ? "bg-blue-600 text-white hover:bg-blue-700 cursor-pointer"
                  : "bg-gray-300 text-gray-500 cursor-not-allowed"
              }`}
            >
              {isRunning ? (
                <>
                  <svg
                    className="animate-spin h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  실행 중...
                </>
              ) : (
                <>
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
                      d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Run Step 1
                </>
              )}
            </button>
            {!isFormValid() && !isRunning && (
              <p className="mt-2 text-sm text-red-600 text-center">
                모든 필수 파라미터를 입력해주세요
              </p>
            )}
            {/* 결과 메시지 */}
            {message && (
              <div className={`mt-4 p-4 rounded-lg ${
                message.type === 'success' 
                  ? 'bg-green-50 border border-green-200' 
                  : 'bg-red-50 border border-red-200'
              }`}>
                <p className={`text-sm ${
                  message.type === 'success' ? 'text-green-800' : 'text-red-800'
                }`}>
                  {message.text}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Step1;
