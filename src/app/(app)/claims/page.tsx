"use client";

import { AlertCircle } from "lucide-react";
import { IntakeTicketList } from "@/components/intake/IntakeTicketList";
import { CLAIM_MARKER } from "@/lib/ticket-types";

const RESOLUTION_LABELS: Record<string, string> = {
  REPAIR:             "ส่งซ่อม",
  EXCHANGE:           "เปลี่ยนเครื่อง",
  REFUND:             "ใบลดหนี้ / คืนเงิน",
  RETURN_TO_CUSTOMER: "ส่งคืนลูกค้า",
  REJECTED:           "ออกใบแจ้งหนี้ค่าอะไหล่",
};

export default function ClaimsPage() {
  return (
    <IntakeTicketList
      pageTitle="รับเคลม"
      pageSubtitle="เคลมจากลูกค้า"
      newHref="/claims/new"
      newButtonLabel="รับเคลมใหม่"
      issueColumnLabel="อาการ"
      resolutionLabels={RESOLUTION_LABELS}
      filter={(t) => Boolean(t.notes?.startsWith(CLAIM_MARKER))}
      emptyIcon={<AlertCircle className="h-10 w-10" />}
      emptyText="ยังไม่มีรายการเคลม"
    />
  );
}
