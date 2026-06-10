"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Printer, QrCode, MoreVertical, Pencil, ShieldAlert, CalendarX, PackageCheck, RotateCcw, Trash2, X } from "lucide-react";
import type { LotStatus } from "@prisma/client";

export type LotRow = {
  id: string;
  lot_number: string;
  productName: string;
  productSku: string;
  productUnit: string;
  totalQty: number;
  created_at: string;
  manufactured_at: string | null;
  expires_at: string | null;
  status: LotStatus;
};

const STATUS_LABELS: Record<string, string> = {
  ACTIVE:     "ใช้งาน",
  QUARANTINE: "กักกัน",
  CONSUMED:   "ใช้หมดแล้ว",
  EXPIRED:    "หมดอายุ",
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE:     "bg-green-500/10 text-green-600",
  QUARANTINE: "bg-amber-500/10 text-amber-600",
  CONSUMED:   "bg-muted text-muted-foreground",
  EXPIRED:    "bg-red-500/10 text-red-600",
};

function fmt(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("th-TH", { day: "2-digit", month: "short", year: "numeric" });
}

export default function LotsTable({ lots }: { lots: LotRow[] }) {
  const router = useRouter();
  const [editLot, setEditLot] = useState<LotRow | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function setStatus(lot: LotRow, status: LotStatus) {
    setBusyId(lot.id);
    const res = await fetch(`/api/lots/${lot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    setBusyId(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "เปลี่ยนสถานะไม่สำเร็จ");
      return;
    }
    router.refresh();
  }

  async function remove(lot: LotRow) {
    if (!confirm(`ลบ Lot ${lot.lot_number}? (ทำได้เฉพาะ lot เปล่าที่ไม่มีสต็อก/ประวัติ)`)) return;
    setBusyId(lot.id);
    const res = await fetch(`/api/lots/${lot.id}`, { method: "DELETE" });
    setBusyId(null);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      alert(d.error ?? "ลบไม่สำเร็จ");
      return;
    }
    router.refresh();
  }

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">หมายเลข Lot</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สินค้า</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">คงเหลือ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่สร้าง</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">หมดอายุ</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">สถานะ</th>
                  <th className="px-4 py-3 text-center font-medium text-muted-foreground">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {lots.map((lot) => (
                  <tr key={lot.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs font-semibold text-red-600">{lot.lot_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium">{lot.productName}</p>
                      <p className="text-xs text-muted-foreground">{lot.productSku}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {lot.totalQty > 0 ? (
                        <span className="font-medium">{lot.totalQty.toLocaleString()} {lot.productUnit}</span>
                      ) : (
                        <span className="text-muted-foreground">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmt(lot.created_at)}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{fmt(lot.expires_at)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_COLORS[lot.status] ?? ""}`}>
                        {STATUS_LABELS[lot.status] ?? lot.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <Link
                          href={`/lots/${lot.id}/print`}
                          target="_blank"
                          className="inline-flex items-center gap-1 rounded-lg bg-red-600/10 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-600/20"
                        >
                          <Printer className="h-3 w-3" />
                          พิมพ์
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger
                            disabled={busyId === lot.id}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-50"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setEditLot(lot)}>
                              <Pencil className="mr-2 h-4 w-4" /> แก้ไขข้อมูล
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            {lot.status !== "QUARANTINE" && (
                              <DropdownMenuItem onClick={() => setStatus(lot, "QUARANTINE")}>
                                <ShieldAlert className="mr-2 h-4 w-4 text-amber-500" /> กักกัน
                              </DropdownMenuItem>
                            )}
                            {lot.status !== "EXPIRED" && (
                              <DropdownMenuItem onClick={() => setStatus(lot, "EXPIRED")}>
                                <CalendarX className="mr-2 h-4 w-4 text-red-500" /> หมดอายุ
                              </DropdownMenuItem>
                            )}
                            {lot.status !== "CONSUMED" && (
                              <DropdownMenuItem onClick={() => setStatus(lot, "CONSUMED")}>
                                <PackageCheck className="mr-2 h-4 w-4 text-muted-foreground" /> ใช้หมดแล้ว
                              </DropdownMenuItem>
                            )}
                            {lot.status !== "ACTIVE" && (
                              <DropdownMenuItem onClick={() => setStatus(lot, "ACTIVE")}>
                                <RotateCcw className="mr-2 h-4 w-4 text-green-600" /> กลับมาใช้งาน
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => remove(lot)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> ลบ Lot
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                ))}
                {lots.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <QrCode className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                      <p className="text-muted-foreground">ยังไม่มี Lot — กด &quot;สร้าง Lot&quot; ด้านบน หรือสร้างตอนรับสินค้า</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {editLot && (
        <EditLotModal
          lot={editLot}
          onClose={() => setEditLot(null)}
          onDone={() => { setEditLot(null); router.refresh(); }}
        />
      )}
    </>
  );
}

function EditLotModal({
  lot, onClose, onDone,
}: {
  lot: LotRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [mfg, setMfg] = useState(lot.manufactured_at ?? "");
  const [exp, setExp] = useState(lot.expires_at ?? "");
  const [status, setStatus] = useState<LotStatus>(lot.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    const res = await fetch(`/api/lots/${lot.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        manufactured_at: mfg || null,
        expires_at:      exp || null,
        status,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "บันทึกไม่สำเร็จ");
      setSaving(false);
      return;
    }
    setSaving(false);
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold">แก้ไข Lot</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-muted">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <p className="font-mono text-xs font-semibold text-red-600">{lot.lot_number}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{lot.productName} • {lot.productSku}</p>
        </div>

        <form onSubmit={submit} className="p-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">วันผลิต</Label>
              <Input type="date" className="h-8 text-sm" value={mfg} onChange={(e) => setMfg(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">วันหมดอายุ</Label>
              <Input type="date" className="h-8 text-sm" value={exp} onChange={(e) => setExp(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs">สถานะ</Label>
            <select
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring"
              value={status}
              onChange={(e) => setStatus(e.target.value as LotStatus)}
            >
              <option value="ACTIVE">ใช้งาน</option>
              <option value="QUARANTINE">กักกัน</option>
              <option value="EXPIRED">หมดอายุ</option>
              <option value="CONSUMED">ใช้หมดแล้ว</option>
            </select>
          </div>

          <p className="text-[11px] text-muted-foreground">
            หมายเลข Lot และบาร์โค้ดแก้ไขไม่ได้ (พิมพ์แปะสินค้าจริงไปแล้ว)
          </p>

          <div className="flex gap-2 justify-end pt-1">
            <Button type="button" onClick={onClose} className="h-8 text-xs bg-muted text-foreground hover:bg-muted/80">
              ยกเลิก
            </Button>
            <Button type="submit" disabled={saving} className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold">
              {saving ? "กำลังบันทึก…" : "บันทึก"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
