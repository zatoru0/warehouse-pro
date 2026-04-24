import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart3, Package, ArrowDownToLine, ShoppingCart } from "lucide-react";

const reports = [
  {
    href: "/reports/stock-valuation",
    icon: Package,
    title: "Stock Valuation",
    desc: "Current inventory value by product and category",
  },
  {
    href: "/reports/movement-history",
    icon: BarChart3,
    title: "Movement History",
    desc: "Full stock movement ledger with date range filters",
  },
  {
    href: "/reports/receiving-summary",
    icon: ArrowDownToLine,
    title: "Receiving Summary",
    desc: "Receiving volume by type and time period",
  },
  {
    href: "/reports/order-fulfillment",
    icon: ShoppingCart,
    title: "Order Fulfillment",
    desc: "Order status breakdown by channel",
  },
];

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Reports & Analytics</h2>
      <div className="grid grid-cols-2 gap-4">
        {reports.map((r) => (
          <Link key={r.href} href={r.href}>
            <Card className="cursor-pointer hover:border-amber-500/50 transition-colors">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <r.icon className="h-5 w-5 text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold">{r.title}</p>
                  <p className="text-sm text-muted-foreground">{r.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
