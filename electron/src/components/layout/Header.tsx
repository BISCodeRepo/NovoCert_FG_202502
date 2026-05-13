import { useExperiment } from "../../contexts/ExperimentContext";

interface HeaderProps {
  onNavigate: (page: string, uuid: string) => void;
}

function Header({ onNavigate }: HeaderProps) {
  const { experiments, currentExperiment, isLoading, selectExperiment } = useExperiment();

  return (
    <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-6 fixed top-0 left-0 right-0 z-10">
      <div className="flex flex-col">
        <h1 className="text-xl font-bold text-gray-900">NovoCert</h1>
        <span className="text-[10px] text-gray-400 leading-none">v1.2.4</span>
      </div>
      <div className="flex items-center gap-3">
        <label htmlFor="experiment-select" className="text-sm font-medium text-gray-700">
          Experiment
        </label>
        <select
          id="experiment-select"
          value={currentExperiment?.uuid || ""}
          onChange={(event) => selectExperiment(event.target.value)}
          disabled={isLoading || experiments.length === 0}
          className="h-9 min-w-[220px] rounded-md border border-gray-300 px-3 text-sm text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {experiments.map((experiment) => (
            <option key={experiment.uuid} value={experiment.uuid}>
              {experiment.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onNavigate("pipeline", "")}
          className="h-9 rounded-md bg-blue-600 px-3 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          New
        </button>
      </div>
    </header>
  );
}

export default Header;
