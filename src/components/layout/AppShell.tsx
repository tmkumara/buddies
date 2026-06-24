import Sidebar from "./Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="dashboard-content">
        {children}
      </div>
    </div>
  );
}
