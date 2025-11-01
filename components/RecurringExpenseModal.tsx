import React, { useState, useEffect } from 'react';
import { ExpenseItem } from '../types.ts';
import { XIcon } from './Icons.tsx';

interface ExpenseItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Omit<ExpenseItem, 'id'>) => void;
  expenseToEdit: ExpenseItem | null;
}

const ExpenseItemModal: React.FC<ExpenseItemModalProps> = ({ isOpen, onClose, onSave, expenseToEdit }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'Daily' | 'Monthly'>('Daily');
  const [allowSubItems, setAllowSubItems] = useState(false);
  const [subItems, setSubItems] = useState<string[]>([]);
  const [newSubItem, setNewSubItem] = useState('');

  useEffect(() => {
    if (expenseToEdit) {
      setName(expenseToEdit.name);
      setCategory(expenseToEdit.category);
      setAllowSubItems(!!expenseToEdit.allowSubItems);
      setSubItems(expenseToEdit.subItems || []);
    } else {
      setName('');
      setCategory('Daily');
      setAllowSubItems(false);
      setSubItems([]);
    }
    setNewSubItem('');
  }, [expenseToEdit, isOpen]);

  if (!isOpen) return null;

  const handleAddSubItem = () => {
    const trimmedItem = newSubItem.trim();
    if (trimmedItem && !subItems.find(i => i.toLowerCase() === trimmedItem.toLowerCase())) {
        setSubItems([...subItems, trimmedItem]);
        setNewSubItem('');
    }
  };

  const handleRemoveSubItem = (itemToRemove: string) => {
      setSubItems(subItems.filter(item => item !== itemToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
        alert('Please enter a valid name.');
        return;
    }

    onSave({
        name: name.trim(),
        category,
        allowSubItems,
        subItems: allowSubItems ? subItems : [],
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">{expenseToEdit ? 'Edit' : 'Add'} Expense Item</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><XIcon className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6 flex-1 overflow-y-auto">
          <div>
            <label htmlFor="exp-name" className="block text-sm font-medium text-gray-700">Expense Name</label>
            <input
              type="text"
              id="exp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              placeholder="e.g., Shop Rent, Milk"
              required
            />
          </div>
           <div>
                <label htmlFor="exp-category" className="block text-sm font-medium text-gray-700">Category</label>
                <select 
                    id="exp-category" 
                    value={category} 
                    onChange={e => setCategory(e.target.value as 'Daily' | 'Monthly')}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white"
                >
                    <option value="Daily">Daily</option>
                    <option value="Monthly">Monthly</option>
                </select>
            </div>
             <div>
                <div className="relative flex items-start">
                    <div className="flex h-6 items-center">
                        <input
                            id="allowSubItems"
                            aria-describedby="allowSubItems-description"
                            name="allowSubItems"
                            type="checkbox"
                            checked={allowSubItems}
                            onChange={(e) => setAllowSubItems(e.target.checked)}
                            className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-600"
                        />
                    </div>
                    <div className="ml-3 text-sm leading-6">
                        <label htmlFor="allowSubItems" className="font-medium text-gray-900">Allow Sub-Items</label>
                        <p id="allowSubItems-description" className="text-gray-500 text-xs">Check this if this expense can have multiple line items (e.g., a stock purchase).</p>
                    </div>
                </div>
            </div>
            {allowSubItems && (
                <div>
                    <label className="block text-sm font-medium text-gray-700">
                        Predefined Sub-Items (Optional)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                        Add common options for this expense to speed up purchase entry later.
                    </p>
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={newSubItem}
                            onChange={(e) => setNewSubItem(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddSubItem(); }}}
                            className="flex-grow border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                            placeholder="e.g., Vanilla, Chocolate"
                        />
                        <button
                            type="button"
                            onClick={handleAddSubItem}
                            className="py-2 px-4 bg-gray-200 text-gray-800 rounded-md text-sm font-semibold hover:bg-gray-300"
                        >
                            Add
                        </button>
                    </div>
                    {subItems.length > 0 && (
                        <div className="mt-3 flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50 max-h-32 overflow-y-auto">
                            {subItems.map(item => (
                                <span key={item} className="flex items-center bg-purple-100 text-purple-800 text-sm font-medium px-2.5 py-1 rounded-full">
                                    {item}
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveSubItem(item)}
                                        className="ml-1.5 p-0.5 text-purple-500 hover:text-purple-800 hover:bg-purple-200 rounded-full"
                                        aria-label={`Remove ${item}`}
                                    >
                                        <XIcon className="w-3 h-3" />
                                    </button>
                                </span>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </form>
        <div className="p-4 bg-gray-50 border-t flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 bg-gray-200 text-gray-800 rounded-md text-sm font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              onClick={handleSubmit}
              className="py-2 px-4 bg-purple-600 text-white rounded-md text-sm font-semibold hover:bg-purple-700"
            >
              {expenseToEdit ? 'Save Changes' : 'Add Item'}
            </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseItemModal;