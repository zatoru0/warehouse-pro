"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import useSWR from "swr";
import {
  LayoutDashboard, Package, ClipboardList, Tag,
  BarChart3, Settings,
  ArrowDownToLine, FlaskConical, Factory,
  Building2, LogOut, Layers, ShoppingCart, Truck,
  Wrench, Scissors, ArrowLeftRight, Stamp, RefreshCcw,
  Headphones, FileMinus, FileText, Lock, Undo2,
  AlertTriangle, Bell, MapPin, SlidersHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import type { Department, UserRole } from "@prisma/client";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Me = {
  id: string;
  full_name: string;
  role: UserRole;
  departments: Department[];
};

// Each menu item declares which departments can see it.
// Empty array `dept: []` = visible to everyone (e.g. dashboard, settings).
type Item = {
  href: string;
  icon: typeof LayoutDashboard;
  label: string;
  dept: Department[];
};

const nav: { label: string; items: Item[] }[] = [
  {
    label: "หลัก",
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "แดชบอร์ด",      dept: [] },
      { href: "/inventory", icon: Package,         label: "สินค้าคงคลัง",  dept: ["WAREHOUSE", "INBOUND", "ADMIN_DEPT"] },
      { href: "/products",  icon: Tag,             label: "สินค้า",        dept: ["WAREHOUSE", "ADMIN_DEPT"] },
      { href: "/orders",    icon: ClipboardList,   label: "คำสั่งซื้อ",    dept: ["ADMIN_DEPT"] },
    ],
  },
  {
    label: "ฝ่ายรับเข้า",
    items: [
      { href: "/receiving", icon: ArrowDownToLine, label: "รับสินค้า",     dept: ["INBOUND"] },
      { href: "/qc",        icon: FlaskConical,    label: "ตรวจสอบคุณภาพ", dept: ["QC", "INBOUND", "PRODUCTION"] },
    ],
  },
  {
    label: "ฝ่ายผลิต",
    items: [
      { href: "/production",  icon: Factory,  label: "การผลิต",       dept: ["PRODUCTION"] },
      { href: "/repair",      icon: Wrench,   label: "งานซ่อม",       dept: ["PRODUCTION", "AFTER_SALES"] },
      { href: "/disassembly", icon: Scissors, label: "แยกชิ้นส่วน",   dept: ["PRODUCTION"] },
      { href: "/certify",     icon: Stamp,    label: "ตีตรา (Certify)", dept: ["QC", "PRODUCTION"] },
    ],
  },
  {
    label: "ฝ่าย Admin",
    items: [
      { href: "/shipping",                icon: Truck,         label: "จัดส่ง",            dept: ["ADMIN_DEPT"] },
      { href: "/purchase-orders",         icon: ShoppingCart,  label: "ใบสั่งซื้อ (PO)",    dept: ["ADMIN_DEPT"] },
      { href: "/purchase-orders/transit", icon: Truck,         label: "ติดตามขนส่ง PO",   dept: ["ADMIN_DEPT"] },
      { href: "/inventory/reorder",       icon: AlertTriangle, label: "สินค้าใกล้หมด",     dept: ["ADMIN_DEPT", "WAREHOUSE"] },
    ],
  },
  {
    label: "ฝ่ายบริการหลังการขาย",
    items: [
      { href: "/service-tickets", icon: Headphones,    label: "เคสบริการ",       dept: ["AFTER_SALES"] },
      { href: "/exchange",        icon: RefreshCcw,    label: "แลกเปลี่ยนเครื่อง", dept: ["AFTER_SALES"] },
      { href: "/credit-notes",    icon: FileMinus,     label: "ใบลดหนี้",        dept: ["AFTER_SALES", "ADMIN_DEPT"] },
      { href: "/invoices",        icon: FileText,      label: "ใบแจ้งหนี้",      dept: ["AFTER_SALES", "ADMIN_DEPT"] },
      { href: "/claims",          icon: RefreshCcw,    label: "เคลมสินค้า", dept: ["QC", "AFTER_SALES", "ADMIN_DEPT"] },
    ],
  },
  {
    label: "คลังสินค้า",
    items: [
      { href: "/warehouses",         icon: Building2,         label: "คลังสินค้า",       dept: ["WAREHOUSE"] },
      { href: "/inventory/transfer", icon: ArrowLeftRight,    label: "โอนย้ายสินค้า",     dept: ["WAREHOUSE", "INBOUND"] },
      { href: "/inventory/adjust",   icon: SlidersHorizontal, label: "ปรับสต็อก",        dept: ["WAREHOUSE"] },
      { href: "/lots",               icon: Layers,            label: "ล็อต / บาร์โค้ด",    dept: ["WAREHOUSE", "INBOUND"] },
      { href: "/returns",            icon: Undo2,             label: "รับคืนสินค้า",      dept: ["QC", "ADMIN_DEPT", "INBOUND"] },
    ],
  },
  {
    label: "อื่นๆ",
    items: [
      { href: "/notifications",  icon: Bell,      label: "การแจ้งเตือน", dept: [] },
      { href: "/reports",        icon: BarChart3, label: "วิเคราะห์",   dept: [] },
      { href: "/settings/zones", icon: MapPin,    label: "โซน / Bin",   dept: ["WAREHOUSE"] },
      { href: "/settings",       icon: Settings,  label: "ตั้งค่า",      dept: [] },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: me } = useSWR<Me>("/api/me", fetcher);

  const isAdmin = me?.role === "SUPERADMIN" || me?.role === "ADMIN";
  const userDepts = new Set(me?.departments ?? []);

  function canSee(item: Item): boolean {
    if (isAdmin) return true;            // SUPERADMIN/ADMIN เห็นทุกอย่าง
    if (item.dept.length === 0) return true; // ทุกคนเห็น (dashboard/settings)
    return item.dept.some((d) => userDepts.has(d));
  }

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  // Filter nav: only show sections that have at least 1 visible item
  const filteredNav = nav
    .map((sec) => ({ ...sec, items: sec.items.filter(canSee) }))
    .filter((sec) => sec.items.length > 0);

  const noAccess = !isAdmin && userDepts.size === 0;

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      {/* Logo */}
      <div className="border-b border-sidebar-border px-5 py-6">
        <p className="text-2xl font-extrabold tracking-tight text-red-600 leading-none">SUNFORD</p>
        <p className="mt-1 text-[10px] uppercase tracking-widest text-foreground/60">
          ระบบจัดการคลังสินค้า
        </p>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {filteredNav.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "bg-red-600/10 font-medium text-red-600"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        ))}

        {/* Empty state — user has no departments assigned */}
        {noAccess && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-center">
            <Lock className="mx-auto mb-2 h-5 w-5 text-amber-600" />
            <p className="text-xs font-semibold text-amber-700">รออนุมัติฝ่าย</p>
            <p className="mt-1 text-[10px] text-muted-foreground leading-relaxed">
              บัญชีของคุณยังไม่มีฝ่ายที่รับผิดชอบ กรุณาติดต่อ Admin
            </p>
          </div>
        )}
      </nav>

      {/* Logout */}
      <div className="border-t border-border p-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
