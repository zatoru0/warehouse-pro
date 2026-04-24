import { z } from "zod";
import { OrderChannel } from "@prisma/client";

export const orderSchema = z.object({
  channel: z.nativeEnum(OrderChannel),
  channel_ref: z.string().optional().nullable(),
  customer_id: z.string().optional().nullable(),
  warehouse_id: z.string().optional().nullable(),
  shipping_address: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  total_amount: z.number().optional().nullable(),
});

export const orderLineSchema = z.object({
  product_id: z.string().min(1),
  lot_id: z.string().optional().nullable(),
  qty_ordered: z.number().positive(),
  unit_price: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export type OrderInput = z.infer<typeof orderSchema>;
export type OrderLineInput = z.infer<typeof orderLineSchema>;
