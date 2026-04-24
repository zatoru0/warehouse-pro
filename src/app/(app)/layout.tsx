import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="ml-60 flex flex-1 flex-col">
        <Topbar />
        <main className="flex-1 p-7">{children}</main>
      </div>
    </div>
  );
}
