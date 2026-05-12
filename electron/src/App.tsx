import { useState } from "react";
import { Layout } from "./components/layout";
import { ExperimentProvider } from "./contexts/ExperimentContext";
import {
  Prepare,
  Experiments,
  ExperimentDetail,
  ExperimentSetup,
  Step1,
  Step2,
  Step3,
  Step4,
  Step5,
  Step6,
  ProjectDetail,
} from "./pages";

function App() {
  const [currentPage, setCurrentPage] = useState<string>("experiments");
  const [currentProjectUuid, setCurrentProjectUuid] = useState<string | null>(
    null
  );
  const [currentExperimentDetailUuid, setCurrentExperimentDetailUuid] =
    useState<string | null>(null);

  const handleNavigate = (page: string, uuid: string) => {
    setCurrentPage(page);
    if (page === "project-detail") {
      setCurrentProjectUuid(uuid);
    } else if (page === "experiment-detail") {
      setCurrentExperimentDetailUuid(uuid);
      setCurrentProjectUuid(null);
    } else {
      setCurrentProjectUuid(null);
      setCurrentExperimentDetailUuid(null);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case "prepare":
        return <Prepare />;
      case "experiments":
        return <Experiments onNavigate={handleNavigate} />;
      case "experiment-detail":
        if (currentExperimentDetailUuid) {
          return (
            <ExperimentDetail
              uuid={currentExperimentDetailUuid}
              onNavigate={handleNavigate}
            />
          );
        }
        return <Experiments onNavigate={handleNavigate} />;
      case "experiment":
      case "pipeline":
        return <ExperimentSetup onNavigate={handleNavigate} />;
      case "step1":
        return <Step1 onNavigate={handleNavigate} />;
      case "step2":
        return <Step2 onNavigate={handleNavigate} />;
      case "step3":
        return <Step3 onNavigate={handleNavigate} />;
      case "step4":
        return <Step4 onNavigate={handleNavigate} />;
      case "step5":
        return <Step5 onNavigate={handleNavigate} />;
      case "step6":
        return <Step6 onNavigate={handleNavigate} />;
      case "project-detail":
        if (currentProjectUuid) {
          return (
            <ProjectDetail
              uuid={currentProjectUuid}
              onNavigate={handleNavigate}
            />
          );
        }
        return <Experiments onNavigate={handleNavigate} />;
      default:
        return <Experiments onNavigate={handleNavigate} />;
    }
  };

  return (
    <ExperimentProvider>
      <Layout currentPage={currentPage} onNavigate={handleNavigate}>
        {renderPage()}
      </Layout>
    </ExperimentProvider>
  );
}

export default App;
