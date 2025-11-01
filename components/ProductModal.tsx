import React, { useState, useEffect, useMemo } from 'react';
import { Product } from '../types.ts';
import { CATEGORIES } from '../constants.ts';
import { XIcon } from './Icons.tsx';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Omit<Product, 'id'>, id?: number) => void;
  productToEdit: Product | null;
  products?: Product[]; // Optional: to extract existing categories
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, productToEdit, products = [] }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [profit, setProfit] = useState('');
  const [category, setCategory] = useState(CATEGORIES.find(c => c !== 'FREQUENT') || 'TEA');
  const [isNewCategory, setIsNewCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageMethod, setImageMethod] = useState<'url' | 'upload' | 'camera'>('url');
  const [previewImage, setPreviewImage] = useState<string>('');

  // Get all unique categories from existing products + default categories
  const allCategories = useMemo(() => {
    const defaultCats = CATEGORIES.filter(c => c !== 'FREQUENT');
    const productCats = products.map(p => p.category).filter((cat, index, self) => 
      cat && cat !== 'FREQUENT' && self.indexOf(cat) === index
    );
    const uniqueCats = Array.from(new Set([...defaultCats, ...productCats])).sort();
    return uniqueCats;
  }, [products]);

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setPrice(productToEdit.price.toString());
      setProfit(productToEdit.profit.toString());
      const editCategory = productToEdit.category === 'FREQUENT' ? (productToEdit as any).originalCategory || 'TEA' : productToEdit.category;
      // Check if category exists in the list, if not, it's a new category
      if (allCategories.includes(editCategory)) {
        setCategory(editCategory);
        setIsNewCategory(false);
        setNewCategory('');
      } else {
        setCategory('__NEW__');
        setIsNewCategory(true);
        setNewCategory(editCategory);
      }
      setImageUrl(productToEdit.imageUrl);
      setPreviewImage(productToEdit.imageUrl || '');
      // Detect if image is a data URL or external URL
      if (productToEdit.imageUrl) {
        if (productToEdit.imageUrl.startsWith('data:')) {
          setImageMethod('upload');
        } else {
          setImageMethod('url');
        }
      } else {
        setImageMethod('url');
      }
    } else {
        // Reset for new product
        setName('');
        setPrice('');
        setProfit('');
        setCategory(allCategories[0] || 'TEA');
        setIsNewCategory(false);
        setNewCategory('');
        setImageUrl('');
        setPreviewImage('');
        setImageMethod('url');
    }
  }, [productToEdit, isOpen, allCategories]);

  if (!isOpen) return null;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('Image size must be less than 10MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setImageUrl(base64String);
        setPreviewImage(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCameraCapture = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } // Use back camera on mobile
      });
      
      // Create video element for preview
      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();
      
      // Create a modal for camera preview
      const cameraModal = document.createElement('div');
      cameraModal.className = 'fixed inset-0 bg-black bg-opacity-75 z-[60] flex flex-col items-center justify-center p-4';
      cameraModal.innerHTML = `
        <div class="bg-white rounded-lg p-4 max-w-md w-full">
          <h3 class="text-lg font-bold mb-4">Take Photo</h3>
          <video id="camera-preview" class="w-full rounded-md mb-4" autoplay playsinline></video>
          <canvas id="camera-canvas" class="hidden"></canvas>
          <div class="flex space-x-2">
            <button id="capture-btn" class="flex-1 py-2 px-4 bg-purple-600 text-white rounded-md hover:bg-purple-700">
              Capture
            </button>
            <button id="cancel-camera-btn" class="flex-1 py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
              Cancel
            </button>
          </div>
        </div>
      `;
      document.body.appendChild(cameraModal);
      
      const previewVideo = cameraModal.querySelector('#camera-preview') as HTMLVideoElement;
      const canvas = cameraModal.querySelector('#camera-canvas') as HTMLCanvasElement;
      previewVideo.srcObject = stream;
      
      const captureBtn = cameraModal.querySelector('#capture-btn') as HTMLButtonElement;
      const cancelBtn = cameraModal.querySelector('#cancel-camera-btn') as HTMLButtonElement;
      
      captureBtn.onclick = () => {
        canvas.width = previewVideo.videoWidth;
        canvas.height = previewVideo.videoHeight;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(previewVideo, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        setImageUrl(imageData);
        setPreviewImage(imageData);
        
        // Stop stream and remove modal
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(cameraModal);
      };
      
      cancelBtn.onclick = () => {
        stream.getTracks().forEach(track => track.stop());
        document.body.removeChild(cameraModal);
      };
    } catch (error) {
      alert('Could not access camera. Please ensure camera permissions are granted.');
      console.error('Camera error:', error);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setPreviewImage('');
  };

  const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === '__NEW__') {
      setIsNewCategory(true);
      setNewCategory('');
      setCategory('__NEW__');
    } else {
      setIsNewCategory(false);
      setNewCategory('');
      setCategory(value);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(price);
    const profitNum = parseFloat(profit);

    // Determine final category
    const finalCategory = isNewCategory ? newCategory.trim() : category;
    
    if (!finalCategory) {
      alert('Please enter a category.');
      return;
    }

    if (name.trim() && !isNaN(priceNum) && !isNaN(profitNum) && priceNum >= 0 && profitNum >= 0) {
      if (profitNum > priceNum) {
        alert('Profit cannot be greater than the price.');
        return;
      }
      onSave({
        name: name.trim(),
        price: priceNum,
        profit: profitNum,
        category: finalCategory,
        imageUrl,
      }, productToEdit?.id);
    } else {
      alert('Please fill in all fields with valid values.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">{productToEdit ? 'Edit Product' : 'Add New Product'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><XIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
            <div>
                <label htmlFor="prod-name" className="block text-sm font-medium text-gray-700">Product Name</label>
                <input id="prod-name" type="text" value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full p-2 border rounded-md" required />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="prod-price" className="block text-sm font-medium text-gray-700">Price (₹)</label>
                    <input id="prod-price" type="number" value={price} onChange={e => setPrice(e.target.value)} className="mt-1 w-full p-2 border rounded-md" required min="0" step="0.01" />
                </div>
                <div>
                    <label htmlFor="prod-profit" className="block text-sm font-medium text-gray-700">Profit (₹)</label>
                    <input id="prod-profit" type="number" value={profit} onChange={e => setProfit(e.target.value)} className="mt-1 w-full p-2 border rounded-md" required min="0" step="0.01" />
                </div>
            </div>
             <div>
                <label htmlFor="prod-category" className="block text-sm font-medium text-gray-700">Category</label>
                <select 
                    id="prod-category" 
                    value={category} 
                    onChange={handleCategoryChange} 
                    className="mt-1 w-full p-2 border rounded-md bg-white"
                >
                    {allCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    <option value="__NEW__">+ Enter New Category</option>
                </select>
                {isNewCategory && (
                    <input
                        type="text"
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        placeholder="Enter new category name"
                        className="mt-2 w-full p-2 border rounded-md bg-white"
                        required
                    />
                )}
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Product Image (Optional)</label>
                
                {/* Method selector tabs */}
                <div className="flex space-x-2 mb-3 border-b">
                  <button
                    type="button"
                    onClick={() => setImageMethod('url')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      imageMethod === 'url'
                        ? 'border-b-2 border-purple-600 text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    URL
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMethod('upload')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      imageMethod === 'upload'
                        ? 'border-b-2 border-purple-600 text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Upload
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMethod('camera')}
                    className={`px-4 py-2 text-sm font-medium transition-colors ${
                      imageMethod === 'camera'
                        ? 'border-b-2 border-purple-600 text-purple-600'
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Camera
                  </button>
                </div>

                {/* Image preview */}
                {previewImage && (
                  <div className="mb-3 relative">
                    <img 
                      src={previewImage} 
                      alt="Preview" 
                      className="w-full h-48 object-contain border rounded-md bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600"
                      title="Remove image"
                    >
                      <XIcon className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* URL input */}
                {imageMethod === 'url' && (
                  <input
                    id="prod-image"
                    type="text"
                    value={imageUrl}
                    onChange={(e) => {
                      setImageUrl(e.target.value);
                      setPreviewImage(e.target.value);
                    }}
                    className="w-full p-2 border rounded-md"
                    placeholder="https://example.com/image.jpg"
                  />
                )}

                {/* File upload */}
                {imageMethod === 'upload' && (
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                    {!previewImage ? (
                      <>
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          stroke="currentColor"
                          fill="none"
                          viewBox="0 0 48 48"
                        >
                          <path
                            d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-4h12m-6 4v12m0 0H8v-4"
                            strokeWidth={2}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                        <label htmlFor="file-upload" className="mt-2 cursor-pointer">
                          <span className="text-purple-600 hover:text-purple-500 font-medium">
                            Click to upload
                          </span>
                          <span className="text-gray-500"> or drag and drop</span>
                        </label>
                        <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB</p>
                        <input
                          id="file-upload"
                          type="file"
                          accept="image/*"
                          onChange={handleFileUpload}
                          className="hidden"
                        />
                      </>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600">Image uploaded successfully</p>
                        <p className="text-xs text-gray-500 mt-1">Click the X button above to remove</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Camera option */}
                {imageMethod === 'camera' && (
                  <div className="border-2 border-dashed border-gray-300 rounded-md p-6 text-center">
                    {!previewImage ? (
                      <>
                        <svg
                          className="mx-auto h-12 w-12 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                          />
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                          />
                        </svg>
                        <button
                          type="button"
                          onClick={handleCameraCapture}
                          className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
                        >
                          Take Photo
                        </button>
                        <p className="mt-2 text-xs text-gray-500">Grant camera permission when prompted</p>
                      </>
                    ) : (
                      <div>
                        <p className="text-sm text-gray-600">Photo captured successfully</p>
                        <p className="text-xs text-gray-500 mt-1">Click the X button above to remove</p>
                      </div>
                    )}
                  </div>
                )}
            </div>
        </form>
        <div className="p-4 bg-gray-50 border-t flex justify-end space-x-2">
          <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
          <button type="submit" onClick={handleSubmit} className="py-2 px-4 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700">
            {productToEdit ? 'Save Changes' : 'Add Product'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ProductModal;