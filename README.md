# WareHouse Pro — Management System

A full-stack Warehouse Management System (ระบบคลัง) built with Next.js 14, Prisma, PostgreSQL (Supabase), and TypeScript.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 App Router + TypeScript |
| Database | PostgreSQL via Supabase |
| ORM | Prisma |
| Auth | Supabase Auth |
| UI | Tailwind CSS + shadcn/ui |
| Forms | React Hook Form + Zod |
| Data Fetching | TanStack Query |
| Charts | Recharts |
| Barcodes | react-barcode |
| Notifications | Sonner |
| Deployment | Vercel |

## Setup

### 1. Supabase Project
Create a project at supabase.com. Get your credentials from Project Settings.

### 2. Configure .env
```
DATABASE_URL="postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
DIRECT_URL="postgresql://postgres.[REF]:[PASS]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres"
NEXT_PUBLIC_SUPABASE_URL="https://[REF].supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="[ANON KEY]"
SUPABASE_SERVICE_ROLE_KEY="[SERVICE ROLE KEY]"
```

### 3. Push Schema + Seed
```bash
npm run db:push    # Apply Prisma schema to Supabase
npm run db:seed    # Seed warehouses, products, carriers
```

### 4. Create Admin User
In Supabase Dashboard → Authentication → Users → Invite user, then in SQL Editor:
```sql
UPDATE users SET role = 'SUPERADMIN' WHERE email = 'your@email.com';
```

### 5. Run
```bash
npm run dev
```

## User Roles
SUPERADMIN | ADMIN | RECEIVING | PRODUCTION | QC | WAREHOUSE | SHIPPING | AFTER_SALES | READONLY

## Modules
- Dashboard, Inventory, Products, Lots/Batches
- Receiving (New Goods / Claim / Repair / Parts / Return)
- QC (inspection queue, pass/fail, certificates)
- Production (Assembly / Disassembly / Repair + BOM)
- Orders (Shopee, Lazada, TikTok, Line, Facebook, Walk-in, Claim, Exchange)
- Shipping (pack, label, dispatch)
- Warehouses → Zones → Bins (3-layer)
- Customers, Suppliers, Reports, Notifications, Settings
