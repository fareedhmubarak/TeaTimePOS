import React, { useState } from 'react';
import { Product, CartItem } from '../types.ts';
import ProductCard from './ProductCard.tsx';
import { SearchIcon, FilterIcon } from './Icons.tsx';

interface ProductGridProps {
  products: Product[];
  onAddItem: (product: Product) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeOrderItems: CartItem[];
  onRetryLoadProducts?: () => Promise<void>;
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, onAddItem, searchTerm, onSearchChange, activeOrderItems, onRetryLoadProducts }) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const filteredProducts = products.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleRetry = async () => {
    if (onRetryLoadProducts) {
      setIsRetrying(true);
      try {
        await onRetryLoadProducts();
      } catch (error) {
        console.error('Failed to retry loading products:', error);
        alert('Failed to load products. Please check your connection and try again.');
      } finally {
        setIsRetrying(false);
      }
    } else {
      // Fallback to page reload if no retry function provided
      window.location.reload();
    }
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden h-full">
      <div className="relative mb-2 flex-shrink-0">
        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
          <SearchIcon className="h-4 w-4 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search Product"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full bg-white border border-gray-300 rounded-md py-1.5 pl-8 pr-8 text-sm placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-purple-500"
        />
        <div className="absolute inset-y-0 right-0 pr-2 flex items-center">
            <button className="p-1 text-gray-500 hover:text-purple-800">
                <FilterIcon className="h-4 w-4" />
            </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pr-1 min-h-0">
        {products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-lg font-semibold mb-2">No Products Loaded</p>
            <p className="text-sm text-center mb-4">Products could not be loaded from the database.</p>
            <button 
              onClick={handleRetry}
              disabled={isRetrying}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:bg-purple-400 disabled:cursor-not-allowed"
            >
              {isRetrying ? 'Loading...' : 'Retry Loading Products'}
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <p className="text-lg">No products match "{searchTerm}"</p>
          </div>
        ) : (
          <div className="grid grid-cols-4 gap-2 auto-rows-max">
            {filteredProducts.map((product) => (
               <ProductCard 
                  key={product.id} 
                  product={product} 
                  onAddItem={onAddItem}
                  quantityInCart={activeOrderItems.find(item => item.product.id === product.id)?.quantity || 0}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProductGrid;