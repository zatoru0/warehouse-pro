"use client";

import { use } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { PrintToolbar, DocumentPaper, DocumentHeader, DocumentFooter } from "@/components/print/DocumentLayout";
import { thaiBaht } from "@/lib/thai-baht";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "ร่าง", ISSUED: "ออกแล้ว", REFUNDED: "คืนเงินแล้ว", CANCELLED: "ยกเลิก",
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-200 text-gray-700", ISSUED: "bg-amber-100 text-amber-700",
  REFUNDED: "bg-green-100 text-green-700", CANCELLED: "bg-red-100 text-red-700",
};

export default function PrintCreditNotePage({
  params,
}: {
  params: Promise<{ cnId: string }>;
}) {
  const { cnId } = use(params);
  const { data: cn, isLoading } = useSWR(`/api/credit-notes/${cnId}`, fetcher);

  if (isLoading) return <div className="py-20 text-center text-sm text-muted-foreground">กำลังโหลด…</div>;
  if (!cn || cn.error) return <div className="py-20 text-center text-sm text-muted-foreground">ไม่พบใบลดหนี้</div>;

  const total = Number(cn.total_amount);

  return (
    <>
      <PrintToolbar backHref={`/credit-notes/${cnId}`} documentName={cn.cn_number} />

      <DocumentPaper>
        <DocumentHeader
          title="ใบลดหนี้ / Credit Note"
          documentNumber={cn.cn_number}
          status={STATUS_LABELS[cn.status]}
          statusColor={STATUS_COLORS[cn.status]}
        />

        <section className="mb-6 grid grid-cols-2 gap-8">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">ลูกค้า</p>
            {cn.customer ? (
              <>
                <p className="text-base font-semibold">{cn.customer.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{cn.customer.code}</p>
                {cn.customer.address && <p className="mt-1 text-xs">{cn.customer.address}</p>}
                {cn.customer.phone && <p className="text-xs">โทร. {cn.customer.phone}</p>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">— ลูกค้าหน้าร้าน —</p>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">รายละเอียด</p>
            <table className="w-full text-xs">
              <tbody>
                <tr><td className="py-0.5 text-muted-foreground">วันที่ออก</td><td className="text-right">{format(new Date(cn.created_at), "dd/MM/yyyy")}</td></tr>
                {cn.issued_at && <tr><td className="py-0.5 text-muted-foreground">วันที่อนุมัติ</td><td className="text-right">{format(new Date(cn.issued_at), "dd/MM/yyyy")}</td></tr>}
                {cn.refunded_at && <tr><td className="py-0.5 text-muted-foreground">คืนเงินเมื่อ</td><td className="text-right text-green-600 font-semibold">{format(new Date(cn.refunded_at), "dd/MM/yyyy")}</td></tr>}
                <tr><td className="py-0.5 text-muted-foreground">ออกโดย</td><td className="text-right">{cn.issuer.full_name}</td></tr>
                {cn.order && <tr><td className="py-0.5 text-muted-foreground">อ้างอิงคำสั่งซื้อ</td><td className="text-right font-mono">{cn.order.order_number}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3">
          <p className="text-xs font-semibold uppercase text-amber-700">เหตุผลการออกใบลดหนี้</p>
          <p className="mt-1 text-sm font-medium">{cn.reason}</p>
        </section>

        <section className="mb-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-foreground">
                <th className="py-2 text-left font-semibold">ลำดับ</th>
                <th className="py-2 text-left font-semibold">รายการ</th>
                <th className="py-2 text-right font-semibold">จำนวน</th>
                <th className="py-2 text-right font-semibold">ราคา/หน่วย</th>
                <th className="py-2 text-right font-semibold">รวม</th>
              </tr>
            </thead>
            <tbody>
              {cn.lines.map((l: { id: string; description: string; qty: string; unit_price: string; amount: string; product?: { sku: string } | null }, idx: number) => (
                <tr key={l.id} className="border-b border-gray-200">
                  <td className="py-2">{idx + 1}</td>
                  <td className="py-2">
                    <p>{l.description}</p>
                    {l.product?.sku && <p className="text-xs font-mono text-muted-foreground">{l.product.sku}</p>}
                  </td>
                  <td className="py-2 text-right">{Number(l.qty).toLocaleString()}</td>
                  <td className="py-2 text-right">฿{Number(l.unit_price).toLocaleString()}</td>
                  <td className="py-2 text-right font-medium">฿{Number(l.amount).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-foreground">
                <td colSpan={4} className="py-3 text-right text-sm font-semibold">ยอดเงินที่ลดหนี้</td>
                <td className="py-3 text-right text-lg font-bold text-red-600">฿{total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="mb-6 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-muted-foreground">จำนวนเงิน (ตัวอักษร)</p>
          <p className="mt-0.5 text-sm font-semibold">({thaiBaht(total)})</p>
        </section>

        {cn.notes && (
          <section className="mb-6 rounded-lg border border-gray-200 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">หมายเหตุ</p>
            <p className="mt-1 text-sm">{cn.notes}</p>
          </section>
        )}

        <DocumentFooter note="ใบลดหนี้นี้ใช้สำหรับหักจากยอดที่ลูกค้าค้างชำระ หรือคืนเงินตามเงื่อนไขที่ตกลง" />
      </DocumentPaper>
    </>
  );
}
