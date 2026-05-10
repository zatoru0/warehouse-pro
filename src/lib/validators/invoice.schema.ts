import { z } from "zod";
import { InvoiceStatus } from "@prisma/client";

export const invoiceLineSchema = z.object({
  product_id:  z.string().optional().nullable(),
  description: z.string().min(1),
  qty:         z.number().positive().default(1),
  unit_price:  z.number().min(0),
});

export const invoiceSchema = z.object({
  customer_id:       z.string().optional().nullable(),
  service_ticket_id: z.string().optional().nullable(),
  reason:            z.string().min(1),
  notes:             z.string().optional().nullable(),
  due_date:          z.string().optional().nullable(),
  lines:             z.array(invoiceLineSchema).min(1),
});

export const invoiceUpdateSchema = z.object({
  status: z.nativeEnum(InvoiceStatus).optional(),
  notes:  z.string().optional().nullable(),
});
