"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Product  = { id: string; name: string; sku: string };
type Customer = { id: string; name: string; code: string };

export default function NewRepairPage() {
  const router = useRouter();
  const { data: productsData } = useSWR<{ products: Product[] }>("/api/products?limit=200", fetcher);
  const { data: customersData } = useSWR("/api/customers", fetcher);

  const products:  Product[]  = productsData?.products ?? [];
  const customers: Customer[] = Array.isArray(customersData) ? customersData : [];

  const [productId,  setProductId]  = useState("");
  const [customerId, setCustomerId] = useState("");
  const [issueDesc,  setIssueDesc]  = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!productId) { setError("กรุณาเลือกสินค้า"); return; }
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/repair", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({
        productId,
        customerId: customerId || null,
        issueDesc:  issueDesc  || null,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "เกิดข้อผิดพลาด");
      setSubmitting(false);
      return;
    }
    router.push(`/repair/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
          ← กลับ
        </button>
        <h2 className="text-lg font-semibold">รับงานซ่อมใหม่</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        )}

        <Card>
          <CardHeader><CardTitle className="text-sm">ข้อมูลงานซ่อม</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>สินค้า *</Label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={productId}
                onChange={(e) => setProductId(e.target.value)}
                required
              >
                <option value="">-- เลือกสินค้า --</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>{p.name} ({p.sku})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>ลูกค้า</Label>
              <select
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">-- ไม่ระบุ --</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.code})</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>อาการเสีย / รายละเอียดปัญหา</Label>
              <textarea
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                rows={4}
                placeholder="อธิบายอาการเสียหรือปัญหาที่พบ…"
                value={issueDesc}
                onChange={(e) => setIssueDesc(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2 pb-4">
          <Button type="button" onClick={() => router.back()} className="bg-muted hover:bg-muted/80 text-foreground">
            ยกเลิก
          </Button>
          <Button type="submit" className="bg-red-600 hover:bg-red-700 text-white font-semibold" disabled={submitting}>
            {submitting ? "กำลังบันทึก…" : "รับงานซ่อม"}
          </Button>
        </div>
      </form>
    </div>
  );
}
