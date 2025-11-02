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
      className={`relative group bg-white rounded border cursor-pointer transition-all duration-200 hover:shadow-md hover:border-purple-500 ${quantityInCart > 0 ? 'border-purple-800 shadow-sm' : 'border-gray-200'}`}
    >
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} className="w-full h-20 object-contain rounded-t p-1" />
      ) : (
        <div className="w-full h-20 bg-gray-100 flex items-center justify-center rounded-t">
            <span className="text-gray-400 text-xs">No Image</span>
        </div>
      )}
      <div className="p-1.5 text-center">
        <h3 className="text-xs font-semibold truncate leading-tight">{product.name}</h3>
        <p className="text-xs text-gray-600 mt-0.5">₹{product.price}</p>
      </div>
      {quantityInCart > 0 && (
          <div className="absolute top-0.5 right-0.5 bg-purple-800 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center">
              {quantityInCart}
          </div>
      )}
    </div>
  );
};

export default ProductCard;