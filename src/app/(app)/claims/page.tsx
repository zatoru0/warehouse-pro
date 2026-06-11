"use client";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Factory, UserX } from "lucide-react";

export default function ClaimPage() {
  useEffect(() => { document.title = "ทำรายการเคลมสินค้า — SUNFORD"; }, []);

  const [productId, setProductId] = useState("");
  const [customerId, setCustomerId] = useState("");
  // เปลี่ยน State ให้ตรงกับ 3 ทางแยกใน Flowchart
  const [claimStatus, setClaimStatus] = useState<"NOT_BROKEN" | "BROKEN_BY_PRODUCT" | "BROKEN_BY_CUSTOMER" | "">("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!claimStatus) {
      alert("กรุณาเลือกผลการตรวจสอบสถานะสินค้า");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/claims/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          product_id: productId, 
          customer_id: customerId, 
          qty: 1, 
          status: claimStatus 
        })
      });

      const data = await res.json();

      if (res.ok) {
        alert("✅ บันทึกรายการเคลมสำเร็จ!");
        setProductId("");
        setCustomerId("");
        setClaimStatus("");
      } else {
        alert(`❌ เกิดข้อผิดพลาด: ${data.error || "บันทึกไม่สำเร็จ"}`);
      }
    } catch (error) {
      console.error("API Error:", error);
      alert("❌ ระบบขัดข้อง ไม่สามารถติดต่อเซิร์ฟเวอร์ได้");
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <div className="mx-auto max-w-3xl p-4 space-y-6">
      <h2 className="text-2xl font-bold">ระบบเคลมสินค้า (Admin QC)</h2>
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>รหัสสินค้า / SKU</Label>
                <Input required value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="เช่น SKU-001" />
              </div>
              <div className="space-y-2">
                <Label>ชื่อลูกค้า</Label>
                <Input required value={customerId} onChange={(e) => setCustomerId(e.target.value)} placeholder="ชื่อผู้แจ้งเคลม" />
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-bold text-red-600">ผลการตรวจสอบสถานะสินค้า</Label>
              <div className="grid grid-cols-3 gap-4">
                
                {/* 1. เครื่องไม่เสีย */}
                <button type="button" onClick={() => setClaimStatus("NOT_BROKEN")}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 text-center transition-all ${claimStatus === "NOT_BROKEN" ? "border-green-500 bg-green-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <CheckCircle2 className={`h-8 w-8 ${claimStatus === "NOT_BROKEN" ? "text-green-600" : "text-gray-400"}`} />
                  <div>
                    <span className="block font-bold">เครื่องไม่เสีย</span>
                    <span className="text-xs text-muted-foreground">(ทำเรื่องส่งคืนสินค้า)</span>
                  </div>
                </button>

                {/* 2. เสียโดยสินค้า */}
                <button type="button" onClick={() => setClaimStatus("BROKEN_BY_PRODUCT")}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 text-center transition-all ${claimStatus === "BROKEN_BY_PRODUCT" ? "border-amber-500 bg-amber-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <Factory className={`h-8 w-8 ${claimStatus === "BROKEN_BY_PRODUCT" ? "text-amber-600" : "text-gray-400"}`} />
                  <div>
                    <span className="block font-bold">เสียโดยสินค้า</span>
                    <span className="text-xs text-muted-foreground">(ทำเรื่องเคลมรอซ่อม)</span>
                  </div>
                </button>

                {/* 3. เสียจากลูกค้า */}
                <button type="button" onClick={() => setClaimStatus("BROKEN_BY_CUSTOMER")}
                  className={`p-4 rounded-xl border-2 flex flex-col items-center gap-3 text-center transition-all ${claimStatus === "BROKEN_BY_CUSTOMER" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:bg-gray-50"}`}>
                  <UserX className={`h-8 w-8 ${claimStatus === "BROKEN_BY_CUSTOMER" ? "text-blue-600" : "text-gray-400"}`} />
                  <div>
                    <span className="block font-bold">เสียจากลูกค้า</span>
                    <span className="text-xs text-muted-foreground">(แลกเครื่องใหม่-คืนเก่า)</span>
                  </div>
                </button>

              </div>
            </div>

            <Button type="submit" disabled={loading || !claimStatus} className="w-full h-12 text-lg bg-red-600 hover:bg-red-700 disabled:opacity-50">
              {loading ? "กำลังบันทึก..." : "ยืนยันรายการเคลม"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}