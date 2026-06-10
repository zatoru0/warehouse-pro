"use client";

import { Bell, LogOut, User, Package, ClipboardCheck, Factory, ShoppingCart, ArrowDownToLine, Headphones } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { useRouter, usePathname } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
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

  const { data, mutate } = useSWR(
    "/api/notifications",
    fetcher,
    { refreshInterval: 30000 }
  );

  const notifications: Notification[] = Array.isArray(data?.notifications) ? data.notifications : [];
  const unreadCount: number = data?.unreadCount ?? 0;

  async function markAllRead() {
    await fetch("/api/notifications", { method: "PATCH" });
    await mutate();
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
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80 max-h-[480px] overflow-y-auto">
          <div className="flex items-center justify-between px-2 py-1.5">
            <p className="text-sm font-semibold">การแจ้งเตือน</p>
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-red-600 hover:underline"
              >
                อ่านทั้งหมด
              </button>
            )}
          </div>
          <DropdownMenuSeparator />

          {notifications.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              ไม่มีการแจ้งเตือน
            </p>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className={`relative ${!n.is_read ? "bg-red-500/5" : ""}`}>
                {n.link ? (
                  <Link
                    href={n.link}
                    onClick={markAllRead}
                    className="flex gap-2.5 px-3 py-2.5 hover:bg-muted/60 transition-colors"
                  >
                    <div className="mt-0.5 shrink-0">
                      {TYPE_ICONS[n.type] ?? <Bell className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium leading-snug ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{n.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: th })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                    )}
                  </Link>
                ) : (
                  <div className="flex gap-2.5 px-3 py-2.5">
                    <div className="mt-0.5 shrink-0">
                      {TYPE_ICONS[n.type] ?? <Bell className="h-4 w-4 text-muted-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-xs font-medium leading-snug ${!n.is_read ? "text-foreground" : "text-muted-foreground"}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-[11px] text-muted-foreground mt-0.5">{n.body}</p>
                      )}
                      <p className="text-[10px] text-muted-foreground/70 mt-1">
                        {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: th })}
                      </p>
                    </div>
                    {!n.is_read && (
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600" />
                    )}
                  </div>
                )}
              </div>
            ))
          )}
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
