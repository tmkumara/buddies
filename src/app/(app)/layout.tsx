import { requireAuth } from "@/lib/auth-guards";
import Sidebar from "@/components/layout/Sidebar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();

  return (
    <div className="dashboard-root">
      <Sidebar />
      <div className="dashboard-content">
        {children}
      </div>
    </div>
  );
}
