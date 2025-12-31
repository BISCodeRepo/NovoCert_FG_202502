export * from "./project";
export * from "./task";
export * from "./docker";

// Common page props
export interface StepPageProps {
  onNavigate?: (page: string, uuid: string) => void;
}

