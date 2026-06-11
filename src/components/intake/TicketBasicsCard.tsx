"use client";

import useSWR from "swr";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Customer = { id: string; name: string; code: string };
type Product  = { id: string; name: string; sku: string };
type Order    = { id: string; order_number: string };

type Props = {
  title: string;
  customerId: string;
  productId:  string;
  orderId:    string;
  onCustomerChange: (v: string) => void;
  onProductChange:  (v: string) => void;
  onOrderChange:    (v: string) => void;
  /** rendered as the 4th cell — e.g. S/N input, reason dropdown */
  extraField?: React.ReactNode;
};

export function TicketBasicsCard({
  title, customerId, productId, orderId,
  onCustomerChange, onProductChange, onOrderChange,
  extraField,
}: Props) {
  const { data: customersData } = useSWR("/api/customers", fetcher);
  const { data: productsRes }   = useSWR<{ products: Product[] }>("/api/products?limit=200", fetcher);
  const { data: ordersData }    = useSWR("/api/orders", fetcher);

  const customers: Customer[] = Array.isArray(customersData) ? customersData : [];
  const products:  Product[]  = productsRes?.products ?? [];
  const orders:    Order[]    = Array.isArray(ordersData) ? ordersData : [];

  return (
    <Card>
      <CardHeader><CardTitle className="text-sm">{title}</CardTitle></CardHeader>
      <CardContent className="grid grid-cols-2 gap-3">
        <Select label="ลูกค้า" value={customerId} onChange={onCustomerChange}
          options={customers.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))} />
        <Select label="สินค้า" value={productId} onChange={onProductChange}
          options={products.map((p) => ({ value: p.id, label: `${p.name} (${p.sku})` }))} />
        <Select label="คำสั่งซื้ออ้างอิง" value={orderId} onChange={onOrderChange}
          options={orders.map((o) => ({ value: o.id, label: o.order_number }))} />
        {extraField}
      </CardContent>
    </Card>
  );
}

function Select({
  label, value, onChange, options,
}: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs">{label}</Label>
      <select
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-600/50"
        value={value} onChange={(e) => onChange(e.target.value)}
      >
        <option value="">-- ไม่ระบุ --</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}
