"use client";

import { useEffect, useRef } from "react";
import { Bell, LogOut, User, Package, ClipboardCheck, Factory, ShoppingCart, ArrowDownToLine, Headphones, CheckCheck } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { th } from "date-fns/locale";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const PAGE_TITLES: Record<string, string> = {
  "/dashboard":       "ภาพรวมระบบ",
  "/inventory":       "สินค้าคงคลัง",
  "/products":        "รายการสินค้า",
  "/orders":          "คำสั่งซื้อ",
  "/receiving":       "รับสินค้า",
  "/qc":              "ตรวจสอบคุณภาพ",
  "/production":      "การผลิต",
  "/repair":          "งานซ่อม",
  "/disassembly":     "แยกชิ้นส่วน",
  "/certify":         "ตีตรา (Certify)",
  "/exchange":        "แลกเปลี่ยนเครื่อง",
  "/shipping":        "การจัดส่ง",
  "/warehouses":      "คลังสินค้า",
  "/purchase-orders": "ใบสั่งซื้อ",
  "/lots":            "ล็อต / บาร์โค้ด",
  "/service-tickets": "บริการหลังการขาย",
  "/credit-notes":    "ใบลดหนี้",
  "/invoices":        "ใบแจ้งหนี้",
  "/notifications":   "การแจ้งเตือน",
  "/reports":         "รายงานและวิเคราะห์",
  "/settings":        "ตั้งค่า",
  "/claims":          "รับเคลม",
  "/returns":         "รับสินค้าส่งคืน",
  "/notifications":   "การแจ้งเตือน",
  "/customers":       "ข้อมูลลูกค้า",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  LOW_STOCK:           <Package className="h-4 w-4 text-amber-500" />,
  RECEIVING_DONE:      <ArrowDownToLine className="h-4 w-4 text-green-500" />,
  QC_PENDING:          <ClipboardCheck className="h-4 w-4 text-purple-500" />,
  PRODUCTION_PENDING:  <Factory className="h-4 w-4 text-blue-500" />,
  PO_DUE:              <ShoppingCart className="h-4 w-4 text-red-500" />,
  ORDER_PENDING:       <ClipboardCheck className="h-4 w-4 text-cyan-500" />,
  SERVICE_TICKET:      <Headphones className="h-4 w-4 text-pink-500" />,
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

export default function Topbar() {
  const router = useRouter();
  const pathname = usePathname();

  const base = "/" + pathname.split("/")[1];
  const title = PAGE_TITLES[base] ?? "SUNFORD";

  const { data, isLoading, mutate } = useSWR("/api/notifications", fetcher, {
    refreshInterval: 30000,
  });

  const notifications: Notification[] = Array.isArray(data?.notifications) ? data.notifications : [];
  const unreadCount: number = data?.unreadCount ?? 0;

  // Toast เมื่อมี notification ใหม่เข้ามา (ข้ามการโหลดครั้งแรก)
  const seen = useRef<Set<string>>(new Set());
  const initialized = useRef(false);
  useEffect(() => {
    if (!data?.notifications) return;
    const list: Notification[] = data.notifications;
    if (!initialized.current) {
      list.forEach((n) => seen.current.add(n.id));
      initialized.current = true;
      return;
    }
    for (const n of list) {
      if (seen.current.has(n.id)) continue;
      seen.current.add(n.id);
      if (!n.is_read) {
        toast(n.title, {
          description: n.body ?? undefined,
          action: n.link
            ? { label: "ดู", onClick: () => router.push(n.link!) }
            : undefined,
        });
      }
    }
  }, [data, router]);

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    await mutate();
  }

  async function openNotification(n: Notification) {
    if (!n.is_read) {
      await fetch(`/api/notifications/${n.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_read: true }),
      });
      mutate();
    }
    if (n.link) router.push(n.link);
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-border bg-card px-6">
      <h1 className="flex-1 text-base font-semibold">{title}</h1>

      {/* Bell */}
      <DropdownMenu>
        <DropdownMenuTrigger className="relative flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80 p-0">
          <div className="flex items-center justify-between px-3 py-2.5">
            <p className="text-sm font-semibold">
              การแจ้งเตือน
              {unreadCount > 0 && (
                <span className="ml-1.5 text-xs font-normal text-muted-foreground">{unreadCount} ใหม่</span>
              )}
            </p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-red-600 hover:underline"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                อ่านทั้งหมด
              </button>
            )}
          </div>
          <DropdownMenuSeparator className="my-0" />

          <div className="max-h-[420px] overflow-y-auto">
            {isLoading && !data ? (
              <div className="space-y-2 p-3">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex gap-2.5">
                    <div className="h-4 w-4 shrink-0 animate-pulse rounded bg-muted" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                      <div className="h-2.5 w-1/2 animate-pulse rounded bg-muted" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-3 py-8 text-center">
                <Bell className="mx-auto mb-2 h-7 w-7 text-muted-foreground/30" />
                <p className="text-xs text-muted-foreground">ไม่มีการแจ้งเตือน</p>
              </div>
            ) : (
              notifications.slice(0, 8).map((n) => (
                <button
                  key={n.id}
                  onClick={() => openNotification(n)}
                  className={`flex w-full gap-2.5 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 ${!n.is_read ? "bg-red-500/5" : ""}`}
                >
                  <div className="mt-0.5 shrink-0">
                    {TYPE_ICONS[n.type] ?? <Bell className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`text-xs font-medium leading-snug ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                      {n.title}
                    </p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{n.body}</p>
                    )}
                    <p className="mt-1 text-[10px] text-muted-foreground/70">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: th })}
                    </p>
                  </div>
                  {!n.is_read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" />}
                </button>
              ))
            )}
          </div>

          <DropdownMenuSeparator className="my-0" />
          <Link
            href="/notifications"
            className="block px-3 py-2.5 text-center text-xs font-medium text-red-600 hover:bg-muted/60"
          >
            ดูทั้งหมด
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* User */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground">
          <User className="h-4 w-4" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <p className="px-2 py-1.5 text-sm font-semibold">บัญชีของฉัน</p>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            ออกจากระบบ
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
