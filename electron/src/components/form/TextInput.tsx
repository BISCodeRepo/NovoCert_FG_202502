interface TextInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  description?: string;
  readOnly?: boolean;
}

function TextInput({
  label,
  value,
  onChange,
  placeholder = "",
  required = false,
  description,
  readOnly = false,
}: TextInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {readOnly ? (
        <div className="w-full px-4 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm font-medium text-gray-800">
          {value || placeholder || "-"}
        </div>
      ) : (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
      )}
      {description && (
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      )}
    </div>
  );
}

export default TextInput;
