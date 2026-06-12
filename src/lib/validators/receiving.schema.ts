import { z } from "zod";
import { ReceivingType } from "@prisma/client";

export const receivingJobSchema = z
  .object({
    receiving_type: z.nativeEnum(ReceivingType),
    supplier_id: z.string().optional().nullable(),
    customer_id: z.string().optional().nullable(),
    warehouse_id: z.string().min(1),
    reference_doc: z.string().optional().nullable(),
    notes: z.string().optional().nullable(),
  })
  .superRefine((data, ctx) => {
    if (data.receiving_type === "NEW_GOODS" || data.receiving_type === "PARTS") {
      if (!data.supplier_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["supplier_id"],
          message: "ต้องระบุผู้จัดหาสำหรับสินค้าใหม่/อะไหล่",
        });
      }
    }
    if (data.receiving_type === "REPAIR") {
      if (!data.customer_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["customer_id"],
          message: "ต้องระบุลูกค้าสำหรับรับเครื่องซ่อม",
        });
      }
    }
  });

export const receivingLineSchema = z.object({
  product_id: z.string().min(1),
  lot_id: z.string().optional().nullable(),
  expected_qty: z.number().positive(),
  received_qty: z.number().min(0).optional(),
  unit_cost: z.number().min(0).optional(),
  bin_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ReceivingJobInput = z.infer<typeof receivingJobSchema>;
export type ReceivingLineInput = z.infer<typeof receivingLineSchema>;
