import { useState } from "react";
import { Layout } from "./components/layout";
import {
  Dashboard,
  Prepare,
  Step1,
  Step2,
  Step3,
  Step4,
  Step5,
  ProjectDetail,
  TaskDetail,
} from "./pages";

function App() {
  const [currentPage, setCurrentPage] = useState<string>("dashboard");
  const [currentProjectUuid, setCurrentProjectUuid] = useState<string | null>(
    null
  );
  const [currentTaskUuid, setCurrentTaskUuid] = useState<string | null>(null);

  const handleNavigate = (page: string, uuid: string) => {
    setCurrentPage(page);
    if (page === "project-detail") {
      setCurrentProjectUuid(uuid);
      setCurrentTaskUuid(null);
    } else if (page === "task-detail") {
      setCurrentTaskUuid(uuid);
    } else {
      setCurrentProjectUuid(null);
      setCurrentTaskUuid(null);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return <Dashboard onNavigate={handleNavigate} />;
      case "prepare":
        return <Prepare />;
      case "pipeline":
        return <div>Pipeline 페이지 (준비 중)</div>;
      case "step1":
        return <Step1 />;
      case "step2":
        return <Step2 />;
      case "step3":
        return <Step3 />;
      case "step4":
        return <Step4 />;
      case "step5":
        return <Step5 />;
      case "project-detail":
        if (currentProjectUuid) {
          return (
            <ProjectDetail
              uuid={currentProjectUuid}
              onNavigate={handleNavigate}
            />
          );
        }
        return <Dashboard onNavigate={handleNavigate} />;
      case "task-detail":
        if (currentTaskUuid) {
          return (
            <TaskDetail uuid={currentTaskUuid} onNavigate={handleNavigate} />
          );
        }
        if (currentProjectUuid) {
          return (
            <ProjectDetail
              uuid={currentProjectUuid}
              onNavigate={handleNavigate}
            />
          );
        }
        return <Dashboard onNavigate={handleNavigate} />;
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={handleNavigate}>
      {renderPage()}
    </Layout>
  );
}

export default App;
