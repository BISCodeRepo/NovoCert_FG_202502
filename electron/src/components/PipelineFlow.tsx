const branchSteps = ["Step 1", "Step 2 (optional)", "Step 3"];
const finalSteps = ["Step 4", "Step 5", "Step 6"];

function PipelineFlow() {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">Pipeline Flow</h3>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] gap-4 items-center">
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Target branch</div>
          <div className="flex flex-wrap items-center gap-2">
            {branchSteps.map((step) => (
              <span key={`target-${step}`} className="rounded-md bg-blue-50 px-3 py-2 text-xs font-medium text-blue-800">
                {step}
              </span>
            ))}
          </div>
        </div>
        <div className="hidden lg:block text-sm font-semibold text-gray-400">+</div>
        <div className="space-y-3">
          <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Decoy branch</div>
          <div className="flex flex-wrap items-center gap-2">
            {branchSteps.map((step) => (
              <span key={`decoy-${step}`} className="rounded-md bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800">
                {step}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-gray-100 pt-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">Then</span>
        {finalSteps.map((step) => (
          <span key={step} className="rounded-md bg-gray-900 px-3 py-2 text-xs font-medium text-white">
            {step}
          </span>
        ))}
      </div>
    </div>
  );
}

export default PipelineFlow;
