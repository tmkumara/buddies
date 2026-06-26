import { requireAuth } from "@/lib/auth-guards";
import Sidebar from "@/components/layout/Sidebar";
import BottomNav from "@/components/layout/BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  await requireAuth();

  return (
    <div className="dashboard-root">
      <div className="sidebar-desktop">
        <Sidebar />
      </div>
      <div className="dashboard-content app-main">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
