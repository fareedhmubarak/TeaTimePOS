import React, { useState, useEffect, useRef } from 'react';
import { XIcon } from './Icons.tsx';

interface QuantityInputModalProps {
  isOpen: boolean;
  currentQuantity: number;
  productName: string;
  onClose: () => void;
  onSave: (quantity: number) => void;
}

const QuantityInputModal: React.FC<QuantityInputModalProps> = ({
  isOpen,
  currentQuantity,
  productName,
  onClose,
  onSave,
}) => {
  const [inputValue, setInputValue] = useState<string>('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      // Clear input when modal opens
      setInputValue('');
      // Focus input after a small delay to ensure modal is rendered
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 100);
    }
  }, [isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numValue = parseInt(inputValue, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onSave(numValue);
      setInputValue('');
      onClose();
    } else {
      alert('Please enter a valid quantity (greater than 0)');
    }
  };

  const handleClose = () => {
    setInputValue('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-[9999] flex items-center justify-center p-4"
      onClick={handleClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Enter Quantity</h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
            type="button"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-gray-600 mb-2">
            <span className="font-semibold">Product:</span> {productName}
          </p>
          <p className="text-sm text-gray-500">
            Current Quantity: <span className="font-semibold">{currentQuantity}</span>
          </p>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="quantity-input" className="block text-sm font-medium text-gray-700 mb-2">
              Enter Quantity
            </label>
            <input
              ref={inputRef}
              id="quantity-input"
              type="number"
              inputMode="numeric"
              min="1"
              value={inputValue}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty string or positive numbers
                if (value === '' || /^\d+$/.test(value)) {
                  setInputValue(value);
                }
              }}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-semibold text-center"
              placeholder="Enter quantity"
              autoFocus
            />
            <p className="text-xs text-gray-500 mt-2">
              This will set the total quantity to the entered value
            </p>
          </div>
          
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-800 text-white rounded-lg hover:bg-purple-900 transition-colors font-semibold"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default QuantityInputModal;

