import { z } from "zod";
import { ReceivingType } from "@prisma/client";

export const receivingJobSchema = z.object({
  receiving_type: z.nativeEnum(ReceivingType),
  supplier_id: z.string().optional().nullable(),
  warehouse_id: z.string().min(1),
  reference_doc: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const receivingLineSchema = z.object({
  product_id: z.string().min(1),
  lot_id: z.string().optional().nullable(),
  expected_qty: z.number().positive(),
  received_qty: z.number().min(0).optional(),
  bin_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ReceivingJobInput = z.infer<typeof receivingJobSchema>;
export type ReceivingLineInput = z.infer<typeof receivingLineSchema>;
