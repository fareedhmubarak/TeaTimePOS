# Supabase Setup Guide for Tea Time POS

## What You Need from Supabase

Your app requires the following from your Supabase project:

### 1. ✅ Supabase URL and Anon Key (Already Configured)
   - **URL**: `https://sycfmzaxktwdcxwiqbbw.supabase.co`
   - **Anon Key**: Already set in `supabaseClient.ts`
   
   > **Note**: If you need to update these, find them in your Supabase dashboard under **Settings > API**

### 2. 📊 Database Tables (Need to be Created)
   Your app needs these 7 tables:
   - `products` - Store product catalog
   - `expense_items` - Expense categories and templates
   - `expenses` - Daily/monthly expense records
   - `invoices` - Sales invoices
   - `invoice_items` - Individual items in each invoice
   - `purchase_entries` - Stock purchase records
   - `purchase_items` - Items within purchase entries

### 3. 🔧 Database Function
   - `get_public_tables()` - Used by the Database Management page

---

## Setup Steps

### Step 1: Open Supabase Dashboard
1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Log in and select your project (or create a new one)

### Step 2: Run the SQL Schema
1. In your Supabase dashboard, go to **SQL Editor** (left sidebar)
2. Click **New Query**
3. Open the file `supabase-schema.sql` from this project
4. Copy the entire contents and paste into the SQL Editor
5. Click **Run** (or press Ctrl+Enter)

This will create:
- All required tables with proper columns
- Indexes for performance
- Row Level Security (RLS) policies
- The `get_public_tables()` function
- All necessary permissions

### Step 3: Verify the Setup
After running the SQL, you can verify by:

1. Go to **Table Editor** in Supabase dashboard
2. You should see all 7 tables listed:
   - products
   - expense_items
   - expenses
   - invoices
   - invoice_items
   - purchase_entries
   - purchase_items

3. Test the function:
   - Go back to **SQL Editor**
   - Run: `SELECT * FROM get_public_tables();`
   - Should return all 7 table names

---

## Verification Checklist

After setup, verify:

- [ ] All 7 tables are visible in Table Editor
- [ ] `get_public_tables()` function exists and returns table names
- [ ] You can insert a test row in any table
- [ ] Your app URL matches: `https://sycfmzaxktwdcxwiqbbw.supabase.co`
- [ ] Your anon key is correctly set in `supabaseClient.ts`

---

## Testing the Connection

Once setup is complete:

1. Run your app: `npm run dev`
2. The app should connect to Supabase and load without errors
3. You should be able to:
   - Add products
   - Create invoices
   - Add expenses
   - View reports

---

## Troubleshooting

### Error: "relation does not exist"
- The tables weren't created. Run the SQL schema again.

### Error: "permission denied"
- RLS policies might not be set correctly. Check that the SQL script completed successfully.

### Error: "function does not exist"
- The `get_public_tables()` function wasn't created. Run the SQL schema again.

### App shows "Connection Error"
- Check that your Supabase URL and anon key are correct in `supabaseClient.ts`
- Verify your Supabase project is active (not paused)
- Check your internet connection

---

## Next Steps After Setup

1. **Add Initial Data** (Optional):
   - Add some products to get started
   - Create expense item categories
   
2. **Configure RLS Policies** (For Production):
   - The current setup allows all operations (for development)
   - For production, update RLS policies to require authentication

3. **Set Up Storage** (If needed for images):
   - If you plan to upload product images, set up Supabase Storage
   - Create a bucket for product images
   - Update storage policies

---

## Quick Reference: Table Structures

### products
- `id` (auto), `name`, `price`, `profit`, `category`, `image_url`

### expense_items
- `id` (auto), `name`, `category`, `allow_sub_items`, `sub_items`

### expenses
- `id` (auto), `description`, `amount`, `expense_date`

### invoices
- `id` (auto), `total_amount`, `total_profit`, `bill_date`

### invoice_items
- `id` (auto), `invoice_id`, `product_id`, `product_name`, `quantity`, `price_per_item`, `profit_per_item`

### purchase_entries
- `id` (auto), `entry_date`, `primary_description`, `total_cost`, `bill_image_url`

### purchase_items
- `id` (auto), `purchase_entry_id`, `name`, `quantity`, `cost`

---

**Need Help?** Check your Supabase project logs in the dashboard under **Logs > Postgres Logs** for any SQL errors.

