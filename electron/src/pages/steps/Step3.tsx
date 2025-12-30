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

  // Step1 프로젝트 조회
  useEffect(() => {
    const loadStep1Projects = async () => {
      try {
        const projects = await window.db.getProjects();
        const tasks = await window.db.getTasks();

        // Step1 task가 있는 프로젝트 필터링
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

  // 선택된 프로젝트의 Step1 task 조회
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
        setSelectedStep1TaskUuid(""); // 프로젝트 변경 시 task 초기화
      } catch (error) {
        console.error("Step1 task 조회 실패:", error);
      }
    };

    if (mgfSourceType === "step1" && selectedStep1ProjectUuid) {
      loadStep1Tasks();
    }
  }, [mgfSourceType, selectedStep1ProjectUuid]);

  // 선택된 Step1 task의 outputPath에서 가장 최근 .mgf 파일 찾기
  useEffect(() => {
    const findLatestMgfFile = async () => {
      if (mgfSourceType === "step1" && selectedStep1TaskUuid) {
        const selectedTask = step1Tasks.find(
          (task) => task.uuid === selectedStep1TaskUuid
        );
        if (selectedTask?.parameters?.outputPath) {
          const outputPath = selectedTask.parameters.outputPath as string;
          try {
            // outputPath 디렉토리에서 가장 최근 .mgf 파일 찾기
            const result = await window.fs.findLatestFile(outputPath, "mgf");
            if (result.success && result.path) {
              setSpectraPath(result.path);
            } else {
              setSpectraPath("");
              setMessage({
                type: "error",
                text: result.error || "MGF 파일을 찾을 수 없습니다",
              });
            }
          } catch (error) {
            console.error("MGF 파일 조회 실패:", error);
            setSpectraPath("");
            setMessage({
              type: "error",
              text: "MGF 파일 조회 중 오류가 발생했습니다",
            });
          }
        }
      } else if (mgfSourceType === "custom") {
        setSpectraPath("");
      }
    };

    findLatestMgfFile();
  }, [mgfSourceType, selectedStep1TaskUuid, step1Tasks]);

  // 모든 필수 파라미터가 입력되었는지 확인
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

  // Run Step 3 버튼 클릭 핸들러
  const handleRunStep3 = async () => {
    if (!isFormValid()) {
      return;
    }

    setIsRunning(true);
    setMessage(null);

    try {
      // Step1 task에서 선택한 경우 실제 spectraPath는 이미 선택된 파일 경로 사용
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
          text: `프로젝트 "${projectName}"가 생성되었고, Step 3이 실행 중입니다. (Container ID: ${result.containerId?.substring(
            0,
            12
          )})`,
        });
        console.log("Step3 실행 결과:", result);
      } else {
        setMessage({
          type: "error",
          text: `Step 3 실행 실패: ${result.error}`,
        });
      }
    } catch (error: unknown) {
      console.error("Step3 실행 중 에러:", error);
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
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 3</h2>
            <p className="text-sm text-gray-500">De-novo Peptide Sequencing</p>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              Step Description
            </h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                이 단계에서는 Casanovo를 사용하여 De-novo 펩타이드 시퀀싱을
                수행합니다.
              </p>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium text-gray-700 mb-2">필요한 입력:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>프로젝트 이름</li>
                  <li>Spectra MGF 파일 경로</li>
                  <li>Casanovo 설정 파일 경로 (Step2의 출력)</li>
                  <li>모델 파일 경로 (.ckpt)</li>
                  <li>출력 폴더 경로</li>
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

            {/* MGF 파일 소스 선택 */}
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
                  <span className="text-sm text-gray-700">Step1 프로젝트</span>
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
                  <span className="text-sm text-gray-700">Custom 경로</span>
                </label>
              </div>

              {mgfSourceType === "step1" ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Step1 프로젝트 선택
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
                      <option value="">Step1 프로젝트 선택</option>
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
                        Step1 Task 선택
                        <span className="text-red-500 ml-1">*</span>
                      </label>
                      <select
                        value={selectedStep1TaskUuid}
                        onChange={(e) => {
                          setSelectedStep1TaskUuid(e.target.value);
                          setSpectraPath(""); // task 변경 시 파일 경로 초기화
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                      >
                        <option value="">Step1 Task 선택</option>
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
                        선택한 Step1 task의 출력 디렉토리에서 가장 최근 생성된
                        .mgf 파일이 자동으로 선택되었습니다
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
                  description="스펙트라 MGF 파일의 전체 경로 (컨테이너 내부 /app/data/mgf/spectra.mgf에 마운트됩니다)"
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
              description="Casanovo 설정 파일 경로 (Step2의 출력, 컨테이너 내부 /app/data/casanovo.yaml에 마운트됩니다)"
              filters={[{ name: "YAML Files", extensions: ["yaml", "yml"] }]}
            />

            <FileInput
              label="Model File Path"
              value={modelPath}
              onChange={setModelPath}
              placeholder="/path/to/model.ckpt"
              required={true}
              description="Casanovo 모델 파일 경로 (.ckpt, 컨테이너 내부 /app/data/model.ckpt에 마운트됩니다)"
              filters={[{ name: "Model Files", extensions: ["ckpt"] }]}
            />

            <PathInput
              label="Output Folder Path"
              value={outputPath}
              onChange={setOutputPath}
              placeholder="/path/to/output/folder"
              required={true}
              description="결과를 저장할 폴더의 전체 경로 (컨테이너 내부 /app/output/에 마운트됩니다)"
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
