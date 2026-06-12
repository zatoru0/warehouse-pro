import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-background">
      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className="ml-60 flex flex-1 flex-col print:ml-0">
        <div className="print:hidden">
          <Topbar />
        </div>
        <main className="flex-1 p-7 print:p-0">{children}</main>
      </div>
    </div>
  );
}
