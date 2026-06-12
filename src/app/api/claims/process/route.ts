import { NextRequest, NextResponse } from "next/server";
import { requireDepartment } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Department } from "@prisma/client";

export async function POST(req: NextRequest) {
  const { error, user } = await requireDepartment(req, [Department.QC, Department.ADMIN_DEPT]);
  if (error) return error;

  try {
    const body = await req.json();
    const { product_id, customer_id, qty, status } = body;

    // 1. ตรวจสอบแค่รหัสสินค้าเท่านั้น! 
    const product = await prisma.product.findFirst({
      where: { OR: [{ id: product_id }, { sku: product_id }, { barcode: product_id }] }
    });
    
    if (!product) return NextResponse.json({ error: "ไม่พบรหัสสินค้าในระบบ กรุณาตรวจสอบอีกครั้ง" }, { status: 400 });

    // ❌ ตัดการตรวจสอบข้อมูลลูกค้าออกไปเลย ❌

    const response = await prisma.$transaction(async (tx) => {
      const claimLot = await tx.lot.findFirst({ where: { product_id: product.id } });
      const lotId = claimLot?.id || (await tx.lot.create({
        data: { product_id: product.id, lot_number: `CLM-${Date.now()}`, barcode: `CLM-${Date.now()}`, status: "ACTIVE" }
      })).id;

      // 1. เครื่องไม่เสีย -> ทำเรื่องส่งคืนสินค้า
      if (status === "NOT_BROKEN") {
        await tx.stockMovement.create({
          data: {
            product_id: product.id, lot_id: lotId, movement_type: "TRANSFER",
            reference_type: "CLAIM", qty, performed_by: user!.id,
            // เอาชื่อที่พิมพ์มา ใส่ในวงเล็บได้เลย
            notes: `เคลม (เครื่องไม่เสีย): ทำเรื่องส่งคืนให้คุณ ${customer_id}` 
          }
        });
      } 
      // 2. เสียโดยสินค้า -> ทำเรื่องเคลมรอซ่อม (เข้าคลังซ่อม)
      else if (status === "BROKEN_BY_PRODUCT") {
        const repairBin = await tx.bin.findFirst({ where: { code: "WAIT_REPAIR" } });
        if (repairBin) {
          await tx.stockItem.upsert({
            where: { product_id_lot_id_bin_id: { product_id: product.id, lot_id: lotId, bin_id: repairBin.id } },
            update: { qty_on_hand: { increment: qty } },
            create: { product_id: product.id, lot_id: lotId, bin_id: repairBin.id, qty_on_hand: qty }
          });
          
          await tx.stockMovement.create({
            data: {
              product_id: product.id, lot_id: lotId, movement_type: "TRANSFER",
              reference_type: "CLAIM", qty, performed_by: user!.id,
              notes: `เคลม (เสียโดยสินค้า): ส่งเข้าแผนกซ่อม (ลูกค้า: ${customer_id})`
            }
          });

          await tx.repairJob.create({
            data: {
              job_number: `RP-CLM-${Date.now()}`,
              product_id: product.id,
              // ⚠️ ลบบรรทัด customer_id ทิ้งไปเลย เพื่อไม่ให้ฐานข้อมูล Error 500
              status: "WAIT_REPAIR", 
              // ย้ายชื่อลูกค้ามาแปะไว้ในรายละเอียดแทน
              issue_desc: `งานเคลมสินค้าชำรุดจากโรงงาน (ชื่อลูกค้า: ${customer_id})`,
              received_by: user!.id
            }
          }); 
        }
      }
      // 3. เสียจากลูกค้า -> แลกเครื่อง (รับเครื่องเก่าเข้าคลังซ่อม + ตัดสต็อกหน้าตู้)
      else if (status === "BROKEN_BY_CUSTOMER") {
        // 3.1 รับเครื่องเก่าเข้าคลัง
        const repairBin = await tx.bin.findFirst({ where: { code: "WAIT_REPAIR" } });
        if (repairBin) {
          await tx.stockItem.upsert({
            where: { product_id_lot_id_bin_id: { product_id: product.id, lot_id: lotId, bin_id: repairBin.id } },
            update: { qty_on_hand: { increment: qty } },
            create: { product_id: product.id, lot_id: lotId, bin_id: repairBin.id, qty_on_hand: qty }
          });

          // ✨ เพิ่มส่วนนี้: สร้างตั๋วงานซ่อมแซมเพื่อให้แสดงบนหน้าจอคิวงานของฝ่ายซ่อม
          await tx.repairJob.create({
            data: {
              job_number: `RP-EXC-${Date.now()}`,
              product_id: product.id,
              status: "WAIT_REPAIR",
              issue_desc: `เครื่องเก่ารับคืนจากการแลกเปลี่ยน (เสียจากลูกค้า) - ชื่อลูกค้า: ${customer_id}`,
              received_by: user!.id
            }
          });
        }

        // 3.2 ตัดสต็อกเครื่องใหม่ให้ลูกค้า (หน้าตู้) - ✨ แก้ไขเพื่อป้องกันบั๊กตัดสต็อกผิดพลาด
        const frontBin = await tx.bin.findFirst({ where: { code: "FRONT_STOCK" } }); 
        if (frontBin) {
          const availableStock = await tx.stockItem.findFirst({
            where: { product_id: product.id, bin_id: frontBin.id, qty_on_hand: { gte: qty } }
          });

          if (!availableStock) {
            throw new Error("สต็อกเครื่องใหม่ (FRONT_STOCK) ไม่เพียงพอสำหรับการแลกเปลี่ยน");
          }

          await tx.stockItem.update({
            where: { 
              product_id_lot_id_bin_id: { 
                product_id: product.id, 
                lot_id: availableStock.lot_id, 
                bin_id: frontBin.id 
              } 
            },
            data: { qty_on_hand: { decrement: qty } }
          });
        }

        await tx.stockMovement.create({
          data: {
            product_id: product.id, lot_id: lotId, movement_type: "ISSUE",
            reference_type: "CLAIM", qty, performed_by: user!.id,
            notes: `เคลม (เสียจากลูกค้า): แจ้งและแลกเครื่องใหม่ให้คุณ ${customer_id} เรียบร้อย`
          }
        });
      }

      return { success: true };
    });

    return NextResponse.json(response);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}