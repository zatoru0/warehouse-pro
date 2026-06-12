"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const RESULT_COLORS: Record<string, string> = {
  PENDING: "bg-red-600/10 text-red-600",
  PASS:    "bg-green-500/10 text-green-600",
  FAIL:    "bg-red-500/10 text-red-600",
};

const RESULT_LABELS: Record<string, string> = {
  PENDING: "รอตรวจสอบ",
  PASS:    "ผ่าน",
  FAIL:    "ไม่ผ่าน",
};

export default function QcDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const { data: record, isLoading } = useSWR(`/api/qc/${id}`, fetcher);

  const [qtyPassed, setQtyPassed] = useState("");
  const [qtyFailed, setQtyFailed] = useState("");
  const [notes, setNotes] = useState("");
  // ✨ เพิ่ม State สำหรับรับค่าจากตัวเลือกสายการทำงาน
  const [isDefective, setIsDefective] = useState(false); 
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function submit(result: "PASS" | "FAIL") {
    setError("");
    const passed = Number(qtyPassed);
    const failed = Number(qtyFailed);

    if (isNaN(passed) || isNaN(failed)) {
      setError("กรุณากรอกจำนวนให้ถูกต้อง");
      return;
    }

    setSubmitting(true);
    const res = await fetch(`/api/qc/${id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // ✨ เพิ่ม isDefective แนบไปกับข้อมูลที่จะส่งให้ API หลังบ้าน
      body: JSON.stringify({ result, qty_passed: passed, qty_failed: failed, notes, isDefective }),
    });

    if (!res.ok) {
      const d = await res.json();
      setError(d.error ?? "เกิดข้อผิดพลาด");
      setSubmitting(false);
      return;
    }

    router.push("/qc");
    router.refresh();
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-muted-foreground text-sm">
        กำลังโหลด…
      </div>
    );
  }

  if (!record || record.error) {
    return (
      <div className="py-20 text-center text-muted-foreground text-sm">ไม่พบรายการ</div>
    );
  }

  const isPending = record.result === "PENDING";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ตรวจสอบคุณภาพ</h2>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${RESULT_COLORS[record.result]}`}>
          {RESULT_LABELS[record.result]}
        </span>
      </div>

      {/* Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ข้อมูลสินค้า</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">สินค้า</p>
            <p className="font-medium">{record.product?.name ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">รหัสสินค้า</p>
            <p className="font-mono">{record.product?.sku ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">จำนวนตรวจสอบ</p>
            <p className="font-medium">{Number(record.qty_inspected).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-muted-foreground">อ้างอิงงาน</p>
            <p className="font-mono text-xs">
              {record.receiving_job?.job_number ?? record.production_job?.job_number ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">ผู้ส่งตรวจ</p>
            <p className="font-medium">{record.inspector?.full_name ?? "—"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">วันที่สร้าง</p>
            <p className="text-xs">{format(new Date(record.created_at), "dd MMM yyyy HH:mm")}</p>
          </div>
        </CardContent>
      </Card>

      {/* Review form */}
      {isPending ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">บันทึกผลการตรวจสอบ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="passed">จำนวนผ่าน</Label>
                <Input
                  id="passed"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={qtyPassed}
                  onChange={(e) => setQtyPassed(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="failed">จำนวนไม่ผ่าน</Label>
                <Input
                  id="failed"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={qtyFailed}
                  onChange={(e) => setQtyFailed(e.target.value)}
                />
              </div>
            </div>

            {/* ✨ เพิ่มส่วนให้เลือกประเภทของเสีย (จะแสดงเมื่อมีจำนวนไม่ผ่าน > 0) */}
            {Number(qtyFailed) > 0 && (
              <div className="space-y-2 pt-2">
                <Label>การจัดการกรณีไม่ผ่าน (แยกตาม Flowchart)</Label>
                <div className="flex flex-col gap-3 rounded-lg border p-3 bg-muted/20">
                  <label className="flex items-start gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="defect_type"
                      checked={!isDefective}
                      onChange={() => setIsDefective(false)}
                      className="mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="font-semibold text-blue-600">ส่งประกอบใหม่ / แก้ไข</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">สินค้าไม่ชำรุด แค่ประกอบผิดหรือต้องปรับปรุง (ส่งกลับฝ่ายผลิต)</p>
                    </div>
                  </label>
                  <label className="flex items-start gap-2 cursor-pointer text-sm">
                    <input
                      type="radio"
                      name="defect_type"
                      checked={isDefective}
                      onChange={() => setIsDefective(true)}
                      className="mt-0.5 cursor-pointer"
                    />
                    <div>
                      <span className="font-semibold text-orange-600">ส่งซ่อม (สินค้าเสีย)</span>
                      <p className="text-[11px] text-muted-foreground mt-0.5">อุปกรณ์ชำรุด เสียหาย ต้องส่งให้ช่างหรือบริการหลังการขาย</p>
                    </div>
                  </label>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">หมายเหตุ</Label>
              <textarea
                id="notes"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                rows={3}
                placeholder="บันทึกผลการตรวจสอบ…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold"
                onClick={() => submit("PASS")}
                disabled={submitting}
              >
                ✓ ผ่าน QC
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                onClick={() => submit("FAIL")}
                disabled={submitting}
              >
                ✕ ไม่ผ่าน QC
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">ผลการตรวจสอบ</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">จำนวนผ่าน</p>
              <p className="text-xl font-bold text-green-600">{Number(record.qty_passed).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-muted-foreground">จำนวนไม่ผ่าน</p>
              <p className="text-xl font-bold text-red-600">{Number(record.qty_failed).toLocaleString()}</p>
            </div>
            {record.notes && (
              <div className="col-span-2">
                <p className="text-muted-foreground">หมายเหตุ</p>
                <p className="mt-1">{record.notes}</p>
              </div>
            )}
            {record.inspected_at && (
              <div className="col-span-2">
                <p className="text-muted-foreground">วันที่ตรวจสอบ</p>
                <p>{format(new Date(record.inspected_at), "dd MMM yyyy HH:mm")}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}