"use client";

import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { useState } from "react";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type QcRecord = {
  id: string;
  result: string;
  is_certified: boolean;
  certified_at: string | null;
  qty_inspected: number;
  qty_passed: number;
  created_at: string;
  product: { name: string; sku: string; allow_certify: boolean };
  inspector: { full_name: string };
  certifier?: { full_name: string } | null;
  certify_notes?: string | null;
};

function CertifyModal({ record, onClose, onDone }: { record: QcRecord; onClose: () => void; onDone: () => void }) {
  const [passed,     setPassed]     = useState(true);
  const [notes,      setNotes]      = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  async function submit() {
    setError("");
    setSubmitting(true);
    const res = await fetch(`/api/qc/${record.id}/certify`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ passed, notes: notes || undefined }),
    });
    const data = await res.json();
    if (!res.ok) { setError(data.error ?? "เกิดข้อผิดพลาด"); setSubmitting(false); return; }
    onDone();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl space-y-4">
        <h3 className="font-semibold">ตีตรา (Certify): {record.product.name}</h3>
        <p className="text-xs text-muted-foreground">ผ่าน QC: {Number(record.qty_passed)} ชิ้น</p>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-3">
          <label className={`flex-1 flex items-center gap-2 rounded-lg border p-3 cursor-pointer ${passed ? "border-green-500 bg-green-500/5" : "border-border"}`}>
            <input type="radio" checked={passed} onChange={() => setPassed(true)} className="accent-green-600" />
            <span className="text-sm font-medium">ตีตราผ่าน</span>
          </label>
          <label className={`flex-1 flex items-center gap-2 rounded-lg border p-3 cursor-pointer ${!passed ? "border-red-500 bg-red-500/5" : "border-border"}`}>
            <input type="radio" checked={!passed} onChange={() => setPassed(false)} className="accent-red-600" />
            <span className="text-sm font-medium">ตีตราไม่ผ่าน</span>
          </label>
        </div>

        <div>
          <textarea
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
            rows={3}
            placeholder="บันทึก (ไม่บังคับ)…"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="rounded-lg px-4 py-2 text-sm border border-border hover:bg-muted">ยกเลิก</button>
          <button
            onClick={submit}
            disabled={submitting}
            className={`rounded-lg px-4 py-2 text-sm font-semibold text-white ${passed ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
          >
            {submitting ? "กำลังบันทึก…" : "ยืนยันตีตรา"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CertifyPage() {
  const { data, mutate, isLoading } = useSWR("/api/qc", fetcher, { refreshInterval: 15000 });
  const [selected, setSelected] = useState<QcRecord | null>(null);

  const allRecords: QcRecord[] = Array.isArray(data) ? data : [];
  const needCertify = allRecords.filter(
    (r) => r.result === "PASS" && r.product.allow_certify && !r.is_certified
  );
  const certified = allRecords.filter((r) => r.is_certified);

  return (
    <div className="space-y-6">
      {selected && (
        <CertifyModal
          record={selected}
          onClose={() => setSelected(null)}
          onDone={() => { setSelected(null); mutate(); }}
        />
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">ตีตรา (Certify)</h2>
        <span className="rounded-full bg-red-600/10 px-2.5 py-0.5 text-xs font-semibold text-red-500">
          รอตีตรา {needCertify.length} รายการ
        </span>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-sm text-muted-foreground">กำลังโหลด…</div>
      ) : (
        <>
          {needCertify.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">ไม่มีรายการรอตีตรา</CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">สินค้า</th>
                      <th className="px-4 py-3 text-right font-medium text-muted-foreground">ผ่าน QC</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">ผู้ตรวจ QC</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">วันที่ QC</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {needCertify.map((r) => (
                      <tr key={r.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                        <td className="px-4 py-3">
                          <p className="font-medium">{r.product.name}</p>
                          <p className="text-xs text-muted-foreground">{r.product.sku}</p>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-green-600">{Number(r.qty_passed)}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.inspector.full_name}</td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {format(new Date(r.created_at), "dd MMM yyyy")}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={() => setSelected(r)}
                            className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                          >
                            ตีตรา
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}

          {certified.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground">ตีตราแล้ว</h3>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">สินค้า</th>
                        <th className="px-4 py-2 text-right text-xs text-muted-foreground">จำนวน</th>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">ผู้ตีตรา</th>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">วันที่</th>
                        <th className="px-4 py-2 text-left text-xs text-muted-foreground">หมายเหตุ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {certified.map((r) => (
                        <tr key={r.id} className="border-b border-border last:border-0">
                          <td className="px-4 py-2 font-medium">{r.product.name}</td>
                          <td className="px-4 py-2 text-right">{Number(r.qty_passed)}</td>
                          <td className="px-4 py-2 text-muted-foreground">{r.certifier?.full_name ?? "—"}</td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">
                            {r.certified_at ? format(new Date(r.certified_at), "dd MMM yyyy") : "—"}
                          </td>
                          <td className="px-4 py-2 text-xs text-muted-foreground">{r.certify_notes ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
