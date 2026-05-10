"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import { ORDER_CHANNELS } from "@/lib/order-channels";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Customer = { id: string; name: string; code: string };

export default function NewOrderPage() {
  const router = useRouter();
  const { data: customersData } = useSWR("/api/customers", fetcher);
  const customers: Customer[] = Array.isArray(customersData) ? customersData : [];

  const [channel, setChannel] = useState("WALK_IN");
  const [customerId, setCustomerId] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    const res = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel,
        customer_id: customerId || null,
        notes:       notes || null,
      }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error?.formErrors?.[0] ?? "เกิดข้อผิดพลาด");
      setSubmitting(false);
      return;
    }

    router.push(`/orders/${data.id}`);
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted"
        >
          ← กลับ
        </button>
        <h2 className="text-lg font-semibold">สร้างคำสั่งซื้อใหม่</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">ข้อมูลคำสั่งซื้อ</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}

            <div className="space-y-2">
              <Label>ช่องทางการขาย</Label>

              {/* Online channels */}
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground pt-1">Online</p>
              <div className="grid grid-cols-5 gap-2">
                {ORDER_CHANNELS.filter((c) => c.group === "online").map((c) => (
                  <button
                    type="button"
                    key={c.value}
                    onClick={() => setChannel(c.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs transition-colors ${
                      channel === c.value
                        ? "border-red-600 bg-red-600/10 text-red-600 font-semibold"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-lg leading-none">{c.icon}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>

              {/* Offline channels */}
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground pt-2">Offline</p>
              <div className="grid grid-cols-4 gap-2">
                {ORDER_CHANNELS.filter((c) => c.group === "offline").map((c) => (
                  <button
                    type="button"
                    key={c.value}
                    onClick={() => setChannel(c.value)}
                    className={`flex flex-col items-center gap-1 rounded-lg border px-2 py-3 text-xs transition-colors ${
                      channel === c.value
                        ? "border-red-600 bg-red-600/10 text-red-600 font-semibold"
                        : "border-border hover:bg-muted/50"
                    }`}
                  >
                    <span className="text-lg leading-none">{c.icon}</span>
                    <span>{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="customer">ลูกค้า (ไม่บังคับ)</Label>
              <select
                id="customer"
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={customerId}
                onChange={(e) => setCustomerId(e.target.value)}
              >
                <option value="">-- ลูกค้าหน้าร้าน --</option>
                {(customers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">หมายเหตุ</Label>
              <textarea
                id="notes"
                rows={3}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="submit"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold"
                disabled={submitting}
              >
                {submitting ? "กำลังสร้าง…" : "สร้างคำสั่งซื้อ"}
              </Button>
              <Button
                type="button"
                onClick={() => router.back()}
                className="bg-muted hover:bg-muted/80 text-foreground"
              >
                ยกเลิก
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
