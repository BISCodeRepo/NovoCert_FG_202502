interface StepDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  stepNumber: number;
  stepTitle: string;
  description: string;
  requiredInputs: string[];
}

function StepDescriptionModal({
  isOpen,
  onClose,
  stepNumber,
  stepTitle,
  description,
  requiredInputs,
}: StepDescriptionModalProps) {
  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Step {stepNumber}
                </h2>
                <p className="text-sm text-gray-500 mt-1">{stepTitle}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg
                  className="w-6 h-6"
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
              </button>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Step Description
              </h3>
              <div className="space-y-3 text-sm text-gray-600">
                <p>{description}</p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="font-medium text-gray-700 mb-2">
                    Required input:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {requiredInputs.map((input, index) => (
                      <li key={index}>{input}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default StepDescriptionModal;

