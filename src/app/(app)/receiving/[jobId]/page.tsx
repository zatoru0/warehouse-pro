"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Plus, Check } from "lucide-react";

function QtyCell({
  initial,
  onCommit,
}: {
  initial: number;
  onCommit: (value: number) => void;
}) {
  const [value, setValue] = useState<string>(String(initial));

  // sync local state when server value changes (after refetch)
  useEffect(() => {
    setValue(String(initial));
  }, [initial]);

  return (
    <Input
      type="number"
      min="0"
      step="any"
      className="w-24 ml-auto"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const v = Number(value);
        if (v !== initial) onCommit(v);
      }}
    />
  );
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TYPE_LABELS: Record<string, string> = {
  NEW_GOODS: "สินค้าใหม่",
  CLAIM:     "เคลม",
  REPAIR:    "ซ่อม",
  PARTS:     "อะไหล่ / ชิ้นส่วน",
  RETURN:    "คืนสินค้า",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:     "รอดำเนินการ",
  IN_PROGRESS: "กำลังดำเนินการ",
  COMPLETED:   "เสร็จสิ้น",
  CANCELLED:   "ยกเลิก",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:     "bg-red-600/10 text-red-500",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600",
  COMPLETED:   "bg-green-500/10 text-green-600",
  CANCELLED:   "bg-muted text-muted-foreground",
};

type Bin = {
  id: string;
  code: string;
  zone_code: string | null;
  warehouse: { name: string; code: string };
};
type Product = { id: string; name: string; sku: string; unit: string };
type Lot = { id: string; lot_number: string; product_id: string };

export default function ReceivingDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const router = useRouter();

  const { data: job, mutate, isLoading } = useSWR(`/api/receiving/${jobId}`, fetcher);
  const { data: products } = useSWR<{ products: Product[] }>("/api/products?limit=200", fetcher);
  const { data: binsData } = useSWR(
    job?.warehouse_id ? `/api/bins?warehouseId=${job.warehouse_id}` : null,
    fetcher
  );
  const { data: lotsData } = useSWR("/api/lots", fetcher);
  const bins: Bin[] = Array.isArray(binsData) ? binsData : [];
  const lots: Lot[] = Array.isArray(lotsData) ? lotsData : [];

  // Add line form
  const [productId, setProductId] = useState("");
  const [expectedQty, setExpectedQty] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  // Confirm
  const [confirming, setConfirming] = useState(false);

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">กำลังโหลด…</div>;
  }
  if (!job || job.error) {
    return <div className="py-20 text-center text-sm text-muted-foreground">ไม่พบงานรับสินค้า</div>;
  }

  const isCompleted = job.status === "COMPLETED" || job.status === "CANCELLED";
  const canConfirm =
    !isCompleted &&
    job.lines.length > 0 &&
    job.lines.every((l: any) => l.bin_id && l.lot_id && Number(l.received_qty) > 0);

  async function addLine(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setAdding(true);

    const res = await fetch(`/api/receiving/${jobId}/lines`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id: productId,
        expected_qty: Number(expectedQty),
      }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error?.formErrors?.[0] ?? "เกิดข้อผิดพลาด");
      setAdding(false);
      return;
    }

    setProductId("");
    setExpectedQty("");
    setAdding(false);
    await mutate();
  }

  async function updateLine(lineId: string, updates: Record<string, unknown>) {
    await fetch(`/api/receiving/${jobId}/lines`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ lineId, ...updates }),
    });
    await mutate();
  }

  async function createLot(productId: string, lineId: string) {
    const res = await fetch("/api/lots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product_id: productId }),
    });
    if (res.ok) {
      const lot = await res.json();
      await updateLine(lineId, { lot_id: lot.id });
    }
  }

  async function confirmReceiving() {
    if (!confirm("ยืนยันรับเข้าสินค้าทั้งหมด? Stock จะเพิ่มเข้าระบบทันที")) return;
    setConfirming(true);
    const res = await fetch(`/api/receiving/${jobId}/confirm`, { method: "POST" });
    if (res.ok) {
      router.refresh();
      await mutate();
    } else {
      const d = await res.json();
      alert(d.error ?? "เกิดข้อผิดพลาด");
    }
    setConfirming(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/receiving")}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
          >
            ← กลับ
          </button>
          <div>
            <p className="font-mono text-sm font-medium text-red-500">{job.job_number}</p>
            <p className="text-xs text-muted-foreground">
              {TYPE_LABELS[job.receiving_type]} • สร้างเมื่อ {format(new Date(job.created_at), "dd MMM yyyy HH:mm")}
            </p>
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[job.status]}`}>
          {STATUS_LABELS[job.status]}
        </span>
      </div>

      {/* Job info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ข้อมูลงาน</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">ประเภท</p>
            <p className="font-medium">{TYPE_LABELS[job.receiving_type]}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ผู้จัดหา</p>
            <p className="font-medium">{job.supplier?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ผู้รับเข้า</p>
            <p className="font-medium">{job.receiver.full_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">เอกสารอ้างอิง</p>
            <p className="font-medium">{job.reference_doc ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">วันที่รับเข้า</p>
            <p className="font-medium">
              {job.received_at ? format(new Date(job.received_at), "dd MMM yyyy HH:mm") : "ยังไม่รับเข้า"}
            </p>
          </div>
          {job.notes && (
            <div className="col-span-3">
              <p className="text-muted-foreground">หมายเหตุ</p>
              <p>{job.notes}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add line form */}
      {!isCompleted && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">เพิ่มรายการสินค้า</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <form onSubmit={addLine} className="grid grid-cols-[2fr_1fr_auto] gap-3">
              <div className="space-y-1">
                <Label htmlFor="product" className="text-xs">สินค้า</Label>
                <select
                  id="product"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  required
                >
                  <option value="">-- เลือกสินค้า --</option>
                  {(products?.products ?? []).map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="qty" className="text-xs">จำนวน</Label>
                <Input
                  id="qty"
                  type="number"
                  min="1"
                  step="any"
                  placeholder="0"
                  value={expectedQty}
                  onChange={(e) => setExpectedQty(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-end">
                <Button
                  type="submit"
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold"
                  disabled={adding}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {adding ? "กำลังเพิ่ม…" : "เพิ่ม"}
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
            รายการสินค้า ({job.lines.length})
            {!isCompleted && (
              <span className="ml-3 text-xs font-normal text-muted-foreground">
                — กรอกจำนวน + เลือก Bin + Lot ทุกแถว แล้วกดยืนยัน
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {job.lines.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              ยังไม่มีรายการสินค้า
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">สินค้า</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">คาดหวัง</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">รับจริง</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Bin</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">Lot</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">สถานะ</th>
                </tr>
              </thead>
              <tbody>
                {job.lines.map((line: any) => {
                  const productLots = (lots ?? []).filter((l) => l.product_id === line.product_id);
                  const ready = line.bin_id && line.lot_id && Number(line.received_qty) > 0;
                  return (
                    <tr key={line.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{line.product.name}</p>
                        <p className="text-xs text-muted-foreground">{line.product.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-muted-foreground">
                        {Number(line.expected_qty).toLocaleString()} {line.product.unit}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isCompleted ? (
                          Number(line.received_qty).toLocaleString()
                        ) : (
                          <QtyCell
                            initial={Number(line.received_qty)}
                            onCommit={(v) => updateLine(line.id, { received_qty: v })}
                          />
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isCompleted ? (
                          <span className="text-xs text-muted-foreground">
                            {bins?.find((b) => b.id === line.bin_id)?.code ?? "—"}
                          </span>
                        ) : (
                          <select
                            className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-600"
                            value={line.bin_id ?? ""}
                            onChange={(e) => updateLine(line.id, { bin_id: e.target.value })}
                          >
                            <option value="">-- เลือก --</option>
                            {(bins ?? []).map((b) => (
                              <option key={b.id} value={b.id}>
                                {b.zone_code ? `${b.zone_code} / ` : ""}{b.code}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isCompleted ? (
                          <span className="text-xs font-mono">
                            {lots?.find((l) => l.id === line.lot_id)?.lot_number ?? "—"}
                          </span>
                        ) : (
                          <div className="flex items-center gap-1">
                            <select
                              className="rounded-lg border border-border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-red-600"
                              value={line.lot_id ?? ""}
                              onChange={(e) => updateLine(line.id, { lot_id: e.target.value })}
                            >
                              <option value="">-- เลือก --</option>
                              {productLots.map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.lot_number}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => createLot(line.product_id, line.id)}
                              className="rounded-lg bg-red-600/10 px-2 py-1 text-xs text-red-500 hover:bg-red-600/20"
                              title="สร้าง Lot ใหม่"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {ready ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-600">
                            <Check className="h-3 w-3" />
                            พร้อม
                          </span>
                        ) : (
                          <span className="rounded-full bg-red-600/10 px-2 py-0.5 text-xs font-semibold text-red-500">
                            รอกรอกข้อมูล
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Confirm */}
      {!isCompleted && (
        <div className="flex justify-end gap-2">
          <Button
            disabled={!canConfirm || confirming}
            onClick={confirmReceiving}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold disabled:opacity-50"
          >
            <Check className="h-4 w-4 mr-1" />
            {confirming ? "กำลังยืนยัน…" : "ยืนยันรับเข้า (เพิ่ม Stock)"}
          </Button>
        </div>
      )}
    </div>
  );
}
