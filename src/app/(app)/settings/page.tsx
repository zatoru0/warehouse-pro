import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Users, Bell, Truck, Building2 } from "lucide-react";

const sections = [
  { href: "/settings/users", icon: Users, title: "User Management", desc: "Invite users and manage roles" },
  { href: "/settings/alert-rules", icon: Bell, title: "Stock Alert Rules", desc: "Set low-stock thresholds per product" },
  { href: "/settings/carriers", icon: Truck, title: "Carriers", desc: "Manage shipping carrier / courier list" },
];

export default function SettingsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Settings</h2>
      <div className="grid grid-cols-2 gap-4">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="cursor-pointer hover:border-amber-500/50 transition-colors">
              <CardContent className="flex items-start gap-4 p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                  <s.icon className="h-5 w-5 text-amber-400" />
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
