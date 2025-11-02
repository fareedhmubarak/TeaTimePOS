-- =================================================================================
-- Supabase Database Schema for Tea Time POS Application
-- =================================================================================
-- Instructions:
-- 1. Open your Supabase project dashboard
-- 2. Go to SQL Editor
-- 3. Paste and run this entire script
-- =================================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =================================================================================
-- TABLE: products
-- =================================================================================
CREATE TABLE IF NOT EXISTS products (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    price DECIMAL(10, 2) NOT NULL,
    profit DECIMAL(10, 2) NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================================================================================
-- TABLE: expense_items
-- =================================================================================
CREATE TABLE IF NOT EXISTS expense_items (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('Daily', 'Monthly')),
    allow_sub_items BOOLEAN DEFAULT FALSE,
    sub_items TEXT[] DEFAULT ARRAY[]::TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================================================================================
-- TABLE: expenses
-- =================================================================================
CREATE TABLE IF NOT EXISTS expenses (
    id BIGSERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    expense_date DATE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================================================================================
-- TABLE: invoices
-- =================================================================================
CREATE TABLE IF NOT EXISTS invoices (
    id BIGSERIAL PRIMARY KEY,
    total_amount DECIMAL(10, 2) NOT NULL,
    total_profit DECIMAL(10, 2) NOT NULL,
    bill_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================================================================================
-- TABLE: invoice_items
-- =================================================================================
CREATE TABLE IF NOT EXISTS invoice_items (
    id BIGSERIAL PRIMARY KEY,
    invoice_id BIGINT NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    product_id BIGINT REFERENCES products(id) ON DELETE SET NULL,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price_per_item DECIMAL(10, 2) NOT NULL,
    profit_per_item DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================================================================================
-- TABLE: purchase_entries
-- =================================================================================
CREATE TABLE IF NOT EXISTS purchase_entries (
    id BIGSERIAL PRIMARY KEY,
    entry_date DATE NOT NULL,
    primary_description TEXT NOT NULL,
    total_cost DECIMAL(10, 2) NOT NULL,
    bill_image_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================================================================================
-- TABLE: purchase_items
-- =================================================================================
CREATE TABLE IF NOT EXISTS purchase_items (
    id BIGSERIAL PRIMARY KEY,
    purchase_entry_id BIGINT NOT NULL REFERENCES purchase_entries(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    cost DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================================================================================
-- TABLE: categories
-- =================================================================================
CREATE TABLE IF NOT EXISTS categories (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default categories with initial order
INSERT INTO categories (name, display_order) VALUES
    ('COOLERS', 1),
    ('FLAVORED MILK', 2),
    ('MILKSHAKE', 3),
    ('MOJITOS', 4),
    ('SNACKS', 5),
    ('TEA', 6),
    ('WATER', 7)
ON CONFLICT (name) DO NOTHING;

-- =================================================================================
-- TABLE: printer_settings
-- =================================================================================
CREATE TABLE IF NOT EXISTS printer_settings (
    id BIGSERIAL PRIMARY KEY,
    save_button BOOLEAN DEFAULT FALSE,
    save_and_print_mode BOOLEAN DEFAULT TRUE,
    connection_type TEXT CHECK (connection_type IN ('USB', 'Bluetooth', 'Lan')) DEFAULT 'Bluetooth',
    paper_size TEXT CHECK (paper_size IN ('58mm', '72mm', '80mm')) DEFAULT '58mm',
    selected_bluetooth_printer JSONB,
    shop_name TEXT DEFAULT 'Tea Time Kuppam',
    contact_number TEXT,
    fssai_no TEXT,
    gst TEXT,
    footer TEXT,
    shop_address TEXT DEFAULT 'Palace Road Kuppam',
    bank_details TEXT,
    footer_note TEXT,
    print_options JSONB DEFAULT '{}'::jsonb,
    print_logo BOOLEAN DEFAULT FALSE,
    print_qr BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =================================================================================
-- INDEXES for better query performance
-- =================================================================================
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product_id ON invoice_items(product_id);
CREATE INDEX IF NOT EXISTS idx_purchase_items_purchase_entry_id ON purchase_items(purchase_entry_id);
CREATE INDEX IF NOT EXISTS idx_invoices_bill_date ON invoices(bill_date);
CREATE INDEX IF NOT EXISTS idx_expenses_expense_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_purchase_entries_entry_date ON purchase_entries(entry_date);

-- =================================================================================
-- RPC FUNCTION: get_public_tables
-- Used by Database Management Page to list all tables
-- =================================================================================
CREATE OR REPLACE FUNCTION get_public_tables()
RETURNS TABLE(table_name TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT t.table_name::TEXT
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_type = 'BASE TABLE'
    ORDER BY t.table_name;
END;
$$;

-- =================================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =================================================================================
-- For development, you can enable RLS but allow all operations
-- For production, you should create proper authentication policies

-- Enable RLS on all tables
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE expense_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE printer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated and anonymous users (for development)
-- NOTE: For production, replace these with proper authentication-based policies

-- Products policies
CREATE POLICY "Allow all operations on products" ON products
    FOR ALL USING (true) WITH CHECK (true);

-- Expense items policies
CREATE POLICY "Allow all operations on expense_items" ON expense_items
    FOR ALL USING (true) WITH CHECK (true);

-- Expenses policies
CREATE POLICY "Allow all operations on expenses" ON expenses
    FOR ALL USING (true) WITH CHECK (true);

-- Invoices policies
CREATE POLICY "Allow all operations on invoices" ON invoices
    FOR ALL USING (true) WITH CHECK (true);

-- Invoice items policies
CREATE POLICY "Allow all operations on invoice_items" ON invoice_items
    FOR ALL USING (true) WITH CHECK (true);

-- Purchase entries policies
CREATE POLICY "Allow all operations on purchase_entries" ON purchase_entries
    FOR ALL USING (true) WITH CHECK (true);

-- Purchase items policies
CREATE POLICY "Allow all operations on purchase_items" ON purchase_items
    FOR ALL USING (true) WITH CHECK (true);

-- Printer settings policies
CREATE POLICY "Allow all operations on printer_settings" ON printer_settings
    FOR ALL USING (true) WITH CHECK (true);

-- Categories policies
CREATE POLICY "Allow all operations on categories" ON categories
    FOR ALL USING (true) WITH CHECK (true);

-- =================================================================================
-- GRANT PERMISSIONS (Ensure anon and authenticated roles can access)
-- =================================================================================
GRANT ALL ON products TO anon, authenticated;
GRANT ALL ON expense_items TO anon, authenticated;
GRANT ALL ON expenses TO anon, authenticated;
GRANT ALL ON invoices TO anon, authenticated;
GRANT ALL ON invoice_items TO anon, authenticated;
GRANT ALL ON purchase_entries TO anon, authenticated;
GRANT ALL ON purchase_items TO anon, authenticated;
GRANT ALL ON printer_settings TO anon, authenticated;
GRANT ALL ON categories TO anon, authenticated;

-- Grant sequence permissions (for auto-incrementing IDs)
GRANT USAGE, SELECT ON SEQUENCE products_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE expense_items_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE expenses_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE invoices_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE invoice_items_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE purchase_entries_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE purchase_items_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE printer_settings_id_seq TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE categories_id_seq TO anon, authenticated;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION get_public_tables() TO anon, authenticated;

-- =================================================================================
-- VERIFICATION QUERIES (Optional - run these to verify setup)
-- =================================================================================
-- SELECT * FROM products;
-- SELECT * FROM expense_items;
-- SELECT * FROM expenses;
-- SELECT * FROM invoices;
-- SELECT * FROM invoice_items;
-- SELECT * FROM purchase_entries;
-- SELECT * FROM purchase_items;
-- SELECT * FROM get_public_tables();

