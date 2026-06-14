"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { Wrench, ArrowRightLeft, PackageOpen } from "lucide-react"; // Import ไอคอนให้ดูสวยขึ้น

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_LABELS: Record<string, string> = {
  WAIT_REPAIR: "รอซ่อม",
  IN_REPAIR:   "กำลังซ่อม",
  WAIT_QC:     "รอ QC",
  COMPLETED:   "เสร็จสิ้น",
  CANCELLED:   "ยกเลิก",
};
const STATUS_COLORS: Record<string, string> = {
  WAIT_REPAIR: "bg-amber-500/10 text-amber-600",
  IN_REPAIR:   "bg-blue-500/10 text-blue-600",
  WAIT_QC:     "bg-purple-500/10 text-purple-600",
  COMPLETED:   "bg-green-500/10 text-green-600",
  CANCELLED:   "bg-muted text-muted-foreground",
};
const QC_RESULT_LABELS: Record<string, string> = { PENDING: "รอตรวจ", PASS: "ผ่าน", FAIL: "ไม่ผ่าน" };
const QC_RESULT_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-600",
  PASS:    "bg-green-500/10 text-green-600",
  FAIL:    "bg-red-500/10 text-red-600",
};

export default function RepairDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = use(params);
  const router = useRouter();
  const { data: job, mutate, isLoading } = useSWR(`/api/repair/${jobId}`, fetcher);

  const [repairNote, setRepairNote] = useState("");
  const [working,    setWorking]    = useState(false);
  const [error,      setError]      = useState("");

  async function action(act: string, extra?: Record<string, string>) {
    setError("");
    setWorking(true);
    const res = await fetch(`/api/repair/${jobId}`, {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ action: act, repairNote, ...extra }),
    });
    const data = await res.json();
    if (!res.ok) { 
  setError(typeof data.error === 'string' ? data.error : JSON.stringify(data.error) ?? "เกิดข้อผิดพลาด"); 
  setWorking(false); 
  return; 
}
    await mutate();
    setWorking(false);
    setRepairNote("");
    
    // Redirect after specific actions to improve flow
    if (act === "request_disassembly") router.push("/disassembly/new");
    else if (act.startsWith("complete")) router.push("/qc"); 
  }

  if (isLoading) return <div className="py-20 text-center text-sm text-muted-foreground">กำลังโหลด…</div>;
  if (!job || job.error) return <div className="py-20 text-center text-sm text-muted-foreground">ไม่พบงานซ่อม</div>;

  const isDone = job.status === "COMPLETED" || job.status === "CANCELLED";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/repair")} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
            ← กลับ
          </button>
          <h2 className="text-lg font-semibold">{job.job_number}</h2>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${STATUS_COLORS[job.status]}`}>
          {STATUS_LABELS[job.status]}
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </div>
      )}

      {/* ข้อมูลงาน */}
      <Card>
        <CardHeader><CardTitle className="text-sm">ข้อมูลงานซ่อม</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">สินค้า</p>
            <p className="font-medium">{job.product?.name}</p>
            <p className="text-xs text-muted-foreground">{job.product?.sku}</p>
          </div>
          <div>
            <p className="text-muted-foreground">ลูกค้า</p>
            <p className="font-medium">{job.customer?.name ?? "—"}</p>
            {job.customer?.phone && <p className="text-xs text-muted-foreground">{job.customer.phone}</p>}
          </div>
          <div>
            <p className="text-muted-foreground">ผู้รับงาน</p>
            <p className="font-medium">{job.receiver?.full_name}</p>
          </div>
          <div>
            <p className="text-muted-foreground">วันที่รับ</p>
            <p>{format(new Date(job.created_at), "dd MMM yyyy HH:mm")}</p>
          </div>
          {job.assignee && (
            <div>
              <p className="text-muted-foreground">ช่างซ่อม</p>
              <p className="font-medium">{job.assignee.full_name}</p>
            </div>
          )}
          {job.completed_at && (
            <div>
              <p className="text-muted-foreground">วันที่เสร็จ</p>
              <p>{format(new Date(job.completed_at), "dd MMM yyyy HH:mm")}</p>
            </div>
          )}
          {job.issue_desc && (
            <div className="col-span-2">
              <p className="text-muted-foreground">อาการเสีย</p>
              <p>{job.issue_desc}</p>
            </div>
          )}
          {job.repair_note && (
            <div className="col-span-2">
              <p className="text-muted-foreground">บันทึกการซ่อม</p>
              <p>{job.repair_note}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* QC records */}
      {job.qc_records?.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">ผล QC</CardTitle></CardHeader>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2 text-left text-xs text-muted-foreground">ผู้ตรวจ</th>
                  <th className="px-4 py-2 text-right text-xs text-muted-foreground">ผ่าน</th>
                  <th className="px-4 py-2 text-right text-xs text-muted-foreground">ไม่ผ่าน</th>
                  <th className="px-4 py-2 text-left text-xs text-muted-foreground">ผล</th>
                  <th className="px-4 py-2 text-left text-xs text-muted-foreground">วันที่</th>
                </tr>
              </thead>
              <tbody>
                {job.qc_records.map((q: { id: string; result: string; qty_passed: number; qty_failed: number; inspector: { full_name: string }; inspected_at: string | null }) => (
                  <tr key={q.id} className="border-b border-border last:border-0">
                    <td className="px-4 py-2">{q.inspector.full_name}</td>
                    <td className="px-4 py-2 text-right text-green-600">{Number(q.qty_passed)}</td>
                    <td className="px-4 py-2 text-right text-red-600">{Number(q.qty_failed)}</td>
                    <td className="px-4 py-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${QC_RESULT_COLORS[q.result]}`}>
                        {QC_RESULT_LABELS[q.result]}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">
                      {q.inspected_at ? format(new Date(q.inspected_at), "dd MMM HH:mm") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {!isDone && (
        <Card>
          <CardHeader><CardTitle className="text-sm">ดำเนินการ (อิงตาม Flowchart)</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>บันทึกการซ่อม</Label>
              <textarea
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                rows={3}
                placeholder="บันทึกขั้นตอนการซ่อม ผลการซ่อม ฯลฯ"
                value={repairNote}
                onChange={(e) => setRepairNote(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-3">
              {job.status === "WAIT_REPAIR" && (
                <Button
                  className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                  onClick={() => action("start")}
                  disabled={working}
                >
                  เริ่มดำเนินการซ่อม
                </Button>
              )}
              
              {job.status === "IN_REPAIR" && (
                <div className="grid gap-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      className="border-blue-500 text-blue-600 hover:bg-blue-50"
                      onClick={() => action("complete_qc_customer")}
                      disabled={working}
                    >
                      ส่งคืนลูกค้า (ต้องผ่าน QC ก่อน)
                    </Button>

                    <Button
                      variant="outline"
                      className="border-purple-500 text-purple-600 hover:bg-purple-50"
                      onClick={() => action("complete_qc_internal")}
                      disabled={working}
                    >
                      ส่งคืนคลัง (ต้องผ่าน QC ก่อน)
                    </Button>
                  </div>
                  
                  <div className="relative my-2">
                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-muted-foreground/30" /></div>
                    <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">หรือ (ถ้าซ่อมไม่ได้)</span></div>
                  </div>

                  <Button
                    variant="outline"
                    className="border-amber-500 text-amber-600 hover:bg-amber-50"
                    onClick={() => action("request_disassembly")}
                    disabled={working}
                  >
                    ขอแยกชิ้นส่วน (Disassembly)
                  </Button>
                </div>
              )}

              {/* ✨ อัปเดตใหม่: ตรวจสอบสถานะรอ QC และผลการตรวจ */}
              {job.status === "WAIT_QC" && (
                <>
                  {job.qc_records?.some((q: any) => q.result === "PASS") ? (
                    <Button
                      className="bg-green-600 hover:bg-green-700 text-white w-full text-base py-6"
                      onClick={() => action("send_to_shipping")}
                      disabled={working}
                    >
                      ✓ ยืนยันและส่งไปยังการจัดส่ง
                    </Button>
                  ) : job.qc_records?.some((q: any) => q.result === "FAIL") ? (
                    <Button
                      className="bg-red-600 hover:bg-red-700 text-white w-full"
                      onClick={() => action("start")} // ส่งกลับไปสถานะ IN_REPAIR
                      disabled={working}
                    >
                      ✕ ไม่ผ่าน QC → ดึงกลับมาซ่อมใหม่
                    </Button>
                  ) : (
                    <div className="text-center text-sm font-medium text-amber-600 bg-amber-50 py-3 rounded-lg border border-amber-200">
                      กำลังรอฝ่าย QC บันทึกผลการตรวจสอบ...
                    </div>
                  )}
                </>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}