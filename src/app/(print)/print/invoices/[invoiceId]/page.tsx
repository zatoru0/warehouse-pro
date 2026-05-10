"use client";

import { use } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { PrintToolbar, DocumentPaper, DocumentHeader, DocumentFooter } from "@/components/print/DocumentLayout";
import { thaiBaht } from "@/lib/thai-baht";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "ร่าง", ISSUED: "เรียกเก็บแล้ว", PAID: "ชำระแล้ว", CANCELLED: "ยกเลิก",
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-200 text-gray-700", ISSUED: "bg-amber-100 text-amber-700",
  PAID: "bg-green-100 text-green-700", CANCELLED: "bg-red-100 text-red-700",
};

export default function PrintInvoicePage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  const { invoiceId } = use(params);
  const { data: inv, isLoading } = useSWR(`/api/invoices/${invoiceId}`, fetcher);

  if (isLoading) return <div className="py-20 text-center text-sm text-muted-foreground">กำลังโหลด…</div>;
  if (!inv || inv.error) return <div className="py-20 text-center text-sm text-muted-foreground">ไม่พบใบแจ้งหนี้</div>;

  const total   = Number(inv.total_amount);
  const overdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== "PAID" && inv.status !== "CANCELLED";

  return (
    <>
      <PrintToolbar backHref={`/invoices/${invoiceId}`} documentName={inv.invoice_number} />

      <DocumentPaper>
        <DocumentHeader
          title="ใบแจ้งหนี้ / Invoice"
          documentNumber={inv.invoice_number}
          status={STATUS_LABELS[inv.status]}
          statusColor={STATUS_COLORS[inv.status]}
        />

        <section className="mb-6 grid grid-cols-2 gap-8">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">เรียกเก็บจาก</p>
            {inv.customer ? (
              <>
                <p className="text-base font-semibold">{inv.customer.name}</p>
                <p className="font-mono text-xs text-muted-foreground">{inv.customer.code}</p>
                {inv.customer.address && <p className="mt-1 text-xs">{inv.customer.address}</p>}
                {inv.customer.phone && <p className="text-xs">โทร. {inv.customer.phone}</p>}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">— ลูกค้าหน้าร้าน —</p>
            )}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">รายละเอียด</p>
            <table className="w-full text-xs">
              <tbody>
                <tr><td className="py-0.5 text-muted-foreground">วันที่ออก</td><td className="text-right">{format(new Date(inv.created_at), "dd/MM/yyyy")}</td></tr>
                {inv.issued_at && <tr><td className="py-0.5 text-muted-foreground">วันที่เรียกเก็บ</td><td className="text-right">{format(new Date(inv.issued_at), "dd/MM/yyyy")}</td></tr>}
                {inv.due_date && (
                  <tr>
                    <td className="py-0.5 text-muted-foreground">ครบกำหนด</td>
                    <td className={`text-right ${overdue ? "text-red-600 font-bold" : ""}`}>
                      {format(new Date(inv.due_date), "dd/MM/yyyy")}
                      {overdue && " (เลยกำหนด)"}
                    </td>
                  </tr>
                )}
                {inv.paid_at && <tr><td className="py-0.5 text-muted-foreground">ชำระเมื่อ</td><td className="text-right text-green-600 font-semibold">{format(new Date(inv.paid_at), "dd/MM/yyyy")}</td></tr>}
                <tr><td className="py-0.5 text-muted-foreground">ออกโดย</td><td className="text-right">{inv.issuer.full_name}</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-4 rounded-lg border border-blue-300 bg-blue-50 p-3">
          <p className="text-xs font-semibold uppercase text-blue-700">รายละเอียดการเรียกเก็บ</p>
          <p className="mt-1 text-sm font-medium">{inv.reason}</p>
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
              {inv.lines.map((l: { id: string; description: string; qty: string; unit_price: string; amount: string; product?: { sku: string } | null }, idx: number) => (
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
                <td colSpan={4} className="py-3 text-right text-sm font-semibold">ยอดเงินที่ต้องชำระ</td>
                <td className="py-3 text-right text-lg font-bold text-red-600">฿{total.toLocaleString()}</td>
              </tr>
            </tfoot>
          </table>
        </section>

        <section className="mb-6 rounded-lg bg-gray-50 p-3">
          <p className="text-xs text-muted-foreground">จำนวนเงิน (ตัวอักษร)</p>
          <p className="mt-0.5 text-sm font-semibold">({thaiBaht(total)})</p>
        </section>

        {inv.notes && (
          <section className="mb-6 rounded-lg border border-gray-200 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">หมายเหตุ</p>
            <p className="mt-1 text-sm">{inv.notes}</p>
          </section>
        )}

        <DocumentFooter note="กรุณาชำระเงินภายในวันที่กำหนด หากเกินกำหนดอาจมีค่าปรับตามเงื่อนไข" />
      </DocumentPaper>
    </>
  );
}
