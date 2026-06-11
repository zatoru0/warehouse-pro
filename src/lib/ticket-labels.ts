export const TICKET_STATUS_COLORS: Record<string, string> = {
  OPEN:      "bg-red-500/10 text-red-600",
  IN_REVIEW: "bg-amber-500/10 text-amber-600",
  CLOSED:    "bg-green-500/10 text-green-600",
  CANCELLED: "bg-muted text-muted-foreground",
};

// Service ticket general (used in /service-tickets)
export const TICKET_STATUS_LABELS: Record<string, string> = {
  OPEN:      "เปิดเคส",
  IN_REVIEW: "กำลังตรวจ",
  CLOSED:    "ปิดเคส",
  CANCELLED: "ยกเลิก",
};

// Admin intake (used in /claims, /returns, /qc admin view)
export const INTAKE_STATUS_LABELS: Record<string, string> = {
  OPEN:      "รอ Admin QC",
  IN_REVIEW: "กำลังตรวจ",
  CLOSED:    "ปิดเคส",
  CANCELLED: "ยกเลิก",
};
