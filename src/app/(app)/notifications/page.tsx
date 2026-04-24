import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { format } from "date-fns";
import { redirect } from "next/navigation";

const TYPE_ICONS: Record<string, string> = {
  LOW_STOCK: "🔴",
  RECEIVING_ALERT: "📦",
  ORDER_READY: "✅",
  QC_REQUIRED: "🔬",
  SHIPMENT_DELAY: "🚚",
  SYSTEM: "⚙️",
};

export default async function NotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const notifications = await prisma.notification.findMany({
    where: { user_id: user.id },
    orderBy: { created_at: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Notifications</h2>
      <Card>
        <CardContent className="divide-y divide-border p-0">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex items-start gap-3 px-4 py-3 ${!n.is_read ? "bg-amber-500/5" : ""}`}
            >
              <span className="mt-0.5 text-lg">{TYPE_ICONS[n.type] ?? "📢"}</span>
              <div className="flex-1">
                <p className={`text-sm ${!n.is_read ? "font-semibold" : "font-medium"}`}>{n.title}</p>
                <p className="text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {format(new Date(n.created_at), "dd MMM yyyy HH:mm")}
                </p>
              </div>
              {!n.is_read && (
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
              )}
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-12 text-muted-foreground">
              <Bell className="h-8 w-8" />
              <p>No notifications yet.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
