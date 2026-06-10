"use client";

import useSWR from "swr";
import Link from "next/link";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Bell, Package, ClipboardCheck, Factory, ShoppingCart, ArrowDownToLine,
  Headphones, Check,
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

const TYPE_LABELS: Record<string, string> = {
  LOW_STOCK:          "สต็อกต่ำ",
  RECEIVING_DONE:     "รับเข้าเสร็จ",
  QC_PENDING:         "รอ QC",
  PRODUCTION_PENDING: "รอผลิต",
  PO_DUE:             "PO ใกล้กำหนด",
  ORDER_PENDING:      "ออเดอร์ใหม่",
  SERVICE_TICKET:     "เคสบริการ",
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

const TABS = [
  { value: "all",    label: "ทั้งหมด" },
  { value: "unread", label: "ยังไม่อ่าน" },
] as const;

export default function NotificationsPage() {
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<string>("");

  const url = tab === "unread" ? "/api/notifications?unread=true" : "/api/notifications";
  const { data, mutate, isLoading } = useSWR(url, fetcher, { refreshInterval: 30000 });

  const notifications: Notification[] = Array.isArray(data?.notifications) ? data.notifications : [];
  const unreadCount: number = data?.unreadCount ?? 0;

  const filtered = typeFilter
    ? notifications.filter((n) => n.type === typeFilter)
    : notifications;

  // group by date (today / yesterday / earlier)
  const groups = groupByDate(filtered);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    await mutate();
  }

  const uniqueTypes = Array.from(new Set(notifications.map((n) => n.type)));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">การแจ้งเตือนทั้งหมด</h2>
          <p className="text-xs text-muted-foreground">
            ยังไม่อ่าน {unreadCount} รายการ
          </p>
        </div>
        {unreadCount > 0 && (
          <Button onClick={markAllRead} variant="outline" className="h-9">
            <Check className="h-4 w-4 mr-1.5" />
            อ่านทั้งหมด
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border bg-card p-0.5">
          {TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                tab === t.value
                  ? "bg-red-600 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {t.value === "unread" && unreadCount > 0 && (
                <span className="ml-1.5">({unreadCount})</span>
              )}
            </button>
          ))}
        </div>

        {uniqueTypes.length > 1 && (
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-1.5 text-xs"
          >
            <option value="">ทุกประเภท</option>
            {uniqueTypes.map((t) => (
              <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>
            ))}
          </select>
        )}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">กำลังโหลด…</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <Bell className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>ไม่มีการแจ้งเตือน</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groups.map((g) => (
            <div key={g.label} className="space-y-2">
              <h3 className="px-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {g.label}
              </h3>
              <Card>
                <CardContent className="p-0">
                  {g.items.map((n, idx) => {
                    const inner = (
                      <div className="flex gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
                        <div className="mt-0.5 shrink-0">
                          {TYPE_ICONS[n.type] ?? <Bell className="h-4 w-4 text-muted-foreground" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="text-xs text-muted-foreground mt-0.5">{n.body}</p>
                          )}
                          <div className="mt-1 flex items-center gap-2 text-[10px] text-muted-foreground/70">
                            <span className="rounded-full bg-muted px-1.5 py-0.5 font-medium">
                              {TYPE_LABELS[n.type] ?? n.type}
                            </span>
                            <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: th })}</span>
                          </div>
                        </div>
                        {!n.is_read && (
                          <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                        )}
                      </div>
                    );
                    return (
                      <div
                        key={n.id}
                        className={`${idx !== g.items.length - 1 ? "border-b border-border" : ""} ${
                          !n.is_read ? "bg-red-500/5" : ""
                        }`}
                      >
                        {n.link ? <Link href={n.link}>{inner}</Link> : inner}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function groupByDate(items: Notification[]) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);

  const buckets: Record<string, Notification[]> = { today: [], yesterday: [], earlier: [] };
  for (const n of items) {
    const d = new Date(n.created_at); d.setHours(0, 0, 0, 0);
    if (d.getTime() === today.getTime())          buckets.today.push(n);
    else if (d.getTime() === yesterday.getTime()) buckets.yesterday.push(n);
    else                                          buckets.earlier.push(n);
  }
  const groups = [
    { label: "วันนี้",     items: buckets.today },
    { label: "เมื่อวาน",   items: buckets.yesterday },
    { label: "ก่อนหน้านี้", items: buckets.earlier },
  ];
  return groups.filter((g) => g.items.length > 0);
}
