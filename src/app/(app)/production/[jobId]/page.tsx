"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { Play, Check, FlaskConical } from "lucide-react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const TYPE_LABELS: Record<string, string> = {
  ASSEMBLY:    "ประกอบ",
  DISASSEMBLY: "แยกชิ้นส่วน",
  REPAIR:      "ซ่อม",
};

const STATUS_LABELS: Record<string, string> = {
  PENDING:     "รอดำเนินการ",
  IN_PROGRESS: "กำลังผลิต",
  COMPLETED:   "เสร็จสิ้น",
  FAILED:      "ล้มเหลว",
  CANCELLED:   "ยกเลิก",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING:     "bg-red-600/10 text-red-600",
  IN_PROGRESS: "bg-blue-500/10 text-blue-600",
  COMPLETED:   "bg-green-500/10 text-green-600",
  FAILED:      "bg-red-500/10 text-red-600",
  CANCELLED:   "bg-muted text-muted-foreground",
};

export default function ProductionDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const router = useRouter();
  const { data: job, mutate, isLoading } = useSWR(`/api/production/${jobId}`, fetcher);

  const [qtyProduced, setQtyProduced] = useState("");
  const [sendToQc, setSendToQc] = useState(true);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [working, setWorking] = useState(false);

  if (isLoading) {
    return <div className="py-20 text-center text-sm text-muted-foreground">กำลังโหลด…</div>;
  }
  if (!job || job.error) {
    return <div className="py-20 text-center text-sm text-muted-foreground">ไม่พบงานผลิต</div>;
  }

  const isPending = job.status === "PENDING";
  const isInProgress = job.status === "IN_PROGRESS";
  const isDone = job.status === "COMPLETED" || job.status === "CANCELLED";

  async function startJob() {
    if (!confirm("เริ่มงานผลิตนี้?")) return;
    setWorking(true);
    const res = await fetch(`/api/production/${jobId}/start`, { method: "POST" });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error ?? "เกิดข้อผิดพลาด");
    }
    await mutate();
    setWorking(false);
  }

  async function completeJob() {
    setError("");
    const qty = Number(qtyProduced);
    if (isNaN(qty) || qty < 0) {
      setError("กรุณากรอกจำนวนที่ผลิตให้ถูกต้อง");
      return;
    }

    setWorking(true);
    const res = await fetch(`/api/production/${jobId}/complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        qty_produced: qty,
        send_to_qc: sendToQc,
        notes: notes || undefined,
      }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "เกิดข้อผิดพลาด");
      setWorking(false);
      return;
    }

    await mutate();
    setWorking(false);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/production")}
            className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
          >
            ← กลับ
          </button>
          <div>
            <p className="font-mono text-sm font-medium text-red-600">{job.job_number}</p>
            <p className="text-xs text-muted-foreground">
              {TYPE_LABELS[job.job_type]} • สร้างเมื่อ {format(new Date(job.created_at), "dd MMM yyyy HH:mm")}
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
          <CardTitle className="text-sm">ข้อมูลงานผลิต</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">สินค้าเป้าหมาย</p>
            <p className="font-medium">{job.product.name}</p>
            <p className="text-xs text-muted-foreground">{job.product.sku}</p>
          </div>
          <div>
            <p className="text-muted-foreground">จำนวนที่วางแผน</p>
            <p className="font-medium">
              {Number(job.qty_planned).toLocaleString()} {job.product.unit}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">ผลผลิตจริง</p>
            <p className="font-medium text-green-600">
              {Number(job.qty_produced).toLocaleString()} {job.product.unit}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">คลังผลิต</p>
            <p className="font-medium">{job.warehouse.name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">เริ่มงาน</p>
            <p className="font-medium">
              {job.started_at ? format(new Date(job.started_at), "dd MMM yyyy HH:mm") : "ยังไม่เริ่ม"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">เสร็จงาน</p>
            <p className="font-medium">
              {job.completed_at ? format(new Date(job.completed_at), "dd MMM yyyy HH:mm") : "—"}
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

      {/* Actions per state */}
      {isPending && (
        <Card>
          <CardContent className="flex items-center justify-between py-6">
            <p className="text-sm text-muted-foreground">งานยังไม่เริ่ม กดปุ่มเพื่อเริ่มงานผลิต</p>
            <Button
              onClick={startJob}
              disabled={working}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              <Play className="h-4 w-4 mr-1" />
              เริ่มงานผลิต
            </Button>
          </CardContent>
        </Card>
      )}

      {isInProgress && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">บันทึกผลผลิต</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="qty">จำนวนที่ผลิตได้จริง</Label>
                <Input
                  id="qty"
                  type="number"
                  min="0"
                  step="any"
                  placeholder={`เป้าหมาย ${Number(job.qty_planned)}`}
                  value={qtyProduced}
                  onChange={(e) => setQtyProduced(e.target.value)}
                />
              </div>
              <div className="space-y-2 flex flex-col justify-end">
                {job.product.allow_qc && (
                  <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-input p-2.5">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-red-600"
                      checked={sendToQc}
                      onChange={(e) => setSendToQc(e.target.checked)}
                    />
                    <FlaskConical className="h-4 w-4 text-red-600" />
                    <span className="text-sm">ส่ง QC ตรวจสอบหลังเสร็จงาน</span>
                  </label>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">หมายเหตุการผลิต</Label>
              <textarea
                id="notes"
                rows={2}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={completeJob}
                disabled={working || !qtyProduced}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold"
              >
                <Check className="h-4 w-4 mr-1" />
                {working ? "กำลังบันทึก…" : "บันทึกเสร็จงาน"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {isDone && job.qc_records.length > 0 && (
        <Card>
          <CardContent className="py-4">
            <div className="flex items-center gap-2 text-sm">
              <FlaskConical className="h-4 w-4 text-red-600" />
              <span className="text-muted-foreground">ส่งตรวจ QC แล้ว</span>
              <button
                onClick={() => router.push(`/qc/${job.qc_records[0].id}`)}
                className="ml-auto text-red-600 hover:underline text-sm font-medium"
              >
                ดูผล QC →
              </button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
