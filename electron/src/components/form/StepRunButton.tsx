interface StepRunButtonProps {
  stepNumber: number;
  onClick: () => void;
  isFormValid: boolean;
  isRunning: boolean;
  message: {
    type: "success" | "error";
    text: string;
  } | null;
}

function StepRunButton({
  stepNumber,
  onClick,
  isFormValid,
  isRunning,
  message,
}: StepRunButtonProps) {
  return (
    <div className="mt-8 pt-6 border-t">
      <button
        onClick={onClick}
        disabled={!isFormValid || isRunning}
        className={`w-full px-6 py-3 rounded-lg font-medium text-lg flex items-center justify-center gap-2 transition-all ${
          isFormValid && !isRunning
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
            Run Step {stepNumber}
          </>
        )}
      </button>
      {!isFormValid && !isRunning && (
        <p className="mt-2 text-sm text-red-600 text-center">
          Please enter all required parameters.
        </p>
      )}
      {/* Result message */}
      {message && (
        <div
          className={`mt-4 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}
        >
          <p
            className={`text-sm ${
              message.type === "success" ? "text-green-800" : "text-red-800"
            }`}
          >
            {message.text}
          </p>
        </div>
      )}
    </div>
  );
}

export default StepRunButton;
