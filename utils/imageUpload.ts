import { supabase } from '../supabaseClient.ts';

/**
 * Uploads an image to Supabase Storage and returns the public URL
 * @param imageData - Base64 data URL or File object
 * @param productId - Product ID for naming (optional, for updates)
 * @returns Public URL of the uploaded image, or null if upload fails
 */
export async function uploadProductImage(
  imageData: string | File,
  productId?: number
): Promise<string | null> {
  try {
    // Check if storage bucket exists, create if not
    const bucketName = 'product-images';
    
    // Determine file type and convert to File if needed
    let file: File;
    let fileName: string;
    
    if (typeof imageData === 'string') {
      // It's a base64 data URL
      if (!imageData.startsWith('data:')) {
        // Already a URL, return as-is
        return imageData;
      }
      
      // Convert base64 to blob
      const base64Data = imageData.split(',')[1];
      const mimeType = imageData.match(/data:([^;]+);/)?.[1] || 'image/jpeg';
      const extension = mimeType.split('/')[1] || 'jpg';
      
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: mimeType });
      
      // Generate unique filename
      const timestamp = Date.now();
      fileName = productId 
        ? `product-${productId}-${timestamp}.${extension}`
        : `product-${timestamp}.${extension}`;
      
      file = new File([blob], fileName, { type: mimeType });
    } else {
      // It's already a File object
      file = imageData;
      const extension = file.name.split('.').pop() || 'jpg';
      const timestamp = Date.now();
      fileName = productId 
        ? `product-${productId}-${timestamp}.${extension}`
        : `product-${timestamp}.${extension}`;
    }
    
    // Check if bucket exists
    const { data: buckets, error: bucketError } = await supabase.storage.listBuckets();
    
    if (bucketError) {
      console.error('Error checking buckets:', bucketError);
      // Fall back to storing base64 if bucket check fails
      if (typeof imageData === 'string') {
        return imageData;
      }
      return null;
    }
    
    const bucketExists = buckets?.some(b => b.name === bucketName) || false;
    
    if (!bucketExists) {
      // Try to create bucket if it doesn't exist
      // Note: This may fail if anon key doesn't have permission
      const { error: createError } = await supabase.storage.createBucket(bucketName, {
        public: true,
        allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
        fileSizeLimit: 10485760 // 10MB
      });
      
      if (createError) {
        console.error('Error creating bucket:', createError);
        // If bucket creation fails, fall back to storing base64 (with warning)
        console.warn('Storage bucket does not exist. Please create "product-images" bucket in Supabase Storage. Falling back to base64 storage.');
        if (typeof imageData === 'string') {
          return imageData;
        }
        return null;
      }
    }
    
    // Upload file to storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error('[imageUpload] Error uploading image:', uploadError);
      console.error('[imageUpload] Upload error details:', {
        message: uploadError.message,
        statusCode: uploadError.statusCode,
        error: uploadError.error
      });
      
      // If upload fails due to file already existing, try with upsert
      if (uploadError.message?.includes('already exists') || uploadError.statusCode === '409') {
        console.log('[imageUpload] File exists, trying upsert...');
        const { data: upsertData, error: upsertError } = await supabase.storage
          .from(bucketName)
          .upload(fileName, file, {
            cacheControl: '3600',
            upsert: true // Overwrite existing file
          });
          
        if (upsertError) {
          console.error('[imageUpload] Upsert also failed:', upsertError);
          // Fall back to base64 if upload fails
          if (typeof imageData === 'string') {
            return imageData;
          }
          return null;
        }
        
        // Get public URL for upserted file
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(upsertData.path);
        
        console.log('[imageUpload] Successfully upserted image:', urlData.publicUrl);
        return urlData.publicUrl;
      }
      
      // Fall back to base64 if upload fails
      if (typeof imageData === 'string') {
        console.warn('[imageUpload] Upload failed, returning base64 as fallback');
        return imageData;
      }
      return null;
    }
    
    // Get public URL
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(uploadData.path);
    
    console.log('[imageUpload] Successfully uploaded image:', urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error('Error in uploadProductImage:', error);
    // Fall back to base64 if it's a string
    if (typeof imageData === 'string') {
      return imageData;
    }
    return null;
  }
}

/**
 * Deletes an image from Supabase Storage
 * @param imageUrl - Public URL of the image to delete
 */
export async function deleteProductImage(imageUrl: string): Promise<void> {
  try {
    // Only delete if it's a storage URL
    if (!imageUrl.includes('/storage/v1/object/public/')) {
      return; // Not a storage URL, skip deletion
    }
    
    // Extract path from URL
    const urlParts = imageUrl.split('/storage/v1/object/public/');
    if (urlParts.length < 2) return;
    
    const pathParts = urlParts[1].split('/');
    const bucketName = pathParts[0];
    const fileName = pathParts.slice(1).join('/');
    
    await supabase.storage.from(bucketName).remove([fileName]);
  } catch (error) {
    console.error('Error deleting image:', error);
    // Don't throw - deletion failure shouldn't block the main operation
  }
}

