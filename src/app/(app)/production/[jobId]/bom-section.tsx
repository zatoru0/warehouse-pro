"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Truck, X } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Product = { id: string; name: string; sku: string; unit: string };
type StockBin = { code: string; warehouse: { name: string; type: string } };
type Lot = { id: string; lot_number: string; product_id: string };

type BomLine = {
  id: string;
  material_product_id: string;
  qty_required: string | number;
  qty_issued: string | number;
  material: { name: string; sku: string; unit: string };
};

interface Props {
  jobId: string;
  bomLines: BomLine[];
  isEditable: boolean;     // เพิ่ม/ลบรายการได้ (PENDING, IN_PROGRESS)
  isIssuable: boolean;     // เบิกของได้ (IN_PROGRESS)
  onChange: () => Promise<unknown> | unknown;
}

export function BomSection({ jobId, bomLines, isEditable, isIssuable, onChange }: Props) {
  const { data: productsData } = useSWR<{ products: Product[] }>("/api/products?limit=200", fetcher);
  const products: Product[] = productsData?.products ?? [];

  const [materialId, setMaterialId] = useState("");
  const [qty, setQty] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");

  // Issue modal state
  const [issuing, setIssuing] = useState<BomLine | null>(null);

  async function addLine(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setAdding(true);
    const res = await fetch(`/api/production/${jobId}/bom`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ material_product_id: materialId, qty_required: Number(qty) }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error?.formErrors?.[0] ?? "เพิ่มไม่สำเร็จ");
      setAdding(false);
      return;
    }
    setMaterialId("");
    setQty("");
    setAdding(false);
    await onChange();
  }

  async function removeLine(lineId: string) {
    if (!confirm("ลบรายการนี้?")) return;
    const res = await fetch(`/api/production/${jobId}/bom?lineId=${lineId}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "ลบไม่สำเร็จ");
      return;
    }
    await onChange();
  }

  const totalRequired = bomLines.reduce((s, l) => s + Number(l.qty_required), 0);
  const totalIssued   = bomLines.reduce((s, l) => s + Number(l.qty_issued), 0);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center justify-between">
            <span>วัตถุดิบที่ต้องใช้ (BOM)</span>
            {bomLines.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">
                เบิกแล้ว {totalIssued.toLocaleString()} / {totalRequired.toLocaleString()} หน่วยรวม
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {bomLines.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              ยังไม่มีรายการวัตถุดิบ
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">วัตถุดิบ</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">ต้องใช้</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">เบิกแล้ว</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">คงเหลือ</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground" />
                </tr>
              </thead>
              <tbody>
                {bomLines.map((line) => {
                  const required = Number(line.qty_required);
                  const issued   = Number(line.qty_issued);
                  const remain   = required - issued;
                  const done     = remain <= 0;
                  return (
                    <tr key={line.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3">
                        <p className="font-medium">{line.material.name}</p>
                        <p className="text-xs text-muted-foreground">{line.material.sku}</p>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {required.toLocaleString()} {line.material.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-blue-600 font-medium">
                        {issued.toLocaleString()}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${done ? "text-green-600" : "text-red-600"}`}>
                        {done ? "ครบ" : remain.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-1.5">
                          {isIssuable && !done && (
                            <button
                              onClick={() => setIssuing(line)}
                              className="flex items-center gap-1 rounded-lg bg-blue-600/10 px-2 py-1 text-xs font-semibold text-blue-600 hover:bg-blue-600/20"
                            >
                              <Truck className="h-3 w-3" />
                              เบิก
                            </button>
                          )}
                          {isEditable && issued === 0 && (
                            <button
                              onClick={() => removeLine(line.id)}
                              className="rounded-lg bg-muted px-2 py-1 text-xs text-muted-foreground hover:bg-muted/70"
                              title="ลบรายการ"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Add line form */}
      {isEditable && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">เพิ่มวัตถุดิบ</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <form onSubmit={addLine} className="grid grid-cols-[2fr_1fr_auto] gap-3">
              <div className="space-y-1">
                <Label htmlFor="material" className="text-xs">วัตถุดิบ</Label>
                <select
                  id="material"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                  value={materialId}
                  onChange={(e) => setMaterialId(e.target.value)}
                  required
                >
                  <option value="">-- เลือกวัตถุดิบ --</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="bom-qty" className="text-xs">จำนวนที่ต้องใช้</Label>
                <Input
                  id="bom-qty"
                  type="number"
                  min="0"
                  step="any"
                  placeholder="0"
                  value={qty}
                  onChange={(e) => setQty(e.target.value)}
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

      {issuing && (
        <IssueModal
          jobId={jobId}
          line={issuing}
          onClose={() => setIssuing(null)}
          onSuccess={async () => {
            setIssuing(null);
            await onChange();
          }}
        />
      )}
    </>
  );
}

function IssueModal({
  jobId,
  line,
  onClose,
  onSuccess,
}: {
  jobId: string;
  line: BomLine;
  onClose: () => void;
  onSuccess: () => Promise<void> | void;
}) {
  const remaining = Number(line.qty_required) - Number(line.qty_issued);
  const { data: lotsData } = useSWR<Lot[]>("/api/lots", fetcher);
  const lots = (Array.isArray(lotsData) ? lotsData : []).filter(
    (l) => l.product_id === line.material_product_id
  );

  const [lotId, setLotId] = useState("");
  const [binId, setBinId] = useState("");
  const [qty, setQty] = useState(String(remaining));
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // bins ของวัตถุดิบที่มี stock จาก lot ที่เลือก
  const { data: stockItems } = useSWR<{ bin_id: string; qty_on_hand: number | string; bin: StockBin }[]>(
    lotId ? `/api/stock?productId=${line.material_product_id}&lotId=${lotId}` : null,
    fetcher
  );
  const availableBins = (stockItems ?? []).filter((s) => Number(s.qty_on_hand) > 0);

  async function submit() {
    setError("");
    setSubmitting(true);
    const res = await fetch(`/api/production/${jobId}/bom/issue`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        line_id:     line.id,
        lot_id:      lotId,
        from_bin_id: binId,
        qty:         Number(qty),
        notes:       notes || undefined,
      }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "เบิกไม่สำเร็จ");
      setSubmitting(false);
      return;
    }
    setSubmitting(false);
    await onSuccess();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-background p-5 shadow-xl">
        <h3 className="mb-1 text-base font-semibold">เบิกวัตถุดิบ</h3>
        <p className="mb-4 text-sm text-muted-foreground">
          {line.material.name} — เหลือเบิก {remaining.toLocaleString()} {line.material.unit}
        </p>

        {error && (
          <div className="mb-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div className="space-y-1">
            <Label className="text-xs">ล็อต</Label>
            <select
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
              value={lotId}
              onChange={(e) => { setLotId(e.target.value); setBinId(""); }}
            >
              <option value="">-- เลือกล็อต --</option>
              {lots.map((l) => (
                <option key={l.id} value={l.id}>{l.lot_number}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Bin ต้นทาง (เหลือในสต็อก)</Label>
            <select
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50 disabled:opacity-50"
              value={binId}
              onChange={(e) => setBinId(e.target.value)}
              disabled={!lotId}
            >
              <option value="">-- เลือก Bin --</option>
              {availableBins.map((s) => (
                <option key={s.bin_id} value={s.bin_id}>
                  {s.bin.warehouse.name} / {s.bin.code} — มี {Number(s.qty_on_hand).toLocaleString()}
                </option>
              ))}
            </select>
            {lotId && availableBins.length === 0 && (
              <p className="text-xs text-destructive">ไม่มี stock ในล็อตนี้</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">จำนวนที่เบิก</Label>
            <Input
              type="number"
              min="0"
              step="any"
              max={remaining}
              value={qty}
              onChange={(e) => setQty(e.target.value)}
            />
          </div>

          <div className="space-y-1">
            <Label className="text-xs">หมายเหตุ</Label>
            <Input
              placeholder="ไม่บังคับ"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button onClick={onClose} className="bg-muted text-foreground hover:bg-muted/80">
            ยกเลิก
          </Button>
          <Button
            onClick={submit}
            disabled={!lotId || !binId || !qty || submitting}
            className="bg-blue-600 text-white hover:bg-blue-700 font-semibold"
          >
            {submitting ? "กำลังเบิก…" : "ยืนยันเบิก"}
          </Button>
        </div>
      </div>
    </div>
  );
}
