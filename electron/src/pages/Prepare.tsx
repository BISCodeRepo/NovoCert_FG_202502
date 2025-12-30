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

  useEffect(() => {
    const handleDownloadProgress = (
      _event: unknown,
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
          error: result.error || "Docker is not installed",
        });
      }
    } catch (error: unknown) {
      setInstallStatus({
        status: "error",
        error: error instanceof Error ? error.message : "Error checking installed",
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
          info: "Docker is running normally",
        });
      } else {
        setRunningStatus({
          status: "error",
          error: result.error || "Docker is not running",
        });
      }
    } catch (error: unknown) {
      setRunningStatus({
        status: "error",
        error: error instanceof Error ? error.message : "Error checking running",
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
          error: result.error || "Error checking images",
        });
      }
    } catch (error: unknown) {
      setImagesStatus({
        status: "error",
        error: error instanceof Error ? error.message : "Error checking images",
      });
    }
  };

  const handleDownloadImages = async () => {
    setImagesStatus({ status: "checking", downloadProgress: [] });
    try {
      const result = await window.docker.downloadMissingImages();
      if (result.success) {
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
          error: result.error || "Error downloading images",
        }));
      }
    } catch (error: unknown) {
      setImagesStatus((prev) => ({
        status: "error",
        downloadProgress: prev.downloadProgress,
        error: error instanceof Error ? error.message : "Error downloading images",
      }));
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-4xl font-bold text-gray-900 mb-2">Environment Preparation</h1>
      <p className="text-sm text-gray-500 mb-8">
        Check the Docker environment and install the necessary images
      </p>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">🐳</span>
                <h2 className="text-xl font-semibold text-gray-900">
                  1. Check Docker Installation
                </h2>
              </div>
              <p className="text-gray-600 ml-11">
                Check if Docker is installed on the system
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
                <span>Status: Pending</span>
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
                <span>Checking...</span>
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
                  <span>Status: Installed</span>
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
                  <span>Status: Not Installed</span>
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

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">⚙️</span>
                <h2 className="text-xl font-semibold text-gray-900">
                  2. Check Docker Daemon Running
                </h2>
              </div>
              <p className="text-gray-600 ml-11">
                Check if the Docker service is currently running
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
                <span>Status: Pending</span>
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
                <span>Checking...</span>
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
                  <span>Status: Running</span>
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
                  <span>Status: Not Running</span>
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

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-2xl">📦</span>
                <h2 className="text-xl font-semibold text-gray-900">
                  3. Download Docker Images
                </h2>
              </div>
              <p className="text-gray-600 ml-11">
                Download the Docker images needed for the program
              </p>
            </div>
            <div className="flex gap-2 ml-4">
              <button
                onClick={handleCheckImages}
                disabled={imagesStatus.status === "checking"}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {imagesStatus.status === "checking" ? "Checking..." : "Check"}
              </button>
              <button
                onClick={handleDownloadImages}
                disabled={imagesStatus.status === "checking"}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {imagesStatus.status === "checking" ? "Installing..." : "Install"}
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
                  <span>Status: Pending</span>
                </div>
              </div>
            )}
            {imagesStatus.status === "checking" && (
              <div className="space-y-3">
                {imagesStatus.downloadProgress &&
                imagesStatus.downloadProgress.length > 0 ? (
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
                      <span>Downloading images...</span>
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
                            ? "Downloading"
                            : progress.status === "success"
                            ? "Completed"
                            : "Failed"}
                        </span>
                      </div>
                    ))}
                  </>
                ) : (
                  // Initial checking
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
                    <span>Checking...</span>
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
                      {img.exists ? "Installed" : "Not Installed"}
                    </span>
                  </div>
                ))}
                {imagesStatus.downloadResults &&
                  imagesStatus.downloadResults.length > 0 && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-xs font-medium text-blue-900 mb-2">
                        Download Results:
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
                  <span>Status: Error</span>
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
            <p className="font-semibold mb-1">Before Starting</p>
            <p>
              All items must be checked and installed before starting the pipeline
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Prepare;
