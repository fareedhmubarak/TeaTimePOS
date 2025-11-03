# Image Upload Fix - Product Images

## Problem
Product images uploaded from local files (or camera) were stored as base64 data URLs directly in the database `image_url` TEXT field. This caused several issues:

1. **Database Limitations**: Large base64 strings can exceed database TEXT field limits or cause performance issues
2. **Data Loss**: Images appeared to save but were lost when navigating between screens
3. **Storage Inefficiency**: Base64 encoding increases file size by ~33%

## Solution
Images are now uploaded to **Supabase Storage** instead of being stored directly in the database. The database only stores the public URL of the image.

### Changes Made

1. **Created `utils/imageUpload.ts`**:
   - `uploadProductImage()`: Uploads images to Supabase Storage bucket `product-images`
   - `deleteProductImage()`: Deletes images from storage when products are updated/deleted
   - Automatically creates the storage bucket if it doesn't exist
   - Falls back to base64 storage if storage upload fails

2. **Updated `components/ProductModal.tsx`**:
   - Added image upload functionality before saving products
   - Shows "Uploading..." status during upload
   - Handles upload errors gracefully

3. **Updated `App.tsx`**:
   - `handleUpdateProduct()`: Deletes old image from storage when replacing with new one
   - `handleDeleteProduct()`: Deletes image from storage when product is deleted

## Setup Instructions

### 1. Create Supabase Storage Bucket (Required)

The code will try to create the bucket automatically, but it may fail due to permissions. You should create it manually:

1. Go to your Supabase Dashboard: https://app.supabase.com
2. Select your project
3. Go to **Storage** in the left sidebar
4. Click **New bucket**
5. Name: `product-images`
6. **Public bucket**: ✅ Check this (images need to be publicly accessible)
7. Click **Create bucket**

### 2. Set Storage Policies (Required)

After creating the bucket, you need to set policies to allow uploads:

1. Click on the `product-images` bucket
2. Go to **Policies** tab
3. Click **New Policy**
4. Choose **For full customization**
5. Policy name: `Allow public uploads`
6. Allowed operation: `INSERT`
7. Policy definition:
   ```sql
   true
   ```
8. Click **Review** then **Save policy**

Repeat for `SELECT` (to allow public reads) - though this should work automatically for public buckets.

### 3. Verify Setup

1. Start your app: `npm run dev`
2. Go to Admin → Products
3. Edit a product (e.g., "Kashmiri tea")
4. Upload a new image
5. Save the product
6. Navigate back to POS screen
7. **The image should now persist!**

## How It Works

1. **Upload Flow**:
   - User selects image file or takes photo
   - Image is converted to base64 for preview
   - On save, image is uploaded to Supabase Storage
   - Public URL is stored in database `image_url` field

2. **Display Flow**:
   - ProductCard reads `imageUrl` from product
   - Displays image using `<img src={product.imageUrl}>`
   - Works with both storage URLs and regular URLs

3. **Update Flow**:
   - If image changed, old image is deleted from storage
   - New image is uploaded
   - Database is updated with new URL

4. **Delete Flow**:
   - Product deletion triggers image deletion from storage
   - Prevents orphaned images

## Fallback Behavior

If Supabase Storage is not available or upload fails:
- Images are stored as base64 data URLs (original behavior)
- A warning is logged to console
- App continues to function normally

## Troubleshooting

### Images still not saving?
1. Check browser console for errors
2. Verify storage bucket exists: `product-images`
3. Verify bucket is public
4. Check storage policies allow INSERT

### "Failed to upload image" error?
- Check Supabase Storage bucket permissions
- Verify bucket name is exactly `product-images`
- Check file size (max 10MB)
- Check network connection

### Images show but disappear after refresh?
- Check if image URL is being saved in database
- Verify storage bucket is public
- Check browser console for CORS errors

## Testing Checklist

- [ ] Upload image for new product → Should save and display
- [ ] Edit product, change image → Old image deleted, new one shown
- [ ] Edit product, keep same image → No duplicate uploads
- [ ] Delete product → Image deleted from storage
- [ ] Navigate POS → Admin → POS → Images persist
- [ ] Refresh page → Images still visible

