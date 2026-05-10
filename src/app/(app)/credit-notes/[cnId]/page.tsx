"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_LABELS: Record<string, string> = {
  DRAFT:     "ร่าง",
  ISSUED:    "ออกแล้ว",
  REFUNDED:  "คืนเงินแล้ว",
  CANCELLED: "ยกเลิก",
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT:     "bg-muted text-muted-foreground",
  ISSUED:    "bg-amber-500/10 text-amber-600",
  REFUNDED:  "bg-green-500/10 text-green-600",
  CANCELLED: "bg-red-500/10 text-red-600",
};

export default function CreditNoteDetailPage({
  params,
}: {
  params: Promise<{ cnId: string }>;
}) {
  const { cnId } = use(params);
  const router = useRouter();
  const { data: cn, mutate, isLoading } = useSWR(`/api/credit-notes/${cnId}`, fetcher);
  const [acting, setActing] = useState(false);

  if (isLoading) return <div className="py-20 text-center text-sm text-muted-foreground">กำลังโหลด…</div>;
  if (!cn || cn.error) return <div className="py-20 text-center text-sm text-muted-foreground">ไม่พบใบลดหนี้</div>;

  async function changeStatus(status: string) {
    setActing(true);
    await fetch(`/api/credit-notes/${cnId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await mutate();
    setActing(false);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.push("/credit-notes")} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
          ← กลับ
        </button>
        <h2 className="text-lg font-semibold">{cn.cn_number}</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_COLORS[cn.status]}`}>
          {STATUS_LABELS[cn.status]}
        </span>
        <div className="ml-auto flex gap-2">
          <Link href={`/print/credit-notes/${cnId}`} target="_blank">
            <Button className="h-8 text-xs bg-muted text-foreground hover:bg-muted/80">
              🖨️ พิมพ์
            </Button>
          </Link>
          {cn.status === "DRAFT" && (
            <Button onClick={() => changeStatus("ISSUED")} disabled={acting} className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white">
              ออกใบลดหนี้
            </Button>
          )}
          {cn.status === "ISSUED" && (
            <Button onClick={() => changeStatus("REFUNDED")} disabled={acting} className="h-8 text-xs bg-green-600 hover:bg-green-700 text-white">
              บันทึกการคืนเงิน
            </Button>
          )}
          {(cn.status === "DRAFT" || cn.status === "ISSUED") && (
            <Button onClick={() => changeStatus("CANCELLED")} disabled={acting} className="h-8 text-xs bg-muted hover:bg-red-500/10 hover:text-red-600">
              ยกเลิก
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-sm">ลูกค้า</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <p className="font-semibold">{cn.customer?.name ?? "—"}</p>
            {cn.customer?.code && <p className="text-xs font-mono text-muted-foreground">{cn.customer.code}</p>}
            {cn.customer?.phone && <p className="text-muted-foreground">{cn.customer.phone}</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm">ข้อมูลเอกสาร</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-1">
            <div className="flex justify-between"><span className="text-muted-foreground">เหตุผล</span><span>{cn.reason}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">ออกโดย</span><span>{cn.issuer?.full_name}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">วันที่</span><span>{format(new Date(cn.created_at), "dd MMM yyyy")}</span></div>
            {cn.refunded_at && <div className="flex justify-between text-green-600"><span>คืนเงินเมื่อ</span><span>{format(new Date(cn.refunded_at), "dd MMM yyyy")}</span></div>}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm">รายการ</CardTitle>
            <span className="text-lg font-bold text-red-600">฿{Number(cn.total_amount).toLocaleString()}</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-2 text-left font-medium text-muted-foreground">รายละเอียด</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">จำนวน</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">ราคา/หน่วย</th>
                <th className="px-4 py-2 text-right font-medium text-muted-foreground">รวม</th>
              </tr>
            </thead>
            <tbody>
              {cn.lines.map((l: { id: string; description: string; qty: string; unit_price: string; amount: string; product?: { sku: string } | null }) => (
                <tr key={l.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <p>{l.description}</p>
                    {l.product?.sku && <p className="text-xs font-mono text-muted-foreground">{l.product.sku}</p>}
                  </td>
                  <td className="px-4 py-2 text-right">{Number(l.qty).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right">฿{Number(l.unit_price).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-medium">฿{Number(l.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {cn.notes && (
        <Card>
          <CardHeader><CardTitle className="text-sm">หมายเหตุ</CardTitle></CardHeader>
          <CardContent className="text-sm">{cn.notes}</CardContent>
        </Card>
      )}
    </div>
  );
}
