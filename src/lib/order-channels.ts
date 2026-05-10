import { OrderChannel } from "@prisma/client";

export const ORDER_CHANNELS: { value: OrderChannel; label: string; icon: string; group: "online" | "offline" }[] = [
  { value: "WALK_IN",  label: "หน้าร้าน",      icon: "🏪", group: "offline" },
  { value: "LINE",     label: "Line",          icon: "💬", group: "online"  },
  { value: "SHOPEE",   label: "Shopee",        icon: "🛍️", group: "online"  },
  { value: "LAZADA",   label: "Lazada",        icon: "📦", group: "online"  },
  { value: "TIKTOK",   label: "TikTok",        icon: "🎵", group: "online"  },
  { value: "FACEBOOK", label: "Facebook",      icon: "📘", group: "online"  },
  { value: "CLAIM",    label: "เคลม",          icon: "🛡️", group: "offline" },
  { value: "EXCHANGE", label: "เปลี่ยนเครื่อง", icon: "🔄", group: "offline" },
  { value: "BORROW",   label: "ยืม",           icon: "🤝", group: "offline" },
];

export const ORDER_CHANNEL_LABEL: Record<string, string> = Object.fromEntries(
  ORDER_CHANNELS.map((c) => [c.value, c.label])
);

export const ORDER_CHANNEL_ICON: Record<string, string> = Object.fromEntries(
  ORDER_CHANNELS.map((c) => [c.value, c.icon])
);
