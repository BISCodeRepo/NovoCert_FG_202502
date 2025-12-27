import { useState, useEffect } from "react";
import {
  DockerInstallStatus,
  DockerRunningStatus,
  DockerImagesStatus,
  DockerImageDownloadProgress,
} from "../types";

function Prepare() {
  const [installStatus, setInstallStatus] = useState<DockerInstallStatus>({
    status: "pending",
  });
  const [runningStatus, setRunningStatus] = useState<DockerRunningStatus>({
    status: "pending",
  });
  const [imagesStatus, setImagesStatus] = useState<DockerImagesStatus>({
    status: "pending",
  });

  // 다운로드 진행 상황 리스너 등록
  useEffect(() => {
    const handleDownloadProgress = (
      _event: any,
      progress: DockerImageDownloadProgress
    ) => {
      setImagesStatus((prev) => {
        const currentProgress = prev.downloadProgress || [];
        const existingIndex = currentProgress.findIndex(
          (p) => p.image === progress.image
        );

        let newProgress;
        if (existingIndex >= 0) {
          // 기존 항목 업데이트
          newProgress = [...currentProgress];
          newProgress[existingIndex] = progress;
        } else {
          // 새 항목 추가
          newProgress = [...currentProgress, progress];
        }

        return {
          ...prev,
          downloadProgress: newProgress,
        };
      });
    };

    window.ipcRenderer.on("docker:download-progress", handleDownloadProgress);

    return () => {
      window.ipcRenderer.off(
        "docker:download-progress",
        handleDownloadProgress
      );
    };
  }, []);

  const handleCheckInstalled = async () => {
    setInstallStatus({ status: "checking" });
    try {
      const result = await window.docker.checkInstalled();
      if (result.installed) {
        setInstallStatus({
          status: "success",
          version: result.version,
        });
      } else {
        setInstallStatus({
          status: "error",
          error: result.error || "Docker가 설치되어 있지 않습니다.",
        });
      }
    } catch (error: any) {
      setInstallStatus({
        status: "error",
        error: error.message || "확인 중 오류가 발생했습니다.",
      });
    }
  };

  const handleCheckRunning = async () => {
    setRunningStatus({ status: "checking" });
    try {
      const result = await window.docker.checkRunning();
      if (result.running) {
        setRunningStatus({
          status: "success",
          info: "Docker가 정상적으로 실행 중입니다.",
        });
      } else {
        setRunningStatus({
          status: "error",
          error: result.error || "Docker가 실행되고 있지 않습니다.",
        });
      }
    } catch (error: any) {
      setRunningStatus({
        status: "error",
        error: error.message || "확인 중 오류가 발생했습니다.",
      });
    }
  };

  const handleCheckImages = async () => {
    setImagesStatus({ status: "checking" });
    try {
      const result = await window.docker.checkRequiredImages();
      if (result.success && result.images) {
        setImagesStatus({
          status: "success",
          images: result.images,
        });
      } else {
        setImagesStatus({
          status: "error",
          error: result.error || "이미지 확인에 실패했습니다.",
        });
      }
    } catch (error: any) {
      setImagesStatus({
        status: "error",
        error: error.message || "확인 중 오류가 발생했습니다.",
      });
    }
  };

  const handleDownloadImages = async () => {
    setImagesStatus({ status: "checking", downloadProgress: [] });
    try {
      const result = await window.docker.downloadMissingImages();
      if (result.success) {
        // 다운로드 후 다시 확인
        const checkResult = await window.docker.checkRequiredImages();
        if (checkResult.success && checkResult.images) {
          setImagesStatus((prev) => ({
            status: "success",
            images: checkResult.images,
            downloadProgress: prev.downloadProgress,
            downloadResults: result.results,
          }));
        }
      } else {
        setImagesStatus((prev) => ({
          status: "error",
          downloadProgress: prev.downloadProgress,
          error: result.error || "이미지 다운로드에 실패했습니다.",
        }));
      }
    } catch (error: any) {
      setImagesStatus((prev) => ({
        status: "error",
        downloadProgress: prev.downloadProgress,
        error: error.message || "다운로드 중 오류가 발생했습니다.",
      }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">환경 준비</h1>
      <p className="text-sm text-gray-500 mb-8">
        Docker 환경을 확인하고 필요한 이미지를 설치합니다
      </p>

      <div className="space-y-6">
        {/* Docker 설치 확인 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🐳</span>
                <h2 className="text-xl font-semibold text-gray-900">
                  1. Docker 설치 확인
                </h2>
              </div>
              <p className="text-gray-600 ml-11">
                시스템에 Docker가 설치되어 있는지 확인합니다.
              </p>
            </div>
            <button
              onClick={handleCheckInstalled}
              disabled={installStatus.status === "checking"}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium ml-4 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {installStatus.status === "checking" ? "확인 중..." : "확인"}
            </button>
          </div>
          <div className="mt-4 ml-11">
            {installStatus.status === "pending" && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>상태: 확인 전</span>
              </div>
            )}
            {installStatus.status === "checking" && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <svg
                  className="w-4 h-4 animate-spin"
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
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>확인 중...</span>
              </div>
            )}
            {installStatus.status === "success" && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>상태: 설치됨</span>
                </div>
                {installStatus.version && (
                  <p className="text-xs text-gray-500 ml-6">
                    {installStatus.version}
                  </p>
                )}
              </div>
            )}
            {installStatus.status === "error" && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span>상태: 설치되지 않음</span>
                </div>
                {installStatus.error && (
                  <p className="text-xs text-red-500 ml-6">
                    {installStatus.error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Docker Daemon 실행 확인 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">⚙️</span>
                <h2 className="text-xl font-semibold text-gray-900">
                  2. Docker Daemon 실행 확인
                </h2>
              </div>
              <p className="text-gray-600 ml-11">
                Docker 서비스가 현재 실행 중인지 확인합니다.
              </p>
            </div>
            <button
              onClick={handleCheckRunning}
              disabled={runningStatus.status === "checking"}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium ml-4 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {runningStatus.status === "checking" ? "확인 중..." : "확인"}
            </button>
          </div>
          <div className="mt-4 ml-11">
            {runningStatus.status === "pending" && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <span>상태: 확인 전</span>
              </div>
            )}
            {runningStatus.status === "checking" && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <svg
                  className="w-4 h-4 animate-spin"
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
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
                <span>확인 중...</span>
              </div>
            )}
            {runningStatus.status === "success" && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span>상태: 실행 중</span>
                </div>
                {runningStatus.info && (
                  <p className="text-xs text-gray-500 ml-6">
                    {runningStatus.info}
                  </p>
                )}
              </div>
            )}
            {runningStatus.status === "error" && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span>상태: 실행 중이지 않음</span>
                </div>
                {runningStatus.error && (
                  <p className="text-xs text-red-500 ml-6">
                    {runningStatus.error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Docker Image 다운로드 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📦</span>
                <h2 className="text-xl font-semibold text-gray-900">
                  3. Docker Image 설치
                </h2>
              </div>
              <p className="text-gray-600 ml-11">
                프로그램에 필요한 Docker 이미지를 다운로드합니다.
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={handleCheckImages}
                disabled={imagesStatus.status === "checking"}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {imagesStatus.status === "checking" ? "확인 중..." : "확인"}
              </button>
              <button
                onClick={handleDownloadImages}
                disabled={imagesStatus.status === "checking"}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {imagesStatus.status === "checking" ? "설치 중..." : "설치"}
              </button>
            </div>
          </div>
          <div className="mt-4 ml-11">
            {imagesStatus.status === "pending" && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>상태: 확인 전</span>
                </div>
              </div>
            )}
            {imagesStatus.status === "checking" && (
              <div className="space-y-3">
                {imagesStatus.downloadProgress &&
                imagesStatus.downloadProgress.length > 0 ? (
                  // 다운로드 진행 중
                  <>
                    <div className="flex items-center gap-2 text-sm text-blue-600 mb-3">
                      <svg
                        className="w-4 h-4 animate-spin"
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
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                      </svg>
                      <span>이미지 다운로드 중...</span>
                    </div>
                    {imagesStatus.downloadProgress.map((progress, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg"
                      >
                        <div className="flex items-center gap-3 flex-1">
                          {progress.status === "downloading" && (
                            <svg
                              className="w-4 h-4 animate-spin text-blue-600"
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
                              />
                              <path
                                className="opacity-75"
                                fill="currentColor"
                                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                              />
                            </svg>
                          )}
                          {progress.status === "success" && (
                            <svg
                              className="w-4 h-4 text-green-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          )}
                          {progress.status === "error" && (
                            <svg
                              className="w-4 h-4 text-red-600"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          )}
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900">
                              {progress.name}
                            </div>
                            <div className="text-xs text-gray-500">
                              {progress.image}
                            </div>
                            {progress.error && (
                              <div className="text-xs text-red-500 mt-1">
                                {progress.error}
                              </div>
                            )}
                          </div>
                        </div>
                        <span
                          className={`text-xs font-medium ${
                            progress.status === "downloading"
                              ? "text-blue-600"
                              : progress.status === "success"
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {progress.status === "downloading"
                            ? "다운로드 중"
                            : progress.status === "success"
                            ? "완료"
                            : "실패"}
                        </span>
                      </div>
                    ))}
                  </>
                ) : (
                  // 초기 확인 중
                  <div className="flex items-center gap-2 text-sm text-blue-600">
                    <svg
                      className="w-4 h-4 animate-spin"
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
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                    <span>확인 중...</span>
                  </div>
                )}
              </div>
            )}
            {imagesStatus.status === "success" && imagesStatus.images && (
              <div className="space-y-3">
                {imagesStatus.images.map((img, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {img.exists ? (
                          <svg
                            className="w-4 h-4 text-green-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        ) : (
                          <svg
                            className="w-4 h-4 text-red-600"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                        )}
                        <span className="text-sm font-medium text-gray-900">
                          {img.name}
                        </span>
                        <span className="text-xs text-gray-500">
                          ({img.image})
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 ml-6 mt-1">
                        {img.description}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-medium ${
                        img.exists ? "text-green-600" : "text-red-600"
                      }`}
                    >
                      {img.exists ? "설치됨" : "미설치"}
                    </span>
                  </div>
                ))}
                {imagesStatus.downloadResults &&
                  imagesStatus.downloadResults.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs font-medium text-blue-900 mb-2">
                        다운로드 결과:
                      </p>
                      {imagesStatus.downloadResults.map((result, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-blue-800 flex items-center gap-2"
                        >
                          {result.success ? "✓" : "✗"} {result.image}
                          {result.error && ` - ${result.error}`}
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}
            {imagesStatus.status === "error" && (
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-sm text-red-600">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                  <span>상태: 오류</span>
                </div>
                {imagesStatus.error && (
                  <p className="text-xs text-red-500 ml-6">
                    {imagesStatus.error}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 하단 안내 */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <svg
            className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">시작하기 전에</p>
            <p>
              모든 항목을 확인하고 설치가 완료되어야 파이프라인을 실행할 수
              있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Prepare;
