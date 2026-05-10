import { z } from "zod";
import { ProductionPriority } from "@prisma/client";

export const productionJobSchema = z.object({
  job_type:       z.enum(["REPAIR", "ASSEMBLY", "DISASSEMBLY"]),
  product_id:     z.string().min(1),
  lot_id:         z.string().optional().nullable(),
  qty_planned:    z.number().positive(),
  warehouse_id:   z.string().min(1),
  assigned_to:    z.string().optional().nullable(),
  priority:       z.nativeEnum(ProductionPriority).default(ProductionPriority.NORMAL),
  should_certify: z.boolean().default(false),
  notes:          z.string().optional().nullable(),
});

export type ProductionJobInput = z.infer<typeof productionJobSchema>;
