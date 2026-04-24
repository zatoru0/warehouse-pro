import { prisma } from "@/lib/prisma";
import { NotificationType, UserRole } from "@prisma/client";

export async function checkLowStock(productId: string) {
  const rule = await prisma.stockAlertRule.findUnique({
    where: { product_id: productId, is_active: true },
    include: { product: true },
  });
  if (!rule) return;

  const totalStock = await prisma.stockItem.aggregate({
    where: { product_id: productId },
    _sum: { qty_on_hand: true },
  });

  const qty = Number(totalStock._sum.qty_on_hand ?? 0);
  if (qty > rule.min_qty) return;

  const roles = rule.notify_roles as UserRole[];
  const users = await prisma.user.findMany({
    where: { role: { in: roles }, is_active: true },
    select: { id: true },
  });

  await prisma.notification.createMany({
    data: users.map((u) => ({
      user_id: u.id,
      type: NotificationType.LOW_STOCK,
      title: `Low Stock: ${rule.product.name}`,
      message: `Stock for ${rule.product.sku} has dropped to ${qty} ${rule.product.unit} (minimum: ${rule.min_qty})`,
      reference_type: "product",
      reference_id: productId,
    })),
  });
}

export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  referenceType?: string,
  referenceId?: string
) {
  return prisma.notification.create({
    data: { user_id: userId, type, title, message, reference_type: referenceType, reference_id: referenceId },
  });
}
