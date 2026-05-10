"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Plus, Trash2, Check, Truck } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_LABELS: Record<string, string> = {
  PENDING:   "รอดำเนินการ",
  CONFIRMED: "ยืนยันแล้ว",
  PICKING:   "กำลังเบิก",
  PACKING:   "กำลังแพ็ก",
  SHIPPED:   "จัดส่งแล้ว",
  DELIVERED: "ส่งถึงแล้ว",
  CANCELLED: "ยกเลิก",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:   "bg-red-600/10 text-red-600",
  CONFIRMED: "bg-blue-500/10 text-blue-600",
  PICKING:   "bg-purple-500/10 text-purple-600",
  PACKING:   "bg-cyan-500/10 text-cyan-600",
  SHIPPED:   "bg-green-500/10 text-green-600",
  DELIVERED: "bg-green-700/10 text-green-700",
  CANCELLED: "bg-muted text-muted-foreground",
};

type Product = { id: string; name: string; sku: string; unit: string; sale_price: number | null };
type Bin = { id: string; code: string; zone_code: string | null; warehouse: { name: string; code: string; type: string } };
type Lot = { id: string; lot_number: string; product_id: string };

export default function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);
  const router = useRouter();

  const { data: order, mutate, isLoading } = useSWR(`/api/orders/${orderId}`, fetcher);
  const { data: productsRes } = useSWR<{ products: Product[] }>("/api/products?limit=200", fetcher);
  const { data: binsData } = useSWR("/api/bins", fetcher);
  const { data: lotsData } = useSWR("/api/lots", fetcher);
  const bins: Bin[] = Array.isArray(binsData) ? binsData : [];
  const lots: Lot[] = Array.isArray(lotsData) ? lotsData : [];

  // Add line state
  const [productId, setProductId] = useState("");
  const [qty, setQty] = useState("");
  const [unitPrice, setUnitPrice] = useState("");
  const [adding, setAdding] = useState(false);

  // Pick state — bin/lot per line
  const [picks, setPicks] = useState<Record<string, { binId: string; lotId: string; qty: number }>>({});

  // Ship state
  const [carrierName, setCarrierName] = useState("");
  const [tracking, setTracking] = useState("");

  const [working, setWorking] = useState(false);
  const [error, setError] = useState("");

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">กำลังโหลด…</div>;
  }
  if (!order || order.error) {
    return <div className="py-20 text-center text-sm text-muted-foreground">ไม่พบคำสั่งซื้อ</div>;
  }

  const isPending   = order.status === "PENDING";
  const isConfirmed = order.status === "CONFIRMED";
  const isPicking   = order.status === "PICKING";
  const isPacking   = order.status === "PACKING";
  const isFinal     = ["SHIPPED", "DELIVERED", "CANCELLED"].includes(order.status);

  // ─── Helpers ─────────────────────────────────────────────────────────────
  async function callAction(path: string, body?: unknown) {
    setError("");
    setWorking(true);
    const res = await fetch(`/api/orders/${orderId}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "เกิดข้อผิดพลาด");
    }
    setWorking(false);
    await mutate();
  }

  async function addLine(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setAdding(true);
    setError("");
    const product = productsRes?.products.find((p) => p.id === productId);
    const res = await fetch(`/api/orders/${orderId}/lines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        qty:        Number(qty),
        unit_price: Number(unitPrice) || Number(product?.sale_price ?? 0),
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error?.formErrors?.[0] ?? "เกิดข้อผิดพลาด");
    } else {
      setProductId(""); setQty(""); setUnitPrice("");
    }
    setAdding(false);
    await mutate();
  }

  async function removeLine(lineId: string) {
    if (!confirm("ลบรายการนี้?")) return;
    await fetch(`/api/orders/${orderId}/lines?lineId=${lineId}`, { method: "DELETE" });
    await mutate();
  }

  function setPick(lineId: string, field: "binId" | "lotId" | "qty", value: string | number) {
    setPicks((prev) => ({
      ...prev,
      [lineId]: { ...prev[lineId] ?? { binId: "", lotId: "", qty: 0 }, [field]: value },
    }));
  }

  async function doPick() {
    const list = order.lines.map((l: { id: string; qty: number }) => {
      const p = picks[l.id];
      return p ? { lineId: l.id, binId: p.binId, lotId: p.lotId, qty: Number(p.qty) || Number(l.qty) } : null;
    }).filter(Boolean);

    if (list.length !== order.lines.length || list.some((p: { binId: string; lotId: string }) => !p.binId || !p.lotId)) {
      setError("ต้องระบุ Bin + Lot ให้ครบทุกรายการ");
      return;
    }
    await callAction("pick", { picks: list });
  }

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/orders")}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
          >
            ← กลับ
          </button>
          <div>
            <p className="font-mono text-sm font-medium text-red-600">{order.order_number}</p>
            <p className="text-xs text-muted-foreground">
              {order.channel} • {order.customer?.name ?? "ลูกค้าหน้าร้าน"} • {format(new Date(order.ordered_at), "dd MMM yyyy HH:mm")}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[order.status]}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* Add line form (only when PENDING) */}
      {isPending && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">เพิ่มรายการสินค้า</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={addLine} className="grid grid-cols-[2fr_1fr_1fr_auto] gap-3">
              <div className="space-y-1">
                <Label className="text-xs">สินค้า</Label>
                <select
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                  value={productId}
                  onChange={(e) => {
                    setProductId(e.target.value);
                    const p = productsRes?.products.find((x) => x.id === e.target.value);
                    if (p?.sale_price) setUnitPrice(String(p.sale_price));
                  }}
                  required
                >
                  <option value="">-- เลือกสินค้า --</option>
                  {(productsRes?.products ?? []).map((p) => (
                    <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">จำนวน</Label>
                <Input type="number" min="1" step="any" value={qty} onChange={(e) => setQty(e.target.value)} required />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">ราคา/หน่วย</Label>
                <Input type="number" min="0" step="any" value={unitPrice} onChange={(e) => setUnitPrice(e.target.value)} required />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                  disabled={adding}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  เพิ่ม
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Lines */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">
            รายการสินค้า ({order.lines.length})
            {isConfirmed && (
              <span className="ml-3 text-xs font-normal text-muted-foreground">
                — เลือก Bin + Lot สำหรับแต่ละรายการเพื่อเบิกสินค้า
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {order.lines.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              ยังไม่มีรายการสินค้า
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">สินค้า</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">จำนวน</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">ราคา</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">รวม</th>
                  {isConfirmed && (
                    <>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Bin</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Lot</th>
                    </>
                  )}
                  {isPending && <th className="px-4 py-2" />}
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line: { id: string; product_id: string; qty: number; unit_price: number; product: { name: string; sku: string; unit: string } }) => {
                  const productLots = (lots ?? []).filter((l) => l.product_id === line.product_id);
                  const total = Number(line.qty) * Number(line.unit_price);
                  return (
                    <tr key={line.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{line.product.name}</p>
                        <p className="text-xs text-muted-foreground">{line.product.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {Number(line.qty).toLocaleString()} {line.product.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        ฿{Number(line.unit_price).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        ฿{total.toLocaleString()}
                      </td>
                      {isConfirmed && (
                        <>
                          <td className="px-4 py-3">
                            <select
                              className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                              value={picks[line.id]?.binId ?? ""}
                              onChange={(e) => setPick(line.id, "binId", e.target.value)}
                            >
                              <option value="">-- เลือก --</option>
                              {(bins ?? []).map((b) => (
                                <option key={b.id} value={b.id}>
                                  {b.warehouse.code} / {b.code}
                                </option>
                              ))}
                            </select>
                          </td>
                          <td className="px-4 py-3">
                            <select
                              className="rounded-lg border border-border bg-background px-2 py-1 text-xs"
                              value={picks[line.id]?.lotId ?? ""}
                              onChange={(e) => setPick(line.id, "lotId", e.target.value)}
                            >
                              <option value="">-- เลือก --</option>
                              {productLots.map((l) => (
                                <option key={l.id} value={l.id}>{l.lot_number}</option>
                              ))}
                            </select>
                          </td>
                        </>
                      )}
                      {isPending && (
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => removeLine(line.id)}
                            className="rounded-lg p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
                <tr className="bg-muted/30 font-semibold">
                  <td colSpan={3} className="px-4 py-3 text-right">ยอดรวม</td>
                  <td className="px-4 py-3 text-right">
                    ฿{order.lines.reduce((sum: number, l: { qty: number; unit_price: number }) =>
                      sum + Number(l.qty) * Number(l.unit_price), 0
                    ).toLocaleString()}
                  </td>
                  {(isConfirmed || isPending) && <td colSpan={2} />}
                </tr>
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Action panels per status */}
      {isPending && order.lines.length > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => callAction("confirm")}
            disabled={working}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
          >
            <Check className="h-4 w-4 mr-1" />
            ยืนยันคำสั่งซื้อ
          </Button>
        </div>
      )}

      {isConfirmed && (
        <div className="flex justify-end">
          <Button
            onClick={doPick}
            disabled={working}
            className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
          >
            <Check className="h-4 w-4 mr-1" />
            ยืนยันเบิกสินค้า (หัก Stock)
          </Button>
        </div>
      )}

      {isPicking && (
        <Card>
          <CardContent className="flex items-center justify-between py-6">
            <p className="text-sm text-muted-foreground">เบิกสินค้าเสร็จแล้ว — กดเพื่อเริ่มแพ็กสินค้า</p>
            <Button
              onClick={() => callAction("pack")}
              disabled={working}
              className="bg-cyan-600 hover:bg-cyan-700 text-white font-semibold"
            >
              <Check className="h-4 w-4 mr-1" />
              เริ่มแพ็กสินค้า
            </Button>
          </CardContent>
        </Card>
      )}

      {isPacking && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">บันทึกการจัดส่ง</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="carrier">ผู้ให้บริการขนส่ง</Label>
                <Input
                  id="carrier"
                  placeholder="Kerry, Flash, Shopee Express ฯลฯ"
                  value={carrierName}
                  onChange={(e) => setCarrierName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tracking">เลขติดตามพัสดุ</Label>
                <Input
                  id="tracking"
                  placeholder="TRK1234567890"
                  value={tracking}
                  onChange={(e) => setTracking(e.target.value)}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                onClick={() => callAction("ship", { carrier_name: carrierName || null, tracking_number: tracking || null })}
                disabled={working}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                <Truck className="h-4 w-4 mr-1" />
                บันทึกจัดส่ง
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isFinal && order.shipments.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">ข้อมูลการจัดส่ง</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">เลขที่ Shipment</p>
              <p className="font-mono">{order.shipments[0].shipment_number}</p>
            </div>
            <div>
              <p className="text-muted-foreground">ผู้ให้บริการ</p>
              <p className="font-medium">{order.shipments[0].carrier_name ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">เลขติดตาม</p>
              <p className="font-mono">{order.shipments[0].tracking_number ?? "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">วันที่จัดส่ง</p>
              <p>{order.shipments[0].shipped_at ? format(new Date(order.shipments[0].shipped_at), "dd MMM yyyy HH:mm") : "—"}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
