import { z } from "zod";
import { ServiceTicketStatus, ServiceTicketResolution } from "@prisma/client";

export const serviceTicketSchema = z.object({
  customer_id: z.string().optional().nullable(),
  product_id:  z.string().optional().nullable(),
  lot_id:      z.string().optional().nullable(),
  order_id:    z.string().optional().nullable(),
  issue_desc:  z.string().min(1),
  inspection:  z.string().optional().nullable(),
  notes:       z.string().optional().nullable(),
});

export const serviceTicketUpdateSchema = z.object({
  status:        z.nativeEnum(ServiceTicketStatus).optional(),
  resolution:    z.nativeEnum(ServiceTicketResolution).optional().nullable(),
  inspection:    z.string().optional().nullable(),
  repair_job_id: z.string().optional().nullable(),
  exchange_id:   z.string().optional().nullable(),
  notes:         z.string().optional().nullable(),
});
