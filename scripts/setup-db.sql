-- Active Persona: [supabase-postgres-best-practices]
-- Active Skills: PostgreSQL Schema Design, RLS Security, Data Modeling

 - 1. Create Enums
CREATE TYPE user_role AS ENUM ('kitchen', 'cashier', 'pickup', 'admin');
CREATE TYPE order_status AS ENUM ('pending', 'preparing', 'ready', 'paid', 'completed', 'cancelled');

-- 2. Create Tables
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    role user_role NOT NULL,
    passcode TEXT NOT NULL
);

CREATE TABLE menus (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    price NUMERIC NOT NULL CHECK (price >= 0),
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE promos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    discount_percent NUMERIC NOT NULL CHECK (discount_percent >= 0 AND discount_percent <= 100),
    valid_days JSONB NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true
);
 
-- Using a sequence for short, readable order numbers
CREATE SEQUENCE order_number_seq START 1;

CREATE TABLE orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_number INTEGER NOT NULL DEFAULT nextval('order_number_seq'),
    subtotal NUMERIC NOT NULL DEFAULT 0,
    tax_amount NUMERIC NOT NULL DEFAULT 0,
    discount_amount NUMERIC NOT NULL DEFAULT 0,
    total_price NUMERIC NOT NULL DEFAULT 0,
    status order_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    menu_id UUID NOT NULL REFERENCES menus(id) ON DELETE RESTRICT,
    qty INTEGER NOT NULL CHECK (qty > 0),
    subtotal_price NUMERIC NOT NULL DEFAULT 0,
    is_checked BOOLEAN NOT NULL DEFAULT false
);

-- 3. Row Level Security (RLS)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE menus ENABLE ROW LEVEL SECURITY;
ALTER TABLE promos ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Security Policy: Read-only access for public/anon key on menus and promos
CREATE POLICY "Allow public read access on menus" ON menus FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access on promos" ON promos FOR SELECT TO anon, authenticated USING (true);

-- Security Policy: Passcode login mechanism means client acts as anon. 
-- For read operations in Kitchen/Cashier/Admin, they use anon key.
-- We allow SELECT on orders and order_items for realtime subscriptions.
CREATE POLICY "Allow public read access on orders" ON orders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Allow public read access on order_items" ON order_items FOR SELECT TO anon, authenticated USING (true);

-- Security Policy: Users table (protecting passcodes)
-- DO NOT expose passcodes to the client. The client will POST to a Next.js Server Action
-- which uses the Service Role key to verify the passcode.
CREATE POLICY "Deny public read access on users" ON users FOR SELECT TO anon, authenticated USING (false);

-- Note: All WRITE operations (INSERT, UPDATE) for orders/order_items will be done 
-- via Next.js Server Actions using the Supabase Service Role key (which bypasses RLS).
-- Therefore, we do not need to grant INSERT/UPDATE permissions to the anon role,
-- significantly reducing the attack surface.

-- 4. Dummy Data Injection
INSERT INTO menus (name, category, price, image_url) VALUES
('Big Mac', 'Burgers', 35000, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80'),
('McNuggets (6 pc)', 'Chicken', 25000, 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80'),
('French Fries (Large)', 'Sides', 18000, 'https://images.unsplash.com/photo-1576107232684-1279f390859f?auto=format&fit=crop&w=800&q=80'),
('Coca-Cola (Medium)', 'Beverages', 12000, 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=800&q=80'),
('McFlurry Oreo', 'Desserts', 15000, 'https://images.unsplash.com/photo-1559703248-dcaaec9fab78?auto=format&fit=crop&w=800&q=80');

INSERT INTO promos (name, discount_percent, valid_days) VALUES
('Weekend Special', 10, '["Saturday", "Sunday"]');

-- Setup Admin user for testing (Password checking will happen server-side)
INSERT INTO users (username, role, passcode) VALUES
('kitchen_master', 'kitchen', '111111'),
('cashier_front', 'cashier', '222222'),
('pickup_handover', 'pickup', '333333'),
('admin_boss', 'admin', '999999');

-- 5. Enable Realtime
-- Kitchen/Cashier/Admin subscribe to postgres_changes on these tables for live updates.
-- Without this, only the client-side polling fallback fires.
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;
ALTER PUBLICATION supabase_realtime ADD TABLE menus;
ALTER PUBLICATION supabase_realtime ADD TABLE promos;
