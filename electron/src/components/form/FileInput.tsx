interface FileInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  description?: string;
  filters?: { name: string; extensions: string[] }[];
  defaultPath?: string;
}

function FileInput({
  label,
  value,
  onChange,
  placeholder = "/path/to/file",
  required = false,
  description,
  filters,
  defaultPath,
}: FileInputProps) {
  const handleBrowse = async () => {
    try {
      const options: { filters?: { name: string; extensions: string[] }[]; defaultPath?: string } = {};
      if (filters) {
        options.filters = filters;
      }
      if (defaultPath) {
        options.defaultPath = defaultPath;
      }
      const result = await window.dialog.selectFile(Object.keys(options).length > 0 ? options : undefined);
      if (!result.canceled && result.path) {
        onChange(result.path);
      }
    } catch (error) {
      console.error('파일 선택 중 오류 발생:', error);
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
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        >
         Browse
        </button>
      </div>
      {description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}

export default FileInput;

