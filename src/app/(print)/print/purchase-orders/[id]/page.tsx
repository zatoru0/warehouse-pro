"use client";

import { use } from "react";
import useSWR from "swr";
import { format } from "date-fns";
import { PrintToolbar, DocumentPaper, DocumentHeader, DocumentFooter } from "@/components/print/DocumentLayout";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "ร่าง", SENT: "ส่งแล้ว", PARTIAL: "รับบางส่วน", COMPLETED: "เสร็จสิ้น", CANCELLED: "ยกเลิก",
};
const STATUS_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-200 text-gray-700", SENT: "bg-blue-100 text-blue-700",
  PARTIAL: "bg-amber-100 text-amber-700", COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-700",
};

export default function PrintPurchaseOrderPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: po, isLoading } = useSWR(`/api/purchase-orders/${id}`, fetcher);

  if (isLoading) return <div className="py-20 text-center text-sm text-muted-foreground">กำลังโหลด…</div>;
  if (!po || po.error) return <div className="py-20 text-center text-sm text-muted-foreground">ไม่พบ PO</div>;

  return (
    <>
      <PrintToolbar backHref={`/purchase-orders/${id}`} documentName={po.po_number} />

      <DocumentPaper>
        <DocumentHeader
          title="ใบสั่งซื้อ / Purchase Order"
          documentNumber={po.po_number}
          status={STATUS_LABELS[po.status]}
          statusColor={STATUS_COLORS[po.status]}
        />

        {/* Supplier + Info */}
        <section className="mb-6 grid grid-cols-2 gap-8">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">ผู้จัดหา</p>
            <p className="text-base font-semibold">{po.supplier.name}</p>
            <p className="font-mono text-xs text-muted-foreground">{po.supplier.code}</p>
            {po.supplier.address && <p className="mt-1 text-xs">{po.supplier.address}</p>}
            {po.supplier.phone && <p className="text-xs">โทร. {po.supplier.phone}</p>}
            {po.supplier.tax_id && <p className="text-xs">เลขผู้เสียภาษี: {po.supplier.tax_id}</p>}
          </div>
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">รายละเอียด</p>
            <table className="w-full text-xs">
              <tbody>
                <tr><td className="py-0.5 text-muted-foreground">วันที่สร้าง</td><td className="text-right">{format(new Date(po.created_at), "dd/MM/yyyy")}</td></tr>
                {po.expected_date && <tr><td className="py-0.5 text-muted-foreground">กำหนดรับ</td><td className="text-right">{format(new Date(po.expected_date), "dd/MM/yyyy")}</td></tr>}
                {po.reference_doc && <tr><td className="py-0.5 text-muted-foreground">อ้างอิง</td><td className="text-right font-mono">{po.reference_doc}</td></tr>}
                <tr><td className="py-0.5 text-muted-foreground">ผู้สร้าง</td><td className="text-right">{po.creator.full_name}</td></tr>
                {po.approver && <tr><td className="py-0.5 text-muted-foreground">ผู้อนุมัติ</td><td className="text-right">{po.approver.full_name}</td></tr>}
                {po.carrier && <tr><td className="py-0.5 text-muted-foreground">ผู้ขนส่ง</td><td className="text-right">{po.carrier}</td></tr>}
                {po.tracking_number && <tr><td className="py-0.5 text-muted-foreground">Tracking</td><td className="text-right font-mono">{po.tracking_number}</td></tr>}
              </tbody>
            </table>
          </div>
        </section>

        {/* Lines */}
        <section className="mb-6">
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="border-b-2 border-foreground">
                <th className="py-2 text-left font-semibold">ลำดับ</th>
                <th className="py-2 text-left font-semibold">รหัสสินค้า</th>
                <th className="py-2 text-left font-semibold">รายการ</th>
                <th className="py-2 text-right font-semibold">จำนวน</th>
                <th className="py-2 text-right font-semibold">รับแล้ว</th>
                <th className="py-2 text-right font-semibold">ราคา/หน่วย</th>
                <th className="py-2 text-right font-semibold">รวม</th>
              </tr>
            </thead>
            <tbody>
              {po.lines.map((l: { id: string; product: { sku: string; name: string; unit: string }; qty_ordered: string; qty_received: string; unit_price: string }, idx: number) => {
                const total = Number(l.qty_ordered) * Number(l.unit_price);
                return (
                  <tr key={l.id} className="border-b border-gray-200">
                    <td className="py-2">{idx + 1}</td>
                    <td className="py-2 font-mono text-xs">{l.product.sku}</td>
                    <td className="py-2">{l.product.name}</td>
                    <td className="py-2 text-right">{Number(l.qty_ordered).toLocaleString()} {l.product.unit}</td>
                    <td className="py-2 text-right">{Number(l.qty_received).toLocaleString()}</td>
                    <td className="py-2 text-right">฿{Number(l.unit_price).toLocaleString()}</td>
                    <td className="py-2 text-right font-medium">฿{total.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-foreground">
                <td colSpan={6} className="py-3 text-right text-sm font-semibold">ยอดรวมทั้งสิ้น</td>
                <td className="py-3 text-right text-lg font-bold text-red-600">
                  ฿{po.total_amount ? Number(po.total_amount).toLocaleString() : "0"}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>

        {/* Notes */}
        {po.notes && (
          <section className="mb-6 rounded-lg border border-gray-200 p-3">
            <p className="text-xs font-semibold uppercase text-muted-foreground">หมายเหตุ</p>
            <p className="mt-1 text-sm">{po.notes}</p>
          </section>
        )}

        <DocumentFooter note="กรุณาตรวจสอบความถูกต้องก่อนการจัดส่ง การชำระเงินตามเงื่อนไขที่ตกลง" />
      </DocumentPaper>
    </>
  );
}
