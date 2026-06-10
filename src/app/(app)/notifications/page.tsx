"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import {
  Bell, Package, ClipboardCheck, Factory, ShoppingCart,
  ArrowDownToLine, Headphones, CheckCheck, Check, Trash2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TYPE_ICONS: Record<string, React.ReactNode> = {
  LOW_STOCK:          <Package className="h-4 w-4 text-amber-500" />,
  RECEIVING_DONE:     <ArrowDownToLine className="h-4 w-4 text-green-500" />,
  QC_PENDING:         <ClipboardCheck className="h-4 w-4 text-purple-500" />,
  PRODUCTION_PENDING: <Factory className="h-4 w-4 text-blue-500" />,
  PO_DUE:             <ShoppingCart className="h-4 w-4 text-red-500" />,
  ORDER_PENDING:      <ClipboardCheck className="h-4 w-4 text-cyan-500" />,
  SERVICE_TICKET:     <Headphones className="h-4 w-4 text-pink-500" />,
};

type Notification = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  is_read: boolean;
  created_at: string;
};

function dateGroup(iso: string): "วันนี้" | "เมื่อวาน" | "ก่อนหน้า" {
  const d = new Date(iso);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startYesterday = new Date(startToday);
  startYesterday.setDate(startYesterday.getDate() - 1);
  if (d >= startToday) return "วันนี้";
  if (d >= startYesterday) return "เมื่อวาน";
  return "ก่อนหน้า";
}

const GROUP_ORDER: Array<"วันนี้" | "เมื่อวาน" | "ก่อนหน้า"> = ["วันนี้", "เมื่อวาน", "ก่อนหน้า"];

export default function NotificationsPage() {
  const router = useRouter();
  const { data, isLoading, mutate } = useSWR("/api/notifications?limit=100", fetcher, {
    refreshInterval: 30000,
  });

  const [tab, setTab] = useState<"all" | "unread">("all");

  const all: Notification[] = Array.isArray(data?.notifications) ? data.notifications : [];
  const unreadCount: number = data?.unreadCount ?? 0;
  const list = tab === "unread" ? all.filter((n) => !n.is_read) : all;

  // group ตามวัน (เรียงตามลำดับ)
  const groups = GROUP_ORDER
    .map((g) => ({ label: g, items: list.filter((n) => dateGroup(n.created_at) === g) }))
    .filter((g) => g.items.length > 0);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    mutate();
  }

  async function markRead(id: string) {
    await fetch(`/api/notifications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_read: true }),
    });
    mutate();
  }

  async function remove(id: string) {
    await fetch(`/api/notifications/${id}`, { method: "DELETE" });
    mutate();
  }

  async function open(n: Notification) {
    if (!n.is_read) await markRead(n.id);
    if (n.link) router.push(n.link);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">การแจ้งเตือน</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} รายการที่ยังไม่อ่าน` : "อ่านครบแล้ว"}
          </p>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="inline-flex items-center gap-1.5 rounded-lg bg-red-600/10 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-600/20"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            อ่านทั้งหมด
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {([["all", "ทั้งหมด"], ["unread", `ยังไม่อ่าน${unreadCount > 0 ? ` (${unreadCount})` : ""}`]] as const).map(
          ([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                tab === key
                  ? "border-red-600 text-red-600"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          )
        )}
      </div>

      {isLoading && !data ? (
        <Card>
          <CardContent className="space-y-3 p-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-muted" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-2.5 w-1/3 animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : list.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="mx-auto mb-3 h-10 w-10 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {tab === "unread" ? "ไม่มีรายการที่ยังไม่อ่าน" : "ยังไม่มีการแจ้งเตือน"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <div key={group.label}>
              <p className="mb-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {group.label}
              </p>
              <Card>
                <CardContent className="p-0">
                  {group.items.map((n) => (
                    <div
                      key={n.id}
                      className={`group flex items-start gap-3 border-b border-border px-4 py-3 last:border-0 ${
                        !n.is_read ? "bg-red-500/5" : ""
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {TYPE_ICONS[n.type] ?? <Bell className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <button onClick={() => open(n)} className="min-w-0 flex-1 text-left">
                        <p className={`text-sm font-medium leading-snug ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                          {n.title}
                        </p>
                        {n.body && <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{n.body}</p>}
                        <p className="mt-1 text-[11px] text-muted-foreground/70">
                          {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: th })}
                        </p>
                      </button>
                      <div className="flex shrink-0 items-center gap-1">
                        {!n.is_read && (
                          <button
                            onClick={() => markRead(n.id)}
                            title="ทำเครื่องหมายว่าอ่านแล้ว"
                            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-green-600"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => remove(n.id)}
                          title="ลบ"
                          className="rounded-lg p-1.5 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
