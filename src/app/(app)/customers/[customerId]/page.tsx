import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  User, Phone, Mail, MapPin, MessageCircle,
  ShoppingBag, Headphones, RefreshCcw, FileMinus, FileText,
} from "lucide-react";
import { format } from "date-fns";

async function getCustomer(id: string) {
  return prisma.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { created_at: "desc" },
        take: 50,
        include: { _count: { select: { lines: true } } },
      },
      service_tickets: {
        orderBy: { created_at: "desc" },
        take: 50,
        include: { product: { select: { name: true, sku: true } } },
      },
      exchange_jobs: {
        orderBy: { created_at: "desc" },
        take: 50,
        include: {
          new_product: { select: { name: true, sku: true } },
          old_product: { select: { name: true, sku: true } },
        },
      },
      credit_notes: {
        orderBy: { created_at: "desc" },
        take: 50,
      },
      invoices: {
        orderBy: { created_at: "desc" },
        take: 50,
      },
    },
  });
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING:   "bg-amber-500/10 text-amber-600",
  CONFIRMED: "bg-blue-500/10 text-blue-600",
  PICKING:   "bg-blue-500/10 text-blue-600",
  PACKING:   "bg-blue-500/10 text-blue-600",
  SHIPPED:   "bg-cyan-500/10 text-cyan-600",
  DELIVERED: "bg-green-500/10 text-green-600",
  CANCELLED: "bg-muted text-muted-foreground",
  RETURNED:  "bg-red-500/10 text-red-600",
};

const TICKET_STATUS_COLORS: Record<string, string> = {
  OPEN:      "bg-red-500/10 text-red-600",
  IN_REVIEW: "bg-amber-500/10 text-amber-600",
  CLOSED:    "bg-green-500/10 text-green-600",
  CANCELLED: "bg-muted text-muted-foreground",
};

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ customerId: string }>;
}) {
  const { customerId } = await params;
  const customer = await getCustomer(customerId);
  if (!customer) notFound();

  const totalSpent = customer.orders.reduce((s, o) => s + Number(o.total_amount ?? 0), 0);
  const openTickets = customer.service_tickets.filter((t) => t.status === "OPEN" || t.status === "IN_REVIEW").length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-600/10">
          <User className="h-8 w-8 text-red-600" />
        </div>
        <div className="flex-1">
          <h2 className="text-xl font-semibold">{customer.name}</h2>
          <p className="font-mono text-xs text-muted-foreground">{customer.code}</p>
          {customer.name_th && <p className="mt-0.5 text-sm text-muted-foreground">{customer.name_th}</p>}
        </div>
      </div>

      {/* Summary + Contact */}
      <div className="grid gap-3 md:grid-cols-4">
        <StatCard icon={<ShoppingBag className="h-4 w-4 text-blue-500" />} label="คำสั่งซื้อ" value={customer.orders.length} />
        <StatCard icon={<Headphones className="h-4 w-4 text-pink-500" />} label="เคสบริการ" value={customer.service_tickets.length} sub={openTickets > 0 ? `${openTickets} เปิดอยู่` : undefined} />
        <StatCard icon={<RefreshCcw className="h-4 w-4 text-purple-500" />} label="แลกเครื่อง" value={customer.exchange_jobs.length} />
        <StatCard icon={<FileMinus className="h-4 w-4 text-amber-500" />} label="ใบลดหนี้" value={customer.credit_notes.length} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-sm">ข้อมูลติดต่อ</CardTitle></CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-2">
          <ContactItem icon={<Phone className="h-4 w-4" />} label="เบอร์โทร" value={customer.phone} />
          <ContactItem icon={<Mail className="h-4 w-4" />} label="อีเมล" value={customer.email} />
          <ContactItem icon={<MessageCircle className="h-4 w-4" />} label="Line ID" value={customer.line_id} />
          <ContactItem icon={<MapPin className="h-4 w-4" />} label="ที่อยู่" value={customer.address} />
        </CardContent>
      </Card>

      {totalSpent > 0 && (
        <div className="rounded-lg border border-border bg-card px-4 py-3 text-sm">
          <span className="text-muted-foreground">ยอดซื้อรวม:</span>{" "}
          <span className="text-base font-semibold">฿{totalSpent.toLocaleString()}</span>
        </div>
      )}

      {/* Orders */}
      <Section title="คำสั่งซื้อ" icon={<ShoppingBag className="h-4 w-4" />} count={customer.orders.length}>
        {customer.orders.length === 0 ? (
          <Empty text="ยังไม่มีคำสั่งซื้อ" />
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">เลข</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">ช่องทาง</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">รายการ</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">มูลค่า</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">วันที่</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">สถานะ</th>
            </tr></thead>
            <tbody>
              {customer.orders.map((o) => (
                <tr key={o.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2">
                    <Link href={`/orders/${o.id}`} className="font-mono text-xs text-red-600 hover:underline">{o.order_number}</Link>
                  </td>
                  <td className="px-4 py-2 text-xs">{o.channel}</td>
                  <td className="px-4 py-2 text-right text-xs">{o._count.lines}</td>
                  <td className="px-4 py-2 text-right text-xs font-medium">
                    {o.total_amount ? `฿${Number(o.total_amount).toLocaleString()}` : "—"}
                  </td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {format(new Date(o.ordered_at), "dd MMM yyyy")}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ORDER_STATUS_COLORS[o.status]}`}>
                      {o.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Service tickets */}
      <Section title="เคสบริการ / เคลม / คืน" icon={<Headphones className="h-4 w-4" />} count={customer.service_tickets.length}>
        {customer.service_tickets.length === 0 ? (
          <Empty text="ยังไม่มีเคสบริการ" />
        ) : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">เลข</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">สินค้า</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">อาการ</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">วันที่</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">สถานะ</th>
            </tr></thead>
            <tbody>
              {customer.service_tickets.map((t) => (
                <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-2">
                    <Link href={`/service-tickets/${t.id}`} className="font-mono text-xs text-red-600 hover:underline">{t.ticket_number}</Link>
                  </td>
                  <td className="px-4 py-2 text-xs">{t.product?.name ?? "—"}</td>
                  <td className="px-4 py-2 text-xs max-w-md truncate">{t.issue_desc}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">
                    {format(new Date(t.created_at), "dd MMM yyyy")}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${TICKET_STATUS_COLORS[t.status]}`}>
                      {t.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Exchange jobs */}
      {customer.exchange_jobs.length > 0 && (
        <Section title="แลกเปลี่ยนเครื่อง" icon={<RefreshCcw className="h-4 w-4" />} count={customer.exchange_jobs.length}>
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">เลข</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">รับเก่า</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">ให้ใหม่</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">วันที่</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">สถานะ</th>
            </tr></thead>
            <tbody>
              {customer.exchange_jobs.map((ex) => (
                <tr key={ex.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-2">
                    <Link href={`/exchange`} className="font-mono text-xs text-red-600 hover:underline">{ex.job_number}</Link>
                  </td>
                  <td className="px-4 py-2 text-xs">{ex.old_product.name}</td>
                  <td className="px-4 py-2 text-xs">{ex.new_product.name}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{format(new Date(ex.created_at), "dd MMM yyyy")}</td>
                  <td className="px-4 py-2 text-xs">{ex.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      {/* Credit Notes */}
      {customer.credit_notes.length > 0 && (
        <Section title="ใบลดหนี้" icon={<FileMinus className="h-4 w-4" />} count={customer.credit_notes.length}>
          <DocumentTable docs={customer.credit_notes.map((c) => ({
            id: c.id,
            number: c.cn_number,
            href: `/credit-notes/${c.id}`,
            reason: c.reason,
            amount: Number(c.total_amount),
            date: c.created_at,
            status: c.status,
          }))} />
        </Section>
      )}

      {/* Invoices */}
      {customer.invoices.length > 0 && (
        <Section title="ใบแจ้งหนี้" icon={<FileText className="h-4 w-4" />} count={customer.invoices.length}>
          <DocumentTable docs={customer.invoices.map((i) => ({
            id: i.id,
            number: i.invoice_number,
            href: `/invoices/${i.id}`,
            reason: i.reason,
            amount: Number(i.total_amount),
            date: i.created_at,
            status: i.status,
          }))} />
        </Section>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: number; sub?: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="mt-0.5 text-2xl font-bold">{value}</p>
          {sub && <p className="text-[10px] text-red-600">{sub}</p>}
        </div>
        <div className="rounded-full bg-muted p-2">{icon}</div>
      </CardContent>
    </Card>
  );
}

function ContactItem({ icon, label, value }: {
  icon: React.ReactNode; label: string; value: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 text-muted-foreground">{icon}</div>
      <div>
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-sm">{value}</p>
      </div>
    </div>
  );
}

function Section({ title, icon, count, children }: {
  title: string; icon: React.ReactNode; count: number; children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {icon}
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{count}</span>
      </div>
      <Card><CardContent className="p-0">{children}</CardContent></Card>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="py-8 text-center text-xs text-muted-foreground">{text}</p>;
}

function DocumentTable({ docs }: {
  docs: { id: string; number: string; href: string; reason: string; amount: number; date: Date; status: string }[];
}) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="border-b border-border bg-muted/50">
        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">เลข</th>
        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">เหตุผล</th>
        <th className="px-4 py-2 text-right text-xs font-medium text-muted-foreground">มูลค่า</th>
        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">วันที่</th>
        <th className="px-4 py-2 text-left text-xs font-medium text-muted-foreground">สถานะ</th>
      </tr></thead>
      <tbody>
        {docs.map((d) => (
          <tr key={d.id} className="border-b border-border last:border-0">
            <td className="px-4 py-2">
              <Link href={d.href} className="font-mono text-xs text-red-600 hover:underline">{d.number}</Link>
            </td>
            <td className="px-4 py-2 text-xs">{d.reason}</td>
            <td className="px-4 py-2 text-right text-xs font-medium">฿{d.amount.toLocaleString()}</td>
            <td className="px-4 py-2 text-xs text-muted-foreground">{format(new Date(d.date), "dd MMM yyyy")}</td>
            <td className="px-4 py-2 text-xs">{d.status}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
