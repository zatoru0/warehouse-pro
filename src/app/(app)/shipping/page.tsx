"use client";

import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Package, Truck, CheckCircle2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const CHANNEL_LABELS: Record<string, string> = {
  WALK_IN:  "หน้าร้าน",
  ONLINE:   "Online",
  LINE:     "Line",
  SHOPEE:   "Shopee",
  LAZADA:   "Lazada",
  TIKTOK:   "TikTok",
  FACEBOOK: "Facebook",
};

type Order = {
  id: string;
  order_number: string;
  status: string;
  channel: string;
  ordered_at: string;
  customer: { name: string } | null;
  _count: { lines: number };
};

type Shipment = {
  id: string;
  shipment_number: string;
  carrier_name: string | null;
  tracking_number: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  order: { order_number: string; channel: string };
};

export default function ShippingPage() {
  const { data: ordersData } = useSWR("/api/orders", fetcher);
  const { data: shipmentsData } = useSWR("/api/shipping", fetcher);

  const allOrders: Order[] = Array.isArray(ordersData) ? ordersData : [];
  const shipments: Shipment[] = Array.isArray(shipmentsData) ? shipmentsData : [];

  const packing = allOrders.filter((o) => o.status === "PACKING");
  const picking = allOrders.filter((o) => o.status === "PICKING");
  const shipped = shipments.filter((s) => !s.delivered_at).slice(0, 20);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">การจัดส่ง</h2>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-500/10">
              <Package className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{picking.length}</p>
              <p className="text-xs text-muted-foreground">กำลังเบิกสินค้า</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-500/10">
              <Package className="h-5 w-5 text-cyan-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{packing.length}</p>
              <p className="text-xs text-muted-foreground">รอจัดส่ง (แพ็กแล้ว)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 p-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
              <Truck className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{shipped.length}</p>
              <p className="text-xs text-muted-foreground">กำลังจัดส่ง</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* รอจัดส่ง (PACKING) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-cyan-500" />
            รอจัดส่ง — แพ็กสินค้าแล้ว ({packing.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {packing.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">ไม่มีรายการรอจัดส่ง</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">คำสั่งซื้อ</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">ลูกค้า</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">ช่องทาง</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">รายการ</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">วันที่</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {packing.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono font-semibold text-red-600">{o.order_number}</td>
                    <td className="px-4 py-3">{o.customer?.name ?? "ลูกค้าหน้าร้าน"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {CHANNEL_LABELS[o.channel] ?? o.channel}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{o._count.lines} รายการ</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(o.ordered_at), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/orders/${o.id}`}
                        className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                      >
                        <Truck className="inline h-3 w-3 mr-1" />
                        จัดส่ง
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* กำลังเบิก (PICKING) */}
      {picking.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500" />
              กำลังเบิกสินค้า ({picking.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">คำสั่งซื้อ</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">ลูกค้า</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">ช่องทาง</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">วันที่</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody>
                {picking.map((o) => (
                  <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono font-semibold">{o.order_number}</td>
                    <td className="px-4 py-3">{o.customer?.name ?? "ลูกค้าหน้าร้าน"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {CHANNEL_LABELS[o.channel] ?? o.channel}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {format(new Date(o.ordered_at), "dd/MM/yyyy")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/orders/${o.id}`}
                        className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                      >
                        ดูรายละเอียด
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Shipments ที่ยังไม่ถึงปลายทาง */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            กำลังจัดส่ง / ติดตามพัสดุ
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {shipped.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">ไม่มีพัสดุที่กำลังจัดส่ง</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">เลข Shipment</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">คำสั่งซื้อ</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">ขนส่ง</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">เลขติดตาม</th>
                  <th className="px-4 py-2 text-left font-medium text-muted-foreground">วันที่จัดส่ง</th>
                </tr>
              </thead>
              <tbody>
                {shipped.map((s) => (
                  <tr key={s.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs font-semibold">{s.shipment_number}</td>
                    <td className="px-4 py-3 font-mono text-xs text-red-600">{s.order.order_number}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.carrier_name ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{s.tracking_number ?? "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {s.shipped_at ? format(new Date(s.shipped_at), "dd/MM/yyyy HH:mm") : "—"}
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
