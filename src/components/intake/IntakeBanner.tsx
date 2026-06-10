import { AlertCircle } from "lucide-react";

export function IntakeBanner({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700">
      <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
      <p>{children}</p>
    </div>
  );
}
