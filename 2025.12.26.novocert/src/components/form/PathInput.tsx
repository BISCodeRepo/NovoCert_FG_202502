interface PathInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  description?: string;
}

function PathInput({
  label,
  value,
  onChange,
  placeholder = "/path/to/folder",
  required = false,
  description,
}: PathInputProps) {
  const handleBrowse = async () => {
    try {
      const result = await window.dialog.selectFolder();
      if (!result.canceled && result.path) {
        onChange(result.path);
      }
    } catch (error) {
      console.error('폴더 선택 중 오류 발생:', error);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        <button
          onClick={handleBrowse}
          type="button"
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          찾아보기
        </button>
      </div>
      {description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}

export default PathInput;
