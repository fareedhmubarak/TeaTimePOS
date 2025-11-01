import React from 'react';
import { CartItem } from '../types.ts';
import { PlusIcon, MinusIcon, TrashIcon } from './Icons.tsx';

interface OrderItemProps {
  item: CartItem;
  onUpdateQuantity: (productId: number, newQuantity: number) => void;
  onRemoveItem: (productId: number) => void;
  isReadOnly: boolean;
}

const OrderItem: React.FC<OrderItemProps> = ({ item, onUpdateQuantity, onRemoveItem, isReadOnly }) => {
  return (
    <div className="flex items-center">
      <div className="flex-1">
        <p className="text-lg font-semibold">{item.product.name}</p>
        <p className="text-base text-gray-500">₹{item.product.price}</p>
      </div>
      <div className="flex items-center space-x-2">
        {isReadOnly ? (
          <span className="text-lg text-gray-600 font-medium px-3">Qty: {item.quantity}</span>
        ) : (
          <>
            <button
              onClick={() => onRemoveItem(item.product.id)}
              className="p-1 rounded-full text-red-500 hover:bg-red-100"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
            <div className="flex items-center border border-gray-300 rounded-md">
              <button
                onClick={() => onUpdateQuantity(item.product.id, item.quantity - 1)}
                className="p-1 text-red-500 hover:bg-gray-100 rounded-l-md"
              >
                <MinusIcon className="w-4 h-4" />
              </button>
              <span className="px-4 text-lg font-bold">{item.quantity}</span>
              <button
                onClick={() => onUpdateQuantity(item.product.id, item.quantity + 1)}
                className="p-1 text-green-500 hover:bg-gray-100 rounded-r-md"
              >
                <PlusIcon className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>
      <div className="w-24 text-right font-semibold text-lg">
        ₹{item.product.price * item.quantity}
      </div>
    </div>
  );
};

export default OrderItem;