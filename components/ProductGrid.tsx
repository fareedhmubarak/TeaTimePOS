import React from 'react';
import { Product, CartItem } from '../types.ts';
import ProductCard from './ProductCard.tsx';
import { SearchIcon, FilterIcon } from './Icons.tsx';

interface ProductGridProps {
  products: Product[];
  onAddItem: (product: Product) => void;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  activeOrderItems: CartItem[];
}

const ProductGrid: React.FC<ProductGridProps> = ({ products, onAddItem, searchTerm, onSearchChange, activeOrderItems }) => {
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="relative mb-4">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <SearchIcon className="h-5 w-5 text-gray-400" />
        </div>
        <input
          type="text"
          placeholder="Search Product"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="block w-full bg-white border border-gray-300 rounded-md py-4 pl-10 pr-12 text-lg placeholder-gray-500 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
        />
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            <button className="p-1 text-gray-500 hover:text-purple-800">
                <FilterIcon className="h-5 w-5" />
            </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto pr-2">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {products.map((product) => (
             <ProductCard 
                key={product.id} 
                product={product} 
                onAddItem={onAddItem}
                quantityInCart={activeOrderItems.find(item => item.product.id === product.id)?.quantity || 0}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProductGrid;