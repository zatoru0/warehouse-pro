import { prisma } from "@/lib/prisma";
import { Department, Prisma, UserRole } from "@prisma/client";

/**
 * เงื่อนไข where สำหรับ "notification ที่ user คนนี้เห็นได้":
 *  - ของตัวเอง (user_id ตรง) หรือ
 *  - broadcast (user_id null) ที่ target_roles/target_departments ตรงกับ role/แผนกของ user
 */
export function visibleToUser(user: {
  id: string;
  role: UserRole;
  departments: Department[];
}): Prisma.NotificationWhereInput {
  return {
    OR: [
      { user_id: user.id },
      {
        user_id: null,
        AND: [
          {
            OR: [
              { target_roles: { isEmpty: true } },
              { target_roles: { has: user.role } },
            ],
          },
          {
            OR: [
              { target_departments: { isEmpty: true } },
              ...(user.departments.length > 0
                ? [{ target_departments: { hasSome: user.departments } }]
                : []),
            ],
          },
        ],
      },
    ],
  };
}

export type NotificationType =
  | "LOW_STOCK"
  | "RECEIVING_DONE"
  | "PO_DUE"
  | "QC_PENDING"
  | "PRODUCTION_PENDING"
  | "ORDER_PENDING"
  | "SERVICE_TICKET";

// อ้างอิง Update Weekly.pdf (ผังงานระบบคลัง) — การแจ้งเตือน 4 แบบ
//  1. สินค้าถึงเกณฑ์สั่งซื้อ      → Admin (ADMIN_DEPT)
//  2. รับเข้าสินค้า                → ฝ่ายรับเข้า (INBOUND)
//  3. PO จะมาถึงเมื่อไร           → ระบบจัดซื้อ = Admin (+ รับเข้าเตรียมรับ)
//  4. รายการของแต่ละแผนก        → ฝ่ายที่เกี่ยวข้องโดยตรง
const DEFAULT_TARGET_DEPARTMENTS: Record<NotificationType, Department[]> = {
  LOW_STOCK:          ["ADMIN_DEPT"],
  RECEIVING_DONE:     ["INBOUND", "WAREHOUSE"],
  PO_DUE:             ["ADMIN_DEPT", "INBOUND"],
  QC_PENDING:         ["QC", "INBOUND", "PRODUCTION"],
  PRODUCTION_PENDING: ["PRODUCTION"],
  ORDER_PENDING:      ["ADMIN_DEPT"],
  SERVICE_TICKET:     ["AFTER_SALES"],
};

export async function createNotification(params: {
  userId?: string | null;
  type: NotificationType;
  title: string;
  body?: string;
  link?: string;
  targetRoles?: UserRole[];
  targetDepartments?: Department[];
}) {
  const targetDepartments =
    params.targetDepartments ??
    (params.userId ? [] : DEFAULT_TARGET_DEPARTMENTS[params.type] ?? []);

  return prisma.notification.create({
    data: {
      user_id:            params.userId ?? null,
      type:               params.type,
      title:              params.title,
      body:               params.body ?? null,
      link:               params.link ?? null,
      target_roles:       params.targetRoles ?? [],
      target_departments: targetDepartments,
    },
  });
}

export async function checkLowStock(productId: string) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, name: true, sku: true, min_stock_qty: true },
  });
  if (!product || product.min_stock_qty === 0) return;

  const agg = await prisma.stockItem.aggregate({
    where:  { product_id: productId },
    _sum:   { qty_on_hand: true },
  });
  const total = Number(agg._sum.qty_on_hand ?? 0);

  if (total <= product.min_stock_qty) {
    await createNotification({
      type:  "LOW_STOCK",
      title: `สต็อกต่ำ: ${product.name}`,
      body:  `คงเหลือ ${total} ${total <= 0 ? "(หมดสต็อก)" : `— ต่ำกว่าเกณฑ์ ${product.min_stock_qty}`}`,
      link:  `/products/${productId}`,
    });
  }
}
