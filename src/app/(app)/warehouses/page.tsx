"use client";

import { useState } from "react";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, ChevronDown, ChevronRight, Building2 } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const WAREHOUSE_COLORS: Record<string, string> = {
  STOCK:             "bg-blue-500/10 text-blue-600",
  PRODUCTION_REPAIR: "bg-red-600/10 text-red-600",
  QC:                "bg-purple-500/10 text-purple-600",
  READY:             "bg-green-500/10 text-green-600",
  SHIPPING:          "bg-cyan-500/10 text-cyan-600",
};

const WAREHOUSE_TYPE_LABELS: Record<string, string> = {
  STOCK:             "สต็อก",
  PRODUCTION_REPAIR: "ผลิต/ซ่อม",
  QC:                "ตรวจสอบ",
  READY:             "พร้อมจำหน่าย",
  SHIPPING:          "จัดส่ง",
};

const WAREHOUSE_TYPES = Object.entries(WAREHOUSE_TYPE_LABELS);

type Warehouse = {
  id: string;
  code: string;
  name: string;
  name_th: string | null;
  type: string;
  _count: { bins: number };
};

type Bin = {
  id: string;
  code: string;
  zone_code: string | null;
  status: string;
};

function BinList({ warehouseId }: { warehouseId: string }) {
  const { data: binsData, mutate } = useSWR(`/api/bins?warehouseId=${warehouseId}`, fetcher);
  const bins: Bin[] = Array.isArray(binsData) ? binsData : [];
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [zone, setZone] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function addBin(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/bins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ warehouse_id: warehouseId, code: code.toUpperCase(), zone_code: zone || null }),
    });
    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "เกิดข้อผิดพลาด");
    } else {
      setCode(""); setZone(""); setShowForm(false);
      await mutate();
    }
    setSaving(false);
  }

  return (
    <div className="mt-3 space-y-2">
      {(bins ?? []).length > 0 && (
        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Bin</th>
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">Zone</th>
                <th className="px-3 py-1.5 text-left font-medium text-muted-foreground">สถานะ</th>
              </tr>
            </thead>
            <tbody>
              {(bins ?? []).map((b) => (
                <tr key={b.id} className="border-b border-border last:border-0">
                  <td className="px-3 py-1.5 font-mono font-medium">{b.code}</td>
                  <td className="px-3 py-1.5 text-muted-foreground">{b.zone_code ?? "—"}</td>
                  <td className="px-3 py-1.5">
                    <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                      b.status === "AVAILABLE" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"
                    }`}>
                      {b.status === "AVAILABLE" ? "ว่าง" : b.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm ? (
        <form onSubmit={addBin} className="rounded-lg border border-dashed border-red-300 bg-red-600/5 p-3 space-y-2">
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <Label className="text-xs">รหัส Bin *</Label>
              <Input
                className="h-7 text-xs"
                placeholder="RACK-A-01"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Zone (ไม่บังคับ)</Label>
              <Input
                className="h-7 text-xs"
                placeholder="A"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
              />
            </div>
          </div>
          <div className="flex gap-1.5">
            <Button type="submit" disabled={saving} className="h-7 text-xs bg-red-600 hover:bg-red-700 text-white">
              {saving ? "กำลังเพิ่ม…" : "เพิ่ม Bin"}
            </Button>
            <Button type="button" onClick={() => setShowForm(false)} className="h-7 text-xs bg-muted text-foreground hover:bg-muted/80">
              ยกเลิก
            </Button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-red-500"
        >
          <Plus className="h-3 w-3" />
          เพิ่ม Bin
        </button>
      )}
    </div>
  );
}

function WarehouseCard({ wh }: { wh: Warehouse }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className="font-semibold">{wh.name_th ?? wh.name}</p>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${WAREHOUSE_COLORS[wh.type] ?? ""}`}>
                {WAREHOUSE_TYPE_LABELS[wh.type] ?? wh.type}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{wh.code}</p>
          </div>
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
          >
            <span className="font-semibold">{wh._count.bins}</span>
            <span>Bins</span>
            {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
          </button>
        </div>

        {expanded && <BinList warehouseId={wh.id} />}
      </CardContent>
    </Card>
  );
}

export default function WarehousesPage() {
  const { data: warehousesData, mutate } = useSWR("/api/warehouses", fetcher);
  const warehouses: Warehouse[] = Array.isArray(warehousesData) ? warehousesData : [];
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ code: "", name: "", name_th: "", type: "STOCK" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function createWarehouse(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch("/api/warehouses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, name_th: form.name_th || null }),
    });
    if (!res.ok) {
      try {
        const d = await res.json();
        setError(d.error?.formErrors?.[0] ?? d.error ?? "เกิดข้อผิดพลาด");
      } catch {
        setError("เกิดข้อผิดพลาด กรุณาลองใหม่");
      }
    } else {
      setForm({ code: "", name: "", name_th: "", type: "STOCK" });
      setShowForm(false);
      await mutate();
    }
    setSaving(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">คลังสินค้า</h2>
        <Button
          onClick={() => setShowForm((v) => !v)}
          className="bg-red-600 hover:bg-red-700 text-white text-[0.8rem] font-semibold h-8 px-3"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          เพิ่มคลัง
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">สร้างคลังใหม่</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={createWarehouse} className="grid grid-cols-2 gap-4">
              {error && (
                <div className="col-span-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="wh-code">รหัสคลัง *</Label>
                <Input
                  id="wh-code"
                  placeholder="WH-001"
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-type">ประเภทคลัง *</Label>
                <select
                  id="wh-type"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                  required
                >
                  {WAREHOUSE_TYPES.map(([val, label]) => (
                    <option key={val} value={val}>{label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-name">ชื่อคลัง (อังกฤษ) *</Label>
                <Input
                  id="wh-name"
                  placeholder="Main Stock"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wh-name-th">ชื่อคลัง (ไทย)</Label>
                <Input
                  id="wh-name-th"
                  placeholder="คลังสต็อกหลัก"
                  value={form.name_th}
                  onChange={(e) => setForm((f) => ({ ...f, name_th: e.target.value }))}
                />
              </div>
              <div className="col-span-2 flex gap-2 justify-end">
                <Button type="button" onClick={() => setShowForm(false)} className="bg-muted hover:bg-muted/80 text-foreground">
                  ยกเลิก
                </Button>
                <Button type="submit" disabled={saving} className="bg-red-600 hover:bg-red-700 text-white font-semibold">
                  {saving ? "กำลังสร้าง…" : "สร้างคลัง"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {(warehouses ?? []).length === 0 && !showForm && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Building2 className="h-10 w-10 mb-3 opacity-30" />
          <p>ยังไม่มีคลังสินค้า</p>
          <p className="text-sm mt-1">กด &ldquo;เพิ่มคลัง&rdquo; หรือรัน seed เพื่อสร้างคลังเริ่มต้น</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        {(warehouses ?? []).map((wh) => (
          <WarehouseCard key={wh.id} wh={wh} />
        ))}
      </div>
    </div>
  );
}
