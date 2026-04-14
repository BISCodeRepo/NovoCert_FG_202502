import { useState, useEffect } from "react";
import {
  TextInput,
  FileInput,
  StepRunButton,
} from "../../components/form";
import { useStepProjectSelector } from "../../hooks/useStepProjectSelector";
import StepProjectList from "../../components/StepProjectList";
import StepDescriptionModal from "../../components/StepDescriptionModal";
import type { StepPageProps } from "../../types";

/* ------------------------------------------------------------------ */
/*  SVG Chart Components                                               */
/* ------------------------------------------------------------------ */

function VennDiagram({
  title,
  leftOnly,
  rightOnly,
  overlap,
  leftLabel,
  rightLabel,
}: VennData) {
  const w = 400,
    h = 270;
  const cy = 120;
  const maxR = 95,
    minR = 35;

  const leftTotal = leftOnly + overlap;
  const rightTotal = rightOnly + overlap;
  const maxTotal = Math.max(leftTotal, rightTotal, 1);

  // Area-proportional radii: r ∝ sqrt(count)
  const rL = Math.max(minR, maxR * Math.sqrt(leftTotal / maxTotal));
  const rR = Math.max(minR, maxR * Math.sqrt(rightTotal / maxTotal));

  // Position circles so the overlap zone is visually proportional
  const overlapRatio = Math.min(overlap / Math.max(leftTotal, rightTotal, 1), 1);
  const baseDist = rL + rR;
  const dist = baseDist * (1 - overlapRatio * 0.6);

  const centerX = w / 2;
  const cx1 = centerX - dist / 2;
  const cx2 = centerX + dist / 2;

  const bigR = Math.max(rL, rR);
  const overlapMidX = (cx1 + rL + cx2 - rR) / 2;

  return (
    <div className="flex flex-col items-center w-full">
      <h4 className="text-sm font-semibold text-gray-700 mb-1">{title}</h4>
      <svg viewBox={`0 0 ${w} ${h}`} className="select-none w-full" preserveAspectRatio="xMidYMid meet">
        <circle
          cx={cx1}
          cy={cy}
          r={rL}
          fill="rgba(59,130,246,0.25)"
          stroke="#3b82f6"
          strokeWidth={2}
        />
        <circle
          cx={cx2}
          cy={cy}
          r={rR}
          fill="rgba(239,68,68,0.25)"
          stroke="#ef4444"
          strokeWidth={2}
        />
        <text
          x={cx1 - rL * 0.35}
          y={cy + 6}
          textAnchor="middle"
          fontSize={13}
          fontWeight="bold"
          fill="#1e40af"
        >
          {leftOnly}
        </text>
        <text
          x={overlapMidX}
          y={cy + 6}
          textAnchor="middle"
          fontSize={13}
          fontWeight="bold"
          fill="#6b21a8"
        >
          {overlap}
        </text>
        <text
          x={cx2 + rR * 0.35}
          y={cy + 6}
          textAnchor="middle"
          fontSize={13}
          fontWeight="bold"
          fill="#991b1b"
        >
          {rightOnly}
        </text>
        <text
          x={cx1}
          y={cy + bigR + 28}
          textAnchor="middle"
          fontSize={12}
          fill="#374151"
        >
          {leftLabel}
        </text>
        <text
          x={cx2}
          y={cy + bigR + 28}
          textAnchor="middle"
          fontSize={12}
          fill="#374151"
        >
          {rightLabel}
        </text>
      </svg>
    </div>
  );
}

function Histogram({
  title,
  bins,
}: HistogramData) {
  const w = 400,
    h = 260;
  const m = { top: 35, right: 15, bottom: 40, left: 50 };
  const pw = w - m.left - m.right;
  const ph = h - m.top - m.bottom;

  if (bins.length === 0) {
    return (
      <div className="flex flex-col items-center w-full">
        <h4 className="text-sm font-semibold text-gray-700 mb-1">{title}</h4>
        <div className="w-full aspect-[5/3] flex items-center justify-center text-xs text-gray-400 border rounded">
          No data available
        </div>
      </div>
    );
  }

  const maxCount = Math.max(
    ...bins.flatMap((b) => [b.overlapCount, b.unoverlapCount]),
    1
  );
  const groupW = pw / bins.length;
  const barW = groupW / 2 - 1;

  const yTicks = 5;
  const tickStep = Math.ceil(maxCount / yTicks);

  return (
    <div className="flex flex-col items-center w-full">
      <h4 className="text-sm font-semibold text-gray-700 mb-1">{title}</h4>
      <svg viewBox={`0 0 ${w} ${h}`} className="select-none w-full" preserveAspectRatio="xMidYMid meet">
        {/* Legend */}
        <rect x={w - 120} y={6} width={10} height={10} fill="rgba(59,130,246,0.7)" rx={1} />
        <text x={w - 106} y={15} fontSize={10} fill="#374151">
          Overlap
        </text>
        <rect x={w - 120} y={20} width={10} height={10} fill="rgba(239,68,68,0.7)" rx={1} />
        <text x={w - 106} y={29} fontSize={10} fill="#374151">
          Unoverlap
        </text>

        <g transform={`translate(${m.left},${m.top})`}>
          {/* Y-axis gridlines + labels */}
          {Array.from({ length: yTicks + 1 }, (_, i) => {
            const val = i * tickStep;
            if (val > maxCount) return null;
            const y = ph - (val / maxCount) * ph;
            return (
              <g key={i}>
                <line x1={0} y1={y} x2={pw} y2={y} stroke="#e5e7eb" />
                <text x={-6} y={y + 4} textAnchor="end" fontSize={10} fill="#6b7280">
                  {val}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {bins.map((bin, i) => {
            const x = i * groupW;
            const h1 = (bin.overlapCount / maxCount) * ph;
            const h2 = (bin.unoverlapCount / maxCount) * ph;
            return (
              <g key={i}>
                <rect
                  x={x + 1}
                  y={ph - h1}
                  width={barW}
                  height={h1}
                  fill="rgba(59,130,246,0.7)"
                  rx={1}
                />
                <rect
                  x={x + barW + 2}
                  y={ph - h2}
                  width={barW}
                  height={h2}
                  fill="rgba(239,68,68,0.7)"
                  rx={1}
                />
              </g>
            );
          })}

          {/* X-axis */}
          <line x1={0} y1={ph} x2={pw} y2={ph} stroke="#9ca3af" />
          {/* X-axis labels (first, middle, last) */}
          {[0, Math.floor(bins.length / 2), bins.length - 1].map((idx) => {
            const bin = bins[idx];
            if (!bin) return null;
            const x = idx * groupW + groupW / 2;
            return (
              <text
                key={idx}
                x={x}
                y={ph + 16}
                textAnchor="middle"
                fontSize={9}
                fill="#6b7280"
              >
                {bin.min.toFixed(2)}
              </text>
            );
          })}
          {/* Y-axis */}
          <line x1={0} y1={0} x2={0} y2={ph} stroke="#9ca3af" />
        </g>
      </svg>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Step6 Page                                                         */
/* ------------------------------------------------------------------ */

function Step6({ onNavigate }: StepPageProps) {
  const [projectName, setProjectName] = useState("");
  const [dbResultPath, setDbResultPath] = useState("");
  const [fdrResultPath, setFdrResultPath] = useState("");
  const [pinFilePath, setPinFilePath] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [projectUuid, setProjectUuid] = useState<string | null>(null);
  const [isDescriptionModalOpen, setIsDescriptionModalOpen] = useState(false);
  const [analysisData, setAnalysisData] = useState<Step6AnalysisData | null>(
    null
  );

  // Step 5 project selector for FDR result CSV
  const fdrSelector = useStepProjectSelector({
    step: 5,
    defaultSourceType: "step",
    extensions: ["csv"],
    onFileFound: (p) => setFdrResultPath(p),
  });

  useEffect(() => {
    if (fdrSelector.sourceType === "custom") {
      setFdrResultPath("");
      setPinFilePath("");
    } else if (fdrSelector.foundFilePath) {
      setFdrResultPath(fdrSelector.foundFilePath);
    }
  }, [fdrSelector.sourceType, fdrSelector.foundFilePath]);

  // Extract PIN file path (t_d.pin) from the selected Step 5 project's inputPath
  useEffect(() => {
    if (fdrSelector.sourceType === "step" && fdrSelector.selectedProjectUuid) {
      const project = fdrSelector.projects.find(
        (p) => p.uuid === fdrSelector.selectedProjectUuid
      );
      const inputPath = project?.parameters?.inputPath as string | undefined;
      setPinFilePath(inputPath || "");
    } else {
      setPinFilePath("");
    }
  }, [fdrSelector.sourceType, fdrSelector.selectedProjectUuid, fdrSelector.projects]);

  // Persist inputs
  useEffect(() => {
    const saved = localStorage.getItem("step6_inputs");
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.projectName) setProjectName(p.projectName);
        if (p.dbResultPath) setDbResultPath(p.dbResultPath);
        if (p.fdrResultPath) setFdrResultPath(p.fdrResultPath);
      } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(
      "step6_inputs",
      JSON.stringify({ projectName, dbResultPath, fdrResultPath })
    );
  }, [projectName, dbResultPath, fdrResultPath]);

  const isFormValid = () => {
    const fdrValid =
      fdrSelector.sourceType === "step"
        ? fdrSelector.selectedProjectUuid !== "" &&
          fdrSelector.foundFilePath !== "" &&
          fdrResultPath.trim() !== ""
        : fdrResultPath.trim() !== "";

    return (
      projectName.trim() !== "" &&
      dbResultPath.trim() !== "" &&
      fdrValid
    );
  };

  const handleRun = async () => {
    if (!isFormValid()) return;

    setIsRunning(true);
    setMessage(null);
    setAnalysisData(null);

    try {
      const result = await window.step.runStep6({
        projectName,
        csvFilePath: dbResultPath,
        previousStepPath: fdrResultPath,
        ...(pinFilePath ? { pinFilePath } : {}),
      });

      if (result.success && result.project) {
        setProjectUuid(result.project.uuid);
        if (result.analysisData) {
          setAnalysisData(result.analysisData);
        }
        setMessage(null);
      } else {
        setMessage({
          type: "error",
          text: `Step 6 failed: ${result.error}`,
        });
      }
    } catch (error: unknown) {
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
    <div className="h-full space-y-6">
      {/* Top section: Left panel + Right panel */}
      <div className="flex gap-6">
        {/* Left panel */}
        <div className="w-1/3">
          <div className="bg-white rounded-lg shadow-sm p-6 sticky top-0">
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">Step 6</h2>
                <button
                  onClick={() => setIsDescriptionModalOpen(true)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                  title="Step Description"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
              </div>
              <p className="text-sm text-gray-500">Post Analysis</p>
            </div>
            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Step 6 Projects</h3>
              <StepProjectList step={6} refreshTrigger={projectUuid} onNavigate={onNavigate} />
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0">
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Parameter Settings</h2>

            <div className="space-y-6">
              <TextInput
                label="Project Name"
                value={projectName}
                onChange={setProjectName}
                placeholder="Enter the project name"
                required
                description="Enter the name of the project to start a new one"
              />

              {/* Input 1: FDR Result CSV (from Step 5) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  FDR Result CSV (from Step 5)
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="fdrSource"
                      value="step"
                      checked={fdrSelector.sourceType === "step"}
                      onChange={() => fdrSelector.setSourceType("step")}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Step 5 Project</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="fdrSource"
                      value="custom"
                      checked={fdrSelector.sourceType === "custom"}
                      onChange={() => fdrSelector.setSourceType("custom")}
                      className="mr-2"
                    />
                    <span className="text-sm text-gray-700">Upload CSV File</span>
                  </label>
                </div>

                {fdrSelector.sourceType === "step" ? (
                  <div className="space-y-3">
                    <select
                      value={fdrSelector.selectedProjectUuid}
                      onChange={(e) => fdrSelector.setSelectedProjectUuid(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                    >
                      <option value="">Select Step 5 Project</option>
                      {fdrSelector.projects.map((p) => (
                        <option key={p.uuid} value={p.uuid}>{p.name}</option>
                      ))}
                    </select>
                    {fdrSelector.selectedProjectUuid && fdrSelector.foundFilePath && (
                      <div>
                        <div className="px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 truncate">
                          {fdrSelector.foundFilePath}
                        </div>
                        <p className="mt-1 text-xs text-gray-500">
                          Automatically selected the latest .csv from the Step 5 project output.
                        </p>
                      </div>
                    )}
                    {fdrSelector.error && (
                      <p className="text-sm text-red-600">{fdrSelector.error}</p>
                    )}
                  </div>
                ) : (
                  <FileInput
                    label="FDR Result CSV File"
                    value={fdrResultPath}
                    onChange={setFdrResultPath}
                    placeholder="/path/to/fdr_result.csv"
                    required
                    description="The fdr_result.csv file generated by Step 5"
                    filters={[{ name: "CSV Files", extensions: ["csv"] }]}
                  />
                )}
              </div>

              {/* Input 2: DB Search Result CSV */}
              <FileInput
                label="DB Search Result CSV"
                value={dbResultPath}
                onChange={setDbResultPath}
                placeholder="/path/to/db_result.csv"
                required
                description="The database search result CSV file"
                filters={[{ name: "CSV Files", extensions: ["csv"] }]}
              />
            </div>

            <StepRunButton
              stepNumber={6}
              onClick={handleRun}
              isFormValid={isFormValid()}
              isRunning={isRunning}
              message={message}
            />
          </div>
        </div>
      </div>

      {/* Analysis Results - Full width below both panels */}
      {analysisData && (
        <div className="bg-white rounded-lg shadow-sm p-6 space-y-8">
          <h2 className="text-xl font-semibold text-gray-900">Analysis Results</h2>

          {/* Venn Diagrams Row */}
          {analysisData.vennDiagrams.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Venn Diagrams</h3>
              <div className="grid grid-cols-3 gap-4">
                {analysisData.vennDiagrams.map((v) => (
                  <VennDiagram key={v.title} {...v} />
                ))}
              </div>
            </div>
          )}

          {/* Histograms Row */}
          {analysisData.histograms.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-600 mb-3">Feature Histograms (by ID Overlap)</h3>
              <div className="grid grid-cols-3 gap-4">
                {analysisData.histograms.map((h) => (
                  <Histogram key={h.title} {...h} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <StepDescriptionModal
        isOpen={isDescriptionModalOpen}
        onClose={() => setIsDescriptionModalOpen(false)}
        stepNumber={6}
        stepTitle="Post Analysis"
        description="Compare FDR-controlled results with database search results using Venn diagrams and feature distribution histograms."
        requiredInputs={[
          "Project Name",
          "FDR Result CSV (from Step 5)",
          "DB Search Result CSV",
        ]}
      />
    </div>
  );
}

export default Step6;
