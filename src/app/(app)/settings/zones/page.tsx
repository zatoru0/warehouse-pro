"use client";

import useSWR from "swr";
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Plus, MapPin, Building2, Box, AlertCircle } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Warehouse = { id: string; code: string; name: string; type: string };
type Bin = { id: string; code: string; zone_code: string | null; status: string };

const BIN_STATUS_COLORS: Record<string, string> = {
  AVAILABLE: "bg-green-500/10 text-green-600",
  OCCUPIED:  "bg-blue-500/10 text-blue-600",
  RESERVED:  "bg-amber-500/10 text-amber-600",
  BLOCKED:   "bg-red-500/10 text-red-600",
};

export default function ZonesPage() {
  const { data: warehousesData } = useSWR<Warehouse[]>("/api/warehouses", fetcher);
  const warehouses = Array.isArray(warehousesData) ? warehousesData : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">โซน / พื้นที่ในคลัง (Zone / Area)</h2>
          <p className="text-xs text-muted-foreground">
            จัดกลุ่ม Bin ตามโซนภายในคลัง — แต่ละคลังมีหลายโซน แต่ละโซนมีหลาย Bin
          </p>
        </div>
      </div>

      <div className="flex gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-700">
        <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
        <p>
          <strong>ข้อจำกัด:</strong> Zone ปัจจุบันเก็บเป็น string field ของ Bin ไม่ได้แยกเป็น table —
          การ "สร้างโซน" คือการเพิ่ม Bin แรกในโซนนั้น และ "ลบโซน" ทำไม่ได้ตรงๆ (ต้องลบ Bin ทั้งหมดในโซน)
        </p>
      </div>

      {warehouses.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Building2 className="mx-auto mb-3 h-10 w-10 opacity-30" />
            <p>ยังไม่มีคลัง</p>
            <p className="text-xs mt-1">เพิ่มคลังที่ <a href="/warehouses" className="text-red-600 hover:underline">/warehouses</a> ก่อน</p>
          </CardContent>
        </Card>
      ) : (
        warehouses.map((w) => <WarehouseZones key={w.id} warehouse={w} />)
      )}
    </div>
  );
}

function WarehouseZones({ warehouse }: { warehouse: Warehouse }) {
  const { data: binsData, mutate } = useSWR<Bin[]>(`/api/bins?warehouseId=${warehouse.id}`, fetcher);
  const bins = Array.isArray(binsData) ? binsData : [];

  const zoneMap = new Map<string, Bin[]>();
  for (const b of bins) {
    const key = b.zone_code ?? "(ไม่ระบุโซน)";
    if (!zoneMap.has(key)) zoneMap.set(key, []);
    zoneMap.get(key)!.push(b);
  }
  const zones = Array.from(zoneMap.entries()).sort(([a], [b]) => a.localeCompare(b));

  const [showAddZone, setShowAddZone] = useState(false);

  return (
    <Card>
      <CardContent className="p-0">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="font-semibold">{warehouse.name}</p>
              <p className="text-[11px] font-mono text-muted-foreground">{warehouse.code}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <p className="text-xs text-muted-foreground">
              {zones.length} โซน · {bins.length} bin
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddZone((s) => !s)}
              className="h-8"
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> โซนใหม่
            </Button>
          </div>
        </div>

        {showAddZone && (
          <AddZoneForm
            warehouseId={warehouse.id}
            onDone={() => { setShowAddZone(false); mutate(); }}
          />
        )}

        {zones.length === 0 && !showAddZone ? (
          <p className="py-8 text-center text-xs text-muted-foreground">ยังไม่มี Bin ในคลังนี้</p>
        ) : (
          <div className="divide-y divide-border">
            {zones.map(([zone, zoneBins]) => (
              <ZoneRow
                key={zone}
                warehouseId={warehouse.id}
                zone={zone}
                bins={zoneBins}
                onChange={mutate}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ZoneRow({
  warehouseId, zone, bins, onChange,
}: {
  warehouseId: string;
  zone: string;
  bins: Bin[];
  onChange: () => void;
}) {
  const [showAddBin, setShowAddBin] = useState(false);

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-amber-600" />
          <p className="text-sm font-medium">{zone}</p>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
            {bins.length} bin
          </span>
        </div>
        <Button
          size="sm" variant="ghost"
          onClick={() => setShowAddBin((s) => !s)}
          className="h-7 text-xs"
        >
          <Plus className="h-3 w-3 mr-1" /> เพิ่ม Bin
        </Button>
      </div>

      <div className="mt-2 ml-5 flex flex-wrap gap-1.5">
        {bins.map((b) => (
          <div
            key={b.id}
            className="flex items-center gap-1.5 rounded-md border border-border bg-background px-2 py-1 text-xs"
          >
            <Box className="h-3 w-3 text-muted-foreground" />
            <span className="font-mono">{b.code}</span>
            <span className={`rounded-full px-1.5 py-0 text-[10px] ${BIN_STATUS_COLORS[b.status]}`}>
              {b.status}
            </span>
          </div>
        ))}
      </div>

      {showAddBin && (
        <AddBinForm
          warehouseId={warehouseId}
          presetZone={zone === "(ไม่ระบุโซน)" ? "" : zone}
          onDone={() => { setShowAddBin(false); onChange(); }}
        />
      )}
    </div>
  );
}

function AddZoneForm({
  warehouseId, onDone,
}: {
  warehouseId: string; onDone: () => void;
}) {
  const [zoneCode, setZoneCode] = useState("");
  const [binCode,  setBinCode]  = useState("");
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!zoneCode.trim() || !binCode.trim()) {
      setError("กรอกชื่อโซน และรหัส Bin แรก");
      return;
    }
    setSaving(true);
    const res = await fetch("/api/bins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        warehouse_id: warehouseId,
        code: binCode.trim(),
        zone_code: zoneCode.trim(),
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "เกิดข้อผิดพลาด");
      return;
    }
    setZoneCode(""); setBinCode("");
    onDone();
  }

  return (
    <form onSubmit={submit} className="border-b border-border bg-muted/30 px-4 py-3 space-y-2">
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <div className="space-y-1">
          <Label className="text-[11px]">ชื่อโซน *</Label>
          <Input value={zoneCode} onChange={(e) => setZoneCode(e.target.value)} placeholder="เช่น Z01, A-Section" />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">รหัส Bin แรก *</Label>
          <Input value={binCode} onChange={(e) => setBinCode(e.target.value)} placeholder="เช่น A01-01" />
        </div>
        <Button type="submit" disabled={saving} className="self-end bg-red-600 hover:bg-red-700 text-white">
          {saving ? "..." : "สร้าง"}
        </Button>
      </div>
    </form>
  );
}

function AddBinForm({
  warehouseId, presetZone, onDone,
}: {
  warehouseId: string; presetZone: string; onDone: () => void;
}) {
  const [binCode, setBinCode] = useState("");
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!binCode.trim()) { setError("กรอกรหัส Bin"); return; }
    setSaving(true);
    const res = await fetch("/api/bins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        warehouse_id: warehouseId,
        code: binCode.trim(),
        zone_code: presetZone || null,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "เกิดข้อผิดพลาด");
      return;
    }
    setBinCode("");
    onDone();
  }

  return (
    <form onSubmit={submit} className="ml-5 mt-2 flex items-end gap-2">
      <div className="space-y-1 flex-1 max-w-[180px]">
        <Label className="text-[11px]">รหัส Bin</Label>
        <Input value={binCode} onChange={(e) => setBinCode(e.target.value)} placeholder="A01-02" />
      </div>
      <Button type="submit" disabled={saving} size="sm" className="bg-red-600 hover:bg-red-700 text-white h-8">
        {saving ? "..." : "เพิ่ม"}
      </Button>
      {error && <p className="text-xs text-destructive self-center">{error}</p>}
    </form>
  );
}
