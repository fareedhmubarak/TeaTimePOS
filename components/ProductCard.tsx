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
      className={`relative group bg-white rounded-lg shadow-sm border-2 cursor-pointer transition-all duration-200 hover:shadow-lg hover:border-purple-500 ${quantityInCart > 0 ? 'border-purple-800' : 'border-gray-200'}`}
    >
      {product.imageUrl ? (
        <img src={product.imageUrl} alt={product.name} className="w-full h-32 object-contain rounded-t-md p-2" />
      ) : (
        <div className="w-full h-32 bg-gray-200 flex items-center justify-center rounded-t-md">
            <span className="text-gray-500 text-base">No Image</span>
        </div>
      )}
      <div className="p-3 text-center">
        <h3 className="text-lg font-bold truncate">{product.name}</h3>
        <p className="text-base text-gray-600 mt-1">₹{product.price}</p>
      </div>
      {quantityInCart > 0 && (
          <div className="absolute top-1 right-1 bg-purple-800 text-white text-base font-bold rounded-full h-8 w-8 flex items-center justify-center">
              {quantityInCart}
          </div>
      )}
    </div>
  );
};

export default ProductCard;