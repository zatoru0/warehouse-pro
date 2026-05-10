import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Tag, Truck, UserCircle } from "lucide-react";

const sections = [
  {
    href:  "/settings/users",
    icon:  Users,
    title: "จัดการผู้ใช้",
    desc:  "เชิญผู้ใช้และจัดการสิทธิ์การเข้าถึง",
  },
  {
    href:  "/settings/categories",
    icon:  Tag,
    title: "หมวดหมู่สินค้า",
    desc:  "เพิ่ม แก้ไข และจัดการหมวดหมู่สินค้า",
  },
  {
    href:  "/settings/suppliers",
    icon:  Truck,
    title: "ผู้จัดหา (Supplier)",
    desc:  "จัดการข้อมูลผู้จัดหาสินค้าและวัตถุดิบ",
  },
  {
    href:  "/settings/customers",
    icon:  UserCircle,
    title: "ลูกค้า (Customer)",
    desc:  "จัดการข้อมูลลูกค้าและช่องทางการติดต่อ",
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">ตั้งค่าระบบ</h2>
      <div className="grid grid-cols-2 gap-4">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="cursor-pointer hover:border-red-600/50 transition-colors">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-600/10">
                  <s.icon className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-semibold">{s.title}</p>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
