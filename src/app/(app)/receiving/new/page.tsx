"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TYPE_OPTIONS = [
  { value: "NEW_GOODS", label: "สินค้าใหม่" },
  { value: "CLAIM",     label: "เคลม" },
  { value: "REPAIR",    label: "ซ่อม" },
  { value: "PARTS",     label: "อะไหล่ / ชิ้นส่วน" },
  { value: "RETURN",    label: "คืนสินค้า" },
];

type Warehouse = { id: string; name: string; code: string; type: string };
type Supplier = { id: string; name: string; code: string };

export default function NewReceivingPage() {
  const router = useRouter();
  const { data: warehousesData } = useSWR("/api/warehouses", fetcher);
  const { data: suppliersData } = useSWR("/api/suppliers", fetcher);
  const warehouses: Warehouse[] = Array.isArray(warehousesData) ? warehousesData : [];
  const suppliers: Supplier[] = Array.isArray(suppliersData) ? suppliersData : [];

  const [type, setType] = useState("NEW_GOODS");
  const [warehouseId, setWarehouseId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [referenceDoc, setReferenceDoc] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/receiving", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiving_type: type,
        warehouse_id: warehouseId,
        supplier_id: supplierId || null,
        reference_doc: referenceDoc || null,
        notes: notes || null,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error?.formErrors?.[0] ?? "เกิดข้อผิดพลาด");
      setSubmitting(false);
      return;
    }

    router.push(`/receiving/${data.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          ← กลับ
        </button>
        <h2 className="text-lg font-semibold">สร้างงานรับสินค้าใหม่</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ข้อมูลงานรับสินค้า</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            {/* ประเภทการรับเข้า */}
            <div className="space-y-2">
              <Label htmlFor="type">ประเภทการรับเข้า</Label>
              <select
                id="type"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={type}
                onChange={(e) => setType(e.target.value)}
                required
              >
                {TYPE_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {/* คลังปลายทาง */}
            <div className="space-y-2">
              <Label htmlFor="warehouse">คลังปลายทาง</Label>
              <select
                id="warehouse"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                required
              >
                <option value="">-- เลือกคลัง --</option>
                {(warehouses ?? []).map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({w.code})
                  </option>
                ))}
              </select>
            </div>

            {/* ผู้จัดหา (optional) */}
            <div className="space-y-2">
              <Label htmlFor="supplier">ผู้จัดหา (ไม่บังคับ)</Label>
              <select
                id="supplier"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
              >
                <option value="">-- ไม่ระบุ --</option>
                {(suppliers ?? []).map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* เอกสารอ้างอิง */}
            <div className="space-y-2">
              <Label htmlFor="ref">เอกสารอ้างอิง (PO, Invoice, etc.)</Label>
              <Input
                id="ref"
                placeholder="PO-2026-0001"
                value={referenceDoc}
                onChange={(e) => setReferenceDoc(e.target.value)}
              />
            </div>

            {/* หมายเหตุ */}
            <div className="space-y-2">
              <Label htmlFor="notes">หมายเหตุ</Label>
              <textarea
                id="notes"
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                disabled={submitting}
              >
                {submitting ? "กำลังสร้าง…" : "สร้างงานรับสินค้า"}
              </Button>
              <Button
                type="button"
                onClick={() => router.back()}
                className="bg-muted hover:bg-muted/80 text-foreground"
              >
                ยกเลิก
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
