import { z } from "zod";

export const productionJobSchema = z.object({
  job_type: z.enum(["ASSEMBLY", "DISASSEMBLY", "REPAIR"]),
  product_id: z.string().min(1),
  lot_id: z.string().optional().nullable(),
  qty_planned: z.number().positive(),
  warehouse_id: z.string().min(1),
  assigned_to: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type ProductionJobInput = z.infer<typeof productionJobSchema>;
