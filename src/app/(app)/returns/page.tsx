"use client";

import { PackageX } from "lucide-react";
import { IntakeTicketList } from "@/components/intake/IntakeTicketList";
import { RETURN_MARKER } from "@/lib/ticket-types";

const RESOLUTION_LABELS: Record<string, string> = {
  REPAIR:             "เคลม → ส่งซ่อม",
  EXCHANGE:           "แลกเครื่องใหม่",
  REFUND:             "ใบลดหนี้ / คืนเงิน",
  RETURN_TO_CUSTOMER: "เครื่องไม่เสีย → คืนลูกค้า",
  REJECTED:           "ปฏิเสธคืนสินค้า",
};

export default function ReturnsPage() {
  return (
    <IntakeTicketList
      pageTitle="รับสินค้าส่งคืน"
      pageSubtitle="ลูกค้าส่งสินค้าคืนเพื่อตรวจสอบสภาพ"
      newHref="/returns/new"
      newButtonLabel="รับคืนใหม่"
      issueColumnLabel="เหตุผลส่งคืน"
      resolutionLabels={RESOLUTION_LABELS}
      filter={(t) => Boolean(t.notes?.startsWith(RETURN_MARKER))}
      emptyIcon={<PackageX className="h-10 w-10" />}
      emptyText="ยังไม่มีรายการคืนสินค้า"
    />
  );
}
