"use client";

import { Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

export function PrintToolbar({
  backHref,
  documentName,
}: {
  backHref?: string;
  documentName: string;
}) {
  const router = useRouter();
  return (
    <div className="no-print sticky top-0 z-50 flex items-center justify-between border-b border-border bg-white px-6 py-3 shadow-sm">
      <button
        onClick={() => (backHref ? router.push(backHref) : router.back())}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
      >
        <ArrowLeft className="h-4 w-4" />
        กลับ
      </button>
      <p className="text-sm text-muted-foreground">
        ตัวอย่าง: <span className="font-semibold text-foreground">{documentName}</span>
      </p>
      <button
        onClick={() => window.print()}
        className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
      >
        <Printer className="h-4 w-4" />
        พิมพ์ / บันทึก PDF
      </button>
    </div>
  );
}

export function DocumentPaper({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          .no-print { display: none !important; }
          body { background: white !important; }
          .doc-paper { box-shadow: none !important; margin: 0 !important; padding: 0 !important; max-width: none !important; }
        }
      `}</style>
      <div className="mx-auto my-6 max-w-[210mm] bg-white p-12 shadow-lg doc-paper print:my-0 print:p-0 print:shadow-none">
        {children}
      </div>
    </>
  );
}

export function DocumentHeader({
  title,
  documentNumber,
  status,
  statusColor,
}: {
  title: string;
  documentNumber: string;
  status?: string;
  statusColor?: string;
}) {
  return (
    <header className="mb-8 flex items-start justify-between border-b-2 border-red-600 pb-6">
      <div>
        <p className="text-3xl font-extrabold tracking-tight text-red-600">SUNFORD</p>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">
          ระบบจัดการคลังสินค้า
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          บริษัท ซันฟอร์ด จำกัด · 123 ถนนตัวอย่าง แขวงตัวอย่าง เขตตัวอย่าง กรุงเทพฯ 10000
        </p>
        <p className="text-xs text-muted-foreground">
          โทร. 02-XXX-XXXX · เลขประจำตัวผู้เสียภาษี: 0-0000-00000-00-0
        </p>
      </div>
      <div className="text-right">
        <p className="text-2xl font-bold uppercase tracking-wider">{title}</p>
        <p className="mt-1 font-mono text-sm font-semibold">{documentNumber}</p>
        {status && (
          <span className={`mt-2 inline-block rounded-full px-3 py-0.5 text-xs font-semibold ${statusColor ?? "bg-muted"}`}>
            {status}
          </span>
        )}
      </div>
    </header>
  );
}

export function DocumentFooter({ note }: { note?: string }) {
  return (
    <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
      {note && <p className="mb-4 italic">{note}</p>}
      <div className="grid grid-cols-3 gap-12 pt-12 text-center">
        <div>
          <div className="mx-auto mb-2 h-px w-32 bg-border" />
          <p>ผู้จัดทำ</p>
        </div>
        <div>
          <div className="mx-auto mb-2 h-px w-32 bg-border" />
          <p>ผู้ตรวจสอบ</p>
        </div>
        <div>
          <div className="mx-auto mb-2 h-px w-32 bg-border" />
          <p>ผู้อนุมัติ</p>
        </div>
      </div>
      <p className="mt-6 text-center text-[10px] text-muted-foreground">
        เอกสารนี้พิมพ์โดยระบบ SUNFORD WMS · {new Date().toLocaleString("th-TH")}
      </p>
    </footer>
  );
}
