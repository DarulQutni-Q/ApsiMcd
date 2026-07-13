# Everforest Drive-Thru (ApsiMcd)

A self-service drive-thru point-of-sale built with Next.js. One app runs four role-based stations that share the same order data:

- **Kiosk** (`/kiosk`) — customers browse the menu, customize items, and place orders.
- **Kitchen** (`/kitchen`) — live order queue with a per-item checklist and "out of stock" marking.
- **Cashier** (`/cashier`) — process payments (Cash, Card, QRIS, Transfer), calculate change, cancel orders, print receipts.
- **Admin** (`/admin`) — sales analytics and menu management (create/edit/deactivate items).

A landing page (`/`) links to all four stations (shortcuts `1`–`4`). Each station is protected by a passcode dialog. Business rules are Jakarta-local: WIB time, 10% tax, and an automatic weekend promo.

## Tech Stack

Next.js 16 (App Router) · React 18 · TypeScript (strict) · Tailwind CSS + shadcn-style (Base UI) · Zustand · Supabase (Postgres + Realtime + RLS) · Recharts · Playwright.

## Project Structure

```
app/                  Station pages (/, /kiosk, /kitchen, /cashier, /admin),
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

Then run `scripts/setup-db.sql` against your Supabase project to create the schema, RLS policies, and demo data. Demo passcodes: kitchen `111111`, cashier `222222`, admin `999999` (dev only).
