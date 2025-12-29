import { ReactNode } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";

interface LayoutProps {
  children: ReactNode;
  currentPage: string;
  onNavigate: (page: string, uuid: string) => void;
}

function Layout({ children, currentPage, onNavigate }: LayoutProps) {
  return (
    <div className="h-screen overflow-hidden bg-gray-50">
      <Header />
      <Sidebar currentPage={currentPage} onNavigate={onNavigate} />
      <main className="ml-64 mt-16 h-[calc(100vh-4rem)] overflow-y-auto p-8">
        {children}
      </main>
    </div>
  );
}

export default Layout;
