"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Package, ClipboardList, Truck, Map,
  Wrench, Users, BarChart3, FileText, Settings, Bell,
  ArrowDownToLine, FlaskConical, Factory, ShoppingCart,
  Building2, Tag, Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

const nav = [
  {
    label: "Main",
    items: [
      { href: "/dashboard",  icon: LayoutDashboard, label: "Dashboard" },
      { href: "/inventory",  icon: Package,         label: "Inventory" },
      { href: "/products",   icon: Tag,             label: "Products" },
      { href: "/lots",       icon: Layers,          label: "Lots / Batches" },
      { href: "/orders",     icon: ClipboardList,   label: "Orders" },
    ],
  },
  {
    label: "Operations",
    items: [
      { href: "/receiving",   icon: ArrowDownToLine, label: "Receiving" },
      { href: "/qc",          icon: FlaskConical,    label: "QC" },
      { href: "/production",  icon: Factory,         label: "Production" },
      { href: "/shipping",    icon: Truck,           label: "Shipping" },
    ],
  },
  {
    label: "Warehouse",
    items: [
      { href: "/warehouses",  icon: Building2, label: "Warehouses" },
      { href: "/suppliers",   icon: ShoppingCart, label: "Suppliers" },
      { href: "/customers",   icon: Users,     label: "Customers" },
    ],
  },
  {
    label: "Reports",
    items: [
      { href: "/reports",        icon: BarChart3,  label: "Analytics" },
      { href: "/notifications",  icon: Bell,       label: "Notifications" },
      { href: "/settings",       icon: Settings,   label: "Settings" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-60 flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-border px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-lg">
          📦
        </div>
        <div>
          <p className="text-sm font-bold leading-tight">WareHouse Pro</p>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Management System
          </p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {nav.map((section) => (
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
                      ? "bg-amber-500/10 font-medium text-amber-500"
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
      </nav>
    </aside>
  );
}
