import { z } from "zod";

export const qcRecordSchema = z.object({
  receiving_job_id: z.string().optional().nullable(),
  production_job_id: z.string().optional().nullable(),
  product_id: z.string().min(1),
  lot_id: z.string().optional().nullable(),
  qty_inspected: z.number().positive(),
});

export const qcSubmitSchema = z.object({
  qty_passed: z.number().min(0),
  qty_failed: z.number().min(0),
  checklist: z.array(z.object({ criterion: z.string(), passed: z.boolean() })).optional(),
  notes: z.string().optional().nullable(),
  pass_bin_id: z.string().optional().nullable(),
  fail_bin_id: z.string().optional().nullable(),
});

export type QcRecordInput = z.infer<typeof qcRecordSchema>;
export type QcSubmitInput = z.infer<typeof qcSubmitSchema>;
