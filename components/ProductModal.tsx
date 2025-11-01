import React, { useState, useEffect } from 'react';
import { Product } from '../types.ts';
import { CATEGORIES } from '../constants.ts';
import { XIcon } from './Icons.tsx';

interface ProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (productData: Omit<Product, 'id'>, id?: number) => void;
  productToEdit: Product | null;
}

const ProductModal: React.FC<ProductModalProps> = ({ isOpen, onClose, onSave, productToEdit }) => {
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [profit, setProfit] = useState('');
  const [category, setCategory] = useState(CATEGORIES.find(c => c !== 'FREQUENT') || 'TEA');
  const [imageUrl, setImageUrl] = useState('');

  useEffect(() => {
    if (productToEdit) {
      setName(productToEdit.name);
      setPrice(productToEdit.price.toString());
      setProfit(productToEdit.profit.toString());
      setCategory(productToEdit.category === 'FREQUENT' ? (productToEdit as any).originalCategory || 'TEA' : productToEdit.category);
      setImageUrl(productToEdit.imageUrl);
    } else {
        // Reset for new product
        setName('');
        setPrice('');
        setProfit('');
        setCategory(CATEGORIES.find(c => c !== 'FREQUENT') || 'TEA');
        setImageUrl('');
    }
  }, [productToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const priceNum = parseFloat(price);
    const profitNum = parseFloat(profit);

    if (name.trim() && !isNaN(priceNum) && !isNaN(profitNum) && priceNum >= 0 && profitNum >= 0) {
      if (profitNum > priceNum) {
        alert('Profit cannot be greater than the price.');
        return;
      }
      onSave({
        name: name.trim(),
        price: priceNum,
        profit: profitNum,
        category,
        imageUrl,
      }, productToEdit?.id);
    } else {
      alert('Please fill in all fields with valid values.');
    }
  };
  
  const availableCategories = CATEGORIES.filter(c => c !== 'FREQUENT');

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
                <select id="prod-category" value={category} onChange={e => setCategory(e.target.value)} className="mt-1 w-full p-2 border rounded-md bg-white">
                    {availableCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
            </div>
            <div>
                <label htmlFor="prod-image" className="block text-sm font-medium text-gray-700">Image URL (Optional)</label>
                <input id="prod-image" type="text" value={imageUrl} onChange={e => setImageUrl(e.target.value)} className="mt-1 w-full p-2 border rounded-md" placeholder="https://example.com/image.jpg" />
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