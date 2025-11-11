import React from 'react';
import { Product } from '../types.ts';

interface ProductCardProps {
  product: Product;
  onAddItem: (product: Product) => void;
  quantityInCart: number;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, onAddItem, quantityInCart }) => {
  return (
    <div
      onClick={() => onAddItem(product)}
      className={`relative group bg-white rounded-lg border-2 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-purple-500 ${quantityInCart > 0 ? 'border-purple-800 shadow-md' : 'border-gray-200'} flex flex-col`}
    >
      <div className="aspect-[3/4] w-full overflow-hidden rounded-t-lg p-1 flex items-center justify-center bg-gray-50">
        {product.imageUrl ? (
          <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
        ) : (
          <span className="text-gray-400 text-xs">NO IMAGE</span>
        )}
      </div>
      <div className="p-2 text-center flex-shrink-0">
        <h3 className="text-sm font-bold truncate leading-tight">{product.name}</h3>
        <p className="text-xs text-gray-600 mt-0.5 font-semibold">₹{product.price.toFixed(0)}</p>
      </div>
      {quantityInCart > 0 && (
          <div className="absolute top-2 right-2 bg-purple-800 text-white text-sm font-bold rounded-full h-7 w-7 flex items-center justify-center shadow-md">
              {quantityInCart}
          </div>
      )}
    </div>
  );
};

export default ProductCard;