"use client";

import { use } from "react";
import useSWR from "swr";
import Barcode from "react-barcode";
import { format } from "date-fns";
import { Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

const COPIES = [1, 2, 4, 6, 10];

type Lot = {
  id: string;
  lot_number: string;
  barcode: string;
  status: string;
  created_at: string;
  expires_at: string | null;
  product: { name: string; name_th: string | null; sku: string; unit: string };
  stock_items: { qty_on_hand: number; bin: { code: string; warehouse: { name: string } } }[];
};

export default function PrintBarcodePage({
  params,
}: {
  params: Promise<{ lotId: string }>;
}) {
  const { lotId } = use(params);
  const router = useRouter();
  const { data: lot, isLoading } = useSWR<Lot>(
    `/api/lots/${lotId}`,
    fetcher
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
        กำลังโหลด…
      </div>
    );
  }

  if (!lot || (lot as { error?: string }).error) {
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        ไม่พบ Lot
      </div>
    );
  }

  const totalQty = (lot.stock_items ?? []).reduce(
    (s, i) => s + Number(i.qty_on_hand),
    0
  );

  return (
    <>
      {/* ── Print styles ─────────────────────────────────────────────────────── */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .print-grid { display: grid !important; }
          body { background: white; }
        }
        @media screen {
          .print-only { display: none; }
        }
      `}</style>

      {/* ── Screen toolbar ───────────────────────────────────────────────────── */}
      <div className="no-print mb-6 flex items-center justify-between">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4" />
          กลับ
        </button>

        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            Lot: <span className="font-mono font-semibold text-foreground">{lot.lot_number}</span>
          </span>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
          >
            <Printer className="h-4 w-4" />
            พิมพ์บาร์โค้ด
          </button>
        </div>
      </div>

      {/* ── Label preview (screen) ────────────────────────────────────────────── */}
      <div className="no-print flex justify-center">
        <LabelCard lot={lot} totalQty={totalQty} />
      </div>

      {/* ── Print grid (hidden on screen, shown on print) ─────────────────────── */}
      <div
        className="print-only print-grid"
        style={{
          display: "none",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: "8mm",
          padding: "8mm",
        }}
      >
        {/* พิมพ์ 4 ใบต่อหน้า A4 */}
        {Array.from({ length: 4 }).map((_, i) => (
          <LabelCard key={i} lot={lot} totalQty={totalQty} />
        ))}
      </div>
    </>
  );
}

function LabelCard({
  lot,
  totalQty,
}: {
  lot: Lot;
  totalQty: number;
}) {
  return (
    <div
      style={{
        width: "88mm",
        minHeight: "50mm",
        border: "1px solid #d1d5db",
        borderRadius: "4px",
        padding: "6mm",
        background: "white",
        fontFamily: "monospace",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "4px",
        pageBreakInside: "avoid",
      }}
    >
      {/* Product name */}
      <p style={{ fontSize: "11pt", fontWeight: 700, textAlign: "center", margin: 0, fontFamily: "sans-serif" }}>
        {lot.product.name_th ?? lot.product.name}
      </p>
      <p style={{ fontSize: "8pt", color: "#6b7280", margin: 0, fontFamily: "sans-serif" }}>
        {lot.product.sku}
      </p>

      {/* Barcode */}
      <div style={{ margin: "2mm 0" }}>
        <Barcode
          value={lot.barcode}
          width={1.5}
          height={45}
          fontSize={10}
          margin={0}
          displayValue={false}
        />
      </div>

      {/* Lot number under barcode */}
      <p style={{ fontSize: "9pt", fontWeight: 600, margin: 0, letterSpacing: "0.05em" }}>
        {lot.lot_number}
      </p>

      {/* Details row */}
      <div
        style={{
          display: "flex",
          gap: "8mm",
          fontSize: "7.5pt",
          color: "#374151",
          marginTop: "2mm",
          fontFamily: "sans-serif",
        }}
      >
        <span>จำนวน: <strong>{totalQty} {lot.product.unit}</strong></span>
        <span>วันที่: <strong>{format(new Date(lot.created_at), "dd/MM/yy")}</strong></span>
        {lot.expires_at && (
          <span>หมดอายุ: <strong>{format(new Date(lot.expires_at), "dd/MM/yy")}</strong></span>
        )}
      </div>
    </div>
  );
}
