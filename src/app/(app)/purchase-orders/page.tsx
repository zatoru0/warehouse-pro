"use client";

import useSWR from "swr";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, FileText } from "lucide-react";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_LABELS: Record<string, string> = {
  DRAFT:     "ร่าง",
  SENT:      "ส่งแล้ว",
  PARTIAL:   "รับบางส่วน",
  COMPLETED: "เสร็จสิ้น",
  CANCELLED: "ยกเลิก",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-muted text-muted-foreground",
  SENT:      "bg-blue-500/10 text-blue-600",
  PARTIAL:   "bg-amber-500/10 text-amber-600",
  COMPLETED: "bg-green-500/10 text-green-600",
  CANCELLED: "bg-red-500/10 text-red-600",
};

type PO = {
  id: string;
  po_number: string;
  status: string;
  supplier: { name: string; code: string };
  creator: { full_name: string };
  total_amount: string | null;
  expected_date: string | null;
  created_at: string;
  _count: { lines: number };
};

export default function PurchaseOrdersPage() {
  const { data } = useSWR("/api/purchase-orders", fetcher);
  const orders: PO[] = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ใบสั่งซื้อ (PO)</h2>
        <Link href="/purchase-orders/new">
          <Button className="bg-red-600 hover:bg-red-700 text-white text-[0.8rem] font-semibold h-8 px-3">
            <Plus className="h-3.5 w-3.5 mr-1" />
            สร้าง PO
          </Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-0">
          {orders.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <FileText className="h-10 w-10 mb-3 opacity-30" />
              <p>ยังไม่มีใบสั่งซื้อ</p>
              <p className="text-sm mt-1">กด "สร้าง PO" เพื่อเริ่มต้น</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">เลข PO</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">ผู้จัดหา</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">รายการ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">มูลค่า</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">กำหนดรับ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่สร้าง</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((po) => (
                  <tr key={po.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <Link href={`/purchase-orders/${po.id}`} className="font-mono font-semibold text-red-600 hover:underline">
                        {po.po_number}
                      </Link>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{po.supplier.name}</p>
                      <p className="text-xs text-muted-foreground">{po.supplier.code}</p>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{po._count.lines} รายการ</td>
                    <td className="px-4 py-3 font-medium">
                      {po.total_amount ? `฿${Number(po.total_amount).toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {po.expected_date ? format(new Date(po.expected_date), "dd/MM/yyyy") : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[po.status]}`}>
                        {STATUS_LABELS[po.status] ?? po.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(po.created_at), "dd/MM/yyyy")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
