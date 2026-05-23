"use client";

import { useState } from "react";
import useSWR from "swr";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, Info } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Product = { id: string; name: string; sku: string };

export default function CreateLotSection({ lotCount }: { lotCount: number }) {
  const router = useRouter();
  const { data } = useSWR("/api/products?limit=500", fetcher);
  const products: Product[] = Array.isArray(data?.products) ? data.products : [];

  const [show, setShow] = useState(false);
  const [productId, setProductId] = useState("");
  const [mfg, setMfg] = useState("");
  const [exp, setExp] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function reset() {
    setProductId("");
    setMfg("");
    setExp("");
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!productId) {
      setError("กรุณาเลือกสินค้า");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/lots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        product_id:      productId,
        manufactured_at: mfg || null,
        expires_at:      exp || null,
      }),
    });
    if (!res.ok) {
      try {
        const d = await res.json();
        setError(d.error?.formErrors?.[0] ?? d.error ?? "เกิดข้อผิดพลาด");
      } catch {
        setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
      setSaving(false);
      return;
    }
    reset();
    setShow(false);
    setSaving(false);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">ล็อตสินค้า (Lots)</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            บาร์โค้ดแต่ละ Lot สำหรับติดสินค้าและสแกนในคลัง
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">{lotCount} ล็อต</span>
          <Button
            onClick={() => { setShow((v) => !v); setError(""); }}
            className="bg-red-600 hover:bg-red-700 text-white text-xs h-8 px-3"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            สร้าง Lot
          </Button>
        </div>
      </div>

      {show && (
        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-3">
              <div className="col-span-3 flex items-start gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>สร้างบาร์โค้ด/ล็อตเปล่า — สต็อกจะเพิ่มทีหลังตอนรับสินค้า หมายเลข Lot และบาร์โค้ดถูกสร้างให้อัตโนมัติ</span>
              </div>

              {error && (
                <div className="col-span-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">สินค้า *</Label>
                <select
                  className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  required
                >
                  <option value="">— เลือกสินค้า —</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">วันผลิต</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={mfg}
                  onChange={(e) => setMfg(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">วันหมดอายุ</Label>
                <Input
                  type="date"
                  className="h-8 text-sm"
                  value={exp}
                  onChange={(e) => setExp(e.target.value)}
                />
              </div>

              <div className="col-span-3 flex gap-2 justify-end">
                <Button
                  type="button"
                  onClick={() => { setShow(false); reset(); }}
                  className="h-8 text-xs bg-muted text-foreground hover:bg-muted/80"
                >
                  ยกเลิก
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  {saving ? "กำลังสร้าง…" : "สร้าง Lot"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
