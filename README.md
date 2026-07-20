# Everforest Drive-Thru (ApsiMcd)

A self-service drive-thru point-of-sale built with Next.js. One app runs five role-based stations that share the same order data:

- **Kiosk** (`/kiosk`) — customers browse the menu, customize items, and place orders.
- **Kitchen** (`/kitchen`) — live order queue with a per-item checklist and "out of stock" marking.
- **Payment** (`/payment`) — process payments (Cash, Card, QRIS, Transfer), calculate change, cancel orders, print receipts. Marks an order `paid` while the kitchen is still preparing.
- **Pickup** (`/pickup`) — shows only `paid` orders with a "Lunas / Paid" banner; staff hand over via "Sudah Diambil", which completes the order.
- **Admin** (`/admin`) — sales analytics and menu management (create/edit/deactivate items).

A landing page (`/`) links to all five stations (shortcuts `1`–`5`). Each station is protected by a passcode dialog. Business rules are Jakarta-local: WIB time, 10% tax, and an automatic weekend promo.

Order lifecycle: `pending → preparing → ready → paid → completed` (plus `cancelled`).

## Tech Stack

Next.js 16 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS + shadcn-style (Base UI) · Zustand · Supabase (Postgres + Realtime + RLS) · Recharts · Playwright.

## Project Structure

```
app/                  Station pages (/, /kiosk, /kitchen, /payment, /pickup, /admin),
                       API route handlers, and Server Actions (checkout)
components/           Shared UI + shadcn ui/ + PasscodeDialog
lib/                  Zustand stores, Supabase clients, offline localdb
scripts/setup-db.sql Schema, RLS policies, seed + demo data, realtime setup
tests/                Playwright e2e + realtime specs
types/                Shared domain types
data/db.json          Offline fallback database
public/images/        Menu product images
```

## Getting Started

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. The app runs immediately in **offline mode** (a local `data/db.json` store, no database needed). To enable the database-backed mode with realtime and persistence, set these in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

Then run `scripts/setup-db.sql` against your Supabase project to create the schema, RLS policies, and demo data. Demo passcodes: kitchen `111111`, cashier `222222`, pickup `333333`, admin `999999` (dev only).
