"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ReturnQCPage() {

  useEffect(() => {
    // กำหนดชื่อแท็บเบราว์เซอร์ให้แสดงคำว่า "รับคืนสินค้า" 
    document.title = "รับคืนสินค้า";
  }, []);
  
  const router = useRouter();
  
  // State สำหรับฟอร์ม
  const [jobId, setJobId] = useState("");
  const [productId, setProductId] = useState("");
  const [customerId, setCustomerId] = useState(""); // ยังคงใช้ชื่อตัวแปรเดิมเพื่อให้รองรับกับ API หลังบ้าน
  const [qty, setQty] = useState<number>(1);
  const [result, setResult] = useState<"PASS" | "FAIL" | "">("");
  const [amount, setAmount] = useState<number | "">("");
  
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function handleSubmit(e: React.SyntheticEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!result) {
      setError("กรุณาเลือกผลการตรวจสอบ QC (ผ่าน หรือ ไม่ผ่าน)");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/returns/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          job_id: jobId || "WALK-IN-RETURN",
          product_id: productId,
          lot_id: "", 
          customer_id: customerId,
          qty: Number(qty),
          result: result,
          amount: Number(amount)
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "เกิดข้อผิดพลาดในการบันทึก");
      }

      setSuccess("บันทึกผล QC และทำรายการสต๊อก/การเงินเรียบร้อยแล้ว!");
      setJobId(""); setProductId(""); setCustomerId(""); setQty(1); setResult(""); setAmount("");
      
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4">
      <div className="flex items-center gap-3">
        <button onClick={() => router.back()} className="rounded-lg px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
          ← กลับ
        </button>
        <h2 className="text-xl font-semibold text-gray-800">ตรวจสอบรับคืนสินค้า (Return QC)</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">บันทึกผลการตรวจสอบสินค้าคืน</CardTitle>
          <CardDescription>
            ระบุผลการตรวจสอบเพื่อแยกสินค้าเข้าคลัง และออกเอกสารการเงินอัตโนมัติ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* ข้อความแจ้งเตือน */}
            {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-600 border border-red-200">{error}</div>}
            {success && <div className="rounded-md bg-green-50 p-3 text-sm text-green-600 border border-green-200">{success}</div>}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>รหัสสินค้า (Product ID)</Label>
                <Input required placeholder="เช่น SKU-00501" value={productId} onChange={(e) => setProductId(e.target.value)} />
              </div>
              
              {/* ✨ จุดที่แก้ไข: เปลี่ยนจากรหัสลูกค้าเป็นชื่อลูกค้า */}
              <div className="space-y-2">
                <Label>ชื่อลูกค้า</Label>
                <Input required placeholder="ระบุชื่อลูกค้า (เช่น สมชาย ใจดี)" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>เลขอ้างอิงงานคืน (ถ้ามี)</Label>
                <Input placeholder="เช่น RCV-2026..." value={jobId} onChange={(e) => setJobId(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>จำนวน (ชิ้น)</Label>
                <Input type="number" min="1" required value={qty} onChange={(e) => setQty(Number(e.target.value))} />
              </div>
            </div>

            <hr className="my-4" />

            {/* ส่วนเลือกผล QC */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">ผลการตรวจสอบ QC</Label>
              <div className="grid grid-cols-2 gap-4">
                {/* ปุ่มผ่าน */}
                <div 
                  onClick={() => setResult("PASS")}
                  className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all ${
                    result === "PASS" ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 hover:border-green-300"
                  }`}
                >
                  <CheckCircle2 className={`h-8 w-8 ${result === "PASS" ? "text-green-600" : "text-gray-400"}`} />
                  <div className="text-center">
                    <div className="font-bold">ผ่าน (สภาพสมบูรณ์)</div>
                    <div className="text-xs opacity-80">ทำใบลดหนี้ & เข้าคลังพร้อมขาย</div>
                  </div>
                </div>

                {/* ปุ่มไม่ผ่าน */}
                <div 
                  onClick={() => setResult("FAIL")}
                  className={`cursor-pointer rounded-xl border-2 p-4 flex flex-col items-center justify-center gap-2 transition-all ${
                    result === "FAIL" ? "border-red-500 bg-red-50 text-red-700" : "border-gray-200 hover:border-red-300"
                  }`}
                >
                  <XCircle className={`h-8 w-8 ${result === "FAIL" ? "text-red-600" : "text-gray-400"}`} />
                  <div className="text-center">
                    <div className="font-bold">ไม่ผ่าน (สินค้าชำรุด)</div>
                    <div className="text-xs opacity-80">ทำใบแจ้งหนี้ & ส่งเข้าคลังซ่อม</div>
                  </div>
                </div>
              </div>
            </div>

            {/* ช่องกรอกเงิน (เปลี่ยนตามผล QC) */}
            {result && (
              <div className={`p-4 rounded-lg border ${result === "PASS" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                <Label className={`text-base font-bold ${result === "PASS" ? "text-green-700" : "text-red-700"}`}>
                  {result === "PASS" ? "💰 ยอดเงินที่ต้องคืนลูกค้า (บาท)" : "🛠️ ค่าอะไหล่/ค่าบริการที่ต้องเรียกเก็บ (บาท)"}
                </Label>
                <Input 
                  type="number" 
                  min="0" 
                  required 
                  className="mt-2 text-lg font-semibold"
                  placeholder="0.00" 
                  value={amount} 
                  onChange={(e) => setAmount(Number(e.target.value))} 
                />
                <p className="text-xs mt-2 text-gray-500">
                  {result === "PASS" 
                    ? "*ระบบจะสร้างใบลดหนี้ (Credit Note) อัตโนมัติ" 
                    : "*ระบบจะสร้างใบแจ้งหนี้ (Invoice) อัตโนมัติ"}
                </p>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" disabled={submitting || !result} className={`flex-1 font-semibold ${
                result === "PASS" ? "bg-green-600 hover:bg-green-700 text-white" : 
                result === "FAIL" ? "bg-red-600 hover:bg-red-700 text-white" : ""
              }`}>
                {submitting ? "กำลังบันทึก..." : "ยืนยันผลการตรวจสอบ"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}