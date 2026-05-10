import { z } from "zod";

export const productSchema = z.object({
  category_id: z.string().optional().nullable(),
  sku:         z.string().min(1),
  barcode:     z.string().optional().nullable(),
  name:        z.string().min(1),
  name_th:     z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  unit:        z.string().default("PCS"),
  cost_price:  z.number().optional().nullable(),
  sale_price:  z.number().optional().nullable(),

  // Behaviors (9 ตัว)
  allow_sale:        z.boolean().default(true),
  allow_purchase:    z.boolean().default(true),
  allow_repair:      z.boolean().default(false),
  allow_claim:       z.boolean().default(false),
  allow_qc:          z.boolean().default(true),
  allow_return:      z.boolean().default(false),
  allow_assembly:    z.boolean().default(false),
  allow_disassembly: z.boolean().default(false),
  allow_certify:     z.boolean().default(false),

  min_stock_qty: z.number().int().default(0),
  reorder_qty:   z.number().int().default(0),
  image_url:     z.string().optional().nullable(),

  // คลังเริ่มต้น
  default_warehouse_id: z.string().optional().nullable(),
  default_bin_id:       z.string().optional().nullable(),

  // การแสดงผล
  display_order: z.number().int().default(0),
  show_in_pos:   z.boolean().default(true),
});

export type ProductInput = z.infer<typeof productSchema>;
