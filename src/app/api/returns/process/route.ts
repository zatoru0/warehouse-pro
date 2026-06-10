import { NextRequest, NextResponse } from "next/server";
import { requireDepartment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Department } from "@prisma/client";

export async function POST(req: NextRequest) {
  // 1. เช็กสิทธิ์
  const { error, user } = await requireDepartment(req, [
    Department.QC, 
    Department.ADMIN_DEPT, 
    Department.INBOUND
  ]);
  
  if (error) return error;

  try {
    const body = await req.json();
    const { 
      job_id, 
      product_id, 
      lot_id, 
      customer_id, 
      qty, 
      result, 
      amount 
    } = body;

    // 2. ระบบค้นหาสินค้า
    const actualProduct = await prisma.product.findFirst({
      where: {
        OR: [
          { id: product_id },
          { sku: product_id },
          { barcode: product_id }
        ]
      }
    });

    if (!actualProduct) {
      return NextResponse.json({ 
        error: `ไม่พบข้อมูลสินค้า: ${product_id} กรุณาตรวจสอบรหัสให้ถูกต้อง` 
      }, { status: 400 });
    }

    const realProductId = actualProduct.id;

    // 3. เริ่มบันทึกข้อมูล (Transaction)
    const response = await prisma.$transaction(async (tx) => {
      
      // ✨ จุดที่เพิ่มใหม่: จัดการ Lot ID อัตโนมัติ ป้องกันค่าว่าง
      let actualLotId = lot_id;
      if (!actualLotId) {
        // ค้นหาว่าสินค้านี้เคยมี Lot ไหม เอาอันแรกมาใช้
        const existingLot = await tx.lot.findFirst({
          where: { product_id: realProductId }
        });
        
        if (existingLot) {
          actualLotId = existingLot.id;
        } else {
          // ถ้าไม่เคยมี Lot เลย ให้สร้าง Lot คืนสินค้า (Return Lot) ขึ้นมาใหม่
          const newLot = await tx.lot.create({
            data: {
              product_id: realProductId,
              lot_number: `RET-${Date.now()}`,
              barcode: `RET-${Date.now()}`,
              status: "ACTIVE"
            }
          });
          actualLotId = newLot.id;
        }
      }

      // ==========================================
      // กรณี: QC ผ่าน
      // ==========================================
      if (result === "PASS") {
        await tx.creditNote.create({
          data: {
            cn_number: `CN-${Date.now()}`,
            reason: `คืนเงินสินค้าสมบูรณ์ (ลูกค้า: ${customer_id})`,
            total_amount: amount,
            status: "DRAFT",
            issued_by: user!.id,
            lines: {
              create: [{
                product_id: realProductId,
                description: "คืนเงินค่าสินค้า",
                qty: qty,
                unit_price: amount,
                amount: amount
              }]
            }
          }
        });

        const returnBin = await tx.bin.findFirst({ where: { code: "RETURNED_GOODS" } });
        if (returnBin) {
          await tx.stockItem.upsert({
            where: {
              product_id_lot_id_bin_id: { 
                product_id: realProductId, 
                lot_id: actualLotId, // ใช้ Lot ID ที่เช็กแล้ว
                bin_id: returnBin.id 
              }
            },
            update: { qty_on_hand: { increment: qty } },
            create: { 
              product_id: realProductId, 
              lot_id: actualLotId, // ใช้ Lot ID ที่เช็กแล้ว
              bin_id: returnBin.id, 
              qty_on_hand: qty 
            }
          });
          
          await tx.stockMovement.create({
            data: {
              product_id: realProductId,
              lot_id: actualLotId, // ใช้ Lot ID ที่เช็กแล้ว
              movement_type: "RECEIVE",
              reference_type: "RETURN",
              qty: qty,
              to_bin_id: returnBin.id,
              performed_by: user!.id,
              notes: "QC ผ่าน: ส่งเข้าคลังสินค้ารับคืน",
            }
          });
        }
      } 
      
      // ==========================================
      // กรณี: QC ไม่ผ่าน
      // ==========================================
      else if (result === "FAIL") {
        await tx.invoice.create({
          data: {
            invoice_number: `INV-${Date.now()}`,
            reason: `เรียกเก็บค่าอะไหล่/ซ่อมแซม (ลูกค้า: ${customer_id})`,
            total_amount: amount,
            status: "DRAFT",
            issued_by: user!.id,
            lines: {
              create: [{
                product_id: realProductId,
                description: "ค่าบริการและชิ้นส่วนอะไหล่",
                qty: 1,
                unit_price: amount,
                amount: amount
              }]
            }
          }
        });

        const repairBin = await tx.bin.findFirst({ where: { code: "WAIT_REPAIR" } });
        if (repairBin) {
          await tx.stockItem.upsert({
            where: {
              product_id_lot_id_bin_id: { 
                product_id: realProductId, 
                lot_id: actualLotId, // ใช้ Lot ID ที่เช็กแล้ว
                bin_id: repairBin.id 
              }
            },
            update: { qty_on_hand: { increment: qty } },
            create: { 
              product_id: realProductId, 
              lot_id: actualLotId, // ใช้ Lot ID ที่เช็กแล้ว
              bin_id: repairBin.id, 
              qty_on_hand: qty 
            }
          });

          await tx.stockMovement.create({
            data: {
              product_id: realProductId,
              lot_id: actualLotId, // ใช้ Lot ID ที่เช็กแล้ว
              movement_type: "TRANSFER",
              reference_type: "RETURN",
              qty: qty,
              to_bin_id: repairBin.id,
              performed_by: user!.id,
              notes: "QC ไม่ผ่าน: ส่งเครื่องเข้าคลัง WAIT_REPAIR",
            }
          });
        }
      }

      return { success: true };
    });

    return NextResponse.json(response, { status: 200 });

  } catch (error: any) {
    console.error("Return QC API Error:", error);
    return NextResponse.json({ error: error.message || "เกิดข้อผิดพลาดในการประมวลผล" }, { status: 500 });
  }
}