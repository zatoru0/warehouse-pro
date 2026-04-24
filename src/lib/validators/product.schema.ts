import { z } from "zod";

export const productSchema = z.object({
  category_id: z.string().optional().nullable(),
  sku: z.string().min(1),
  barcode: z.string().optional().nullable(),
  name: z.string().min(1),
  name_th: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  unit: z.string().default("PCS"),
  unit_weight: z.number().optional().nullable(),
  unit_volume: z.number().optional().nullable(),
  cost_price: z.number().optional().nullable(),
  sale_price: z.number().optional().nullable(),
  allow_sale: z.boolean().default(true),
  allow_purchase: z.boolean().default(true),
  allow_repair: z.boolean().default(false),
  allow_claim: z.boolean().default(false),
  allow_return: z.boolean().default(false),
  allow_assembly: z.boolean().default(false),
  allow_disassembly: z.boolean().default(false),
  allow_qc: z.boolean().default(true),
  allow_certify: z.boolean().default(false),
  min_stock_qty: z.number().int().default(0),
  reorder_qty: z.number().int().default(0),
  image_url: z.string().optional().nullable(),
});

export type ProductInput = z.infer<typeof productSchema>;
