interface ParameterViewerProps {
  data: Record<string, unknown>;
  level?: number;
}

function ParameterViewer({ data, level = 0 }: ParameterViewerProps) {
  const entries = Object.entries(data);

  const isPath = (value: unknown): boolean => {
    if (typeof value !== "string") return false;
    return /^[/\\]|^[A-Za-z]:[/\\]/.test(value);
  };

  const handlePathClick = async (filePath: string) => {
    try {
      const result = await window.shell.openPath(filePath);
      if (!result.success) {
        await window.shell.showItemInFolder(filePath);
      }
    } catch (error) {
      console.error("Failed to open path:", error);
    }
  };

  return (
    <div className={level > 0 ? "ml-6 border-l-2 border-blue-200 pl-6" : "p-4"}>
      {entries.map(([key, value], index) => (
        <div
          key={key}
          className={`${
            index < entries.length - 1 ? "border-b border-gray-100 mb-4 pb-4" : ""
          }`}
        >
          {typeof value === "object" && value !== null && !Array.isArray(value) ? (
            <div className="space-y-2">
              <div className="mb-2">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 capitalize">
                  {key}
                </span>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <ParameterViewer data={value as Record<string, unknown>} level={level + 1} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-start gap-3">
              <div className="min-w-[180px] flex-shrink-0">
                <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-100 text-gray-700 capitalize">
                  {key}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                {isPath(value) ? (
                  <button
                    type="button"
                    onClick={() => handlePathClick(String(value))}
                    className="w-full text-left text-xs text-gray-800 break-words font-mono bg-white px-4 py-2.5 rounded-md border border-gray-300 shadow-sm hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-colors group"
                    title="Click to open in file explorer"
                  >
                    <div className="flex items-center gap-2">
                      <svg
                        className="w-4 h-4 text-gray-400 group-hover:text-blue-600 flex-shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                      <span className="flex-1">{String(value)}</span>
                    </div>
                  </button>
                ) : (
                  <div className="text-xs text-gray-800 break-words font-mono bg-white px-4 py-2.5 rounded-md border border-gray-300 shadow-sm">
                    {typeof value === "string" ? (
                      <span className="text-gray-900">{value}</span>
                    ) : (
                      <span className="text-gray-700">{String(value)}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ParameterViewer;
