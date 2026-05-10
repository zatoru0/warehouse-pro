import { z } from "zod";
import { OrderChannel } from "@prisma/client";

export const orderSchema = z.object({
  channel:      z.nativeEnum(OrderChannel).default(OrderChannel.WALK_IN),
  customer_id:  z.string().optional().nullable(),
  notes:        z.string().optional().nullable(),
  total_amount: z.number().optional().nullable(),
});

export const orderLineSchema = z.object({
  product_id: z.string().min(1),
  qty:        z.number().positive(),
  unit_price: z.number().min(0),
  notes:      z.string().optional().nullable(),
});

export type OrderInput     = z.infer<typeof orderSchema>;
export type OrderLineInput = z.infer<typeof orderLineSchema>;
