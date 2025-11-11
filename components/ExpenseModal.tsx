import React, { useState, useEffect, useMemo } from 'react';
import { XIcon, PlusIcon, TrashIcon } from './Icons.tsx';
import { ExpenseItem, Expense } from '../types.ts';

interface ExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddExpense: (description: string, amount: number, date: string) => void;
  dailyExpenseItems: ExpenseItem[];
  expenses: Expense[];
  onDeleteExpense?: (expenseId: number) => void;
}

const ExpenseModal: React.FC<ExpenseModalProps> = ({ 
  isOpen, 
  onClose, 
  onAddExpense, 
  dailyExpenseItems, 
  expenses,
  onDeleteExpense 
}) => {
  const [selectedExpense, setSelectedExpense] = useState('');
  const [subItemDescription, setSubItemDescription] = useState('');
  const [customDescription, setCustomDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);

  const selectedExpenseItem = useMemo(() => {
    return dailyExpenseItems.find(item => item.name === selectedExpense);
  }, [selectedExpense, dailyExpenseItems]);

  // Filter expenses for the selected date
  const expensesForDate = useMemo(() => {
    const selectedDateStr = new Date(expenseDate + 'T00:00:00').toLocaleDateString('en-US', { 
      month: 'numeric', 
      day: 'numeric', 
      year: 'numeric' 
    });
    return expenses.filter(exp => exp.date === selectedDateStr);
  }, [expenses, expenseDate]);

  const totalForDate = useMemo(() => {
    return expensesForDate.reduce((sum, exp) => sum + exp.amount, 0);
  }, [expensesForDate]);

  useEffect(() => {
    if (!isOpen) {
      // Reset form when modal closes
      setSelectedExpense('');
      setSubItemDescription('');
      setCustomDescription('');
      setAmount('');
      setExpenseDate(new Date().toISOString().split('T')[0]);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    let description = '';

    if (selectedExpense === 'OTHER') {
        description = customDescription.trim();
    } else if (selectedExpenseItem) {
        if (selectedExpenseItem.allowSubItems) {
            if (!subItemDescription.trim()) {
                alert(`Please provide a description for the '${selectedExpenseItem.name}' sub-item.`);
                return;
            }
            description = `${selectedExpenseItem.name}: ${subItemDescription.trim()}`;
        } else {
            description = selectedExpenseItem.name;
        }
    }

    if (description && !isNaN(numAmount) && numAmount > 0) {
      onAddExpense(description, numAmount, expenseDate);
      // Reset form but keep modal open so user can see the new expense in the list
      setSelectedExpense('');
      setSubItemDescription('');
      setCustomDescription('');
      setAmount('');
    } else {
      alert('Please select an expense, provide any required details, and enter a valid amount.');
    }
  };
  
  const datalistId = 'expense-subitems-list';

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 transition-opacity duration-300"
        onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] transform transition-transform duration-300 scale-95 flex flex-col"
        onClick={(e) => e.stopPropagation()} // Prevent closing modal when clicking inside
        style={isOpen ? { transform: 'scale(1)', opacity: 1 } : { transform: 'scale(0.95)', opacity: 0 }}
      >
        <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
          <h2 className="text-xl font-bold text-gray-800">Expenses - {new Date(expenseDate + 'T00:00:00').toLocaleDateString('en-US', { 
            weekday: 'short', 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          })}</h2>
          <button onClick={onClose} className="p-1 text-gray-500 hover:text-gray-800 rounded-full hover:bg-gray-100">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Existing Expenses List */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-700">Expenses for Selected Date</h3>
              <div className="text-sm text-gray-600">
                Total: <span className="font-bold text-purple-800">₹{totalForDate.toFixed(2)}</span>
              </div>
            </div>
            {expensesForDate.length > 0 ? (
              <div className="bg-gray-50 rounded-lg border border-gray-200 max-h-64 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 sticky top-0">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-semibold text-gray-700">Description</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold text-gray-700">Amount</th>
                      {onDeleteExpense && (
                        <th className="px-4 py-2 text-center text-xs font-semibold text-gray-700 w-16">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {expensesForDate.map((expense) => (
                      <tr key={expense.id} className="border-b border-gray-200 hover:bg-white">
                        <td className="px-4 py-2 text-gray-800">{expense.description}</td>
                        <td className="px-4 py-2 text-right font-medium text-gray-900">₹{expense.amount.toFixed(2)}</td>
                        {onDeleteExpense && (
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => {
                                if (window.confirm(`Delete expense: ${expense.description}?`)) {
                                  onDeleteExpense(expense.id);
                                }
                              }}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded"
                              title="Delete expense"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-8 text-center text-gray-500">
                <p className="text-sm">No expenses added for this date yet.</p>
              </div>
            )}
          </div>

          {/* Add New Expense Form */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-700 mb-4">Add New Expense</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="exp-date" className="block text-sm font-medium text-gray-700">Date</label>
              <input
                type="date"
                id="exp-date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                required
              />
            </div>
             <div>
              <label htmlFor="exp-amount" className="block text-sm font-medium text-gray-700">Amount (₹)</label>
              <input
                type="number"
                id="exp-amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                placeholder="e.g., 500"
                required
                min="0.01"
                step="0.01"
              />
            </div>
          </div>

          <div>
            <label htmlFor="exp-description" className="block text-sm font-medium text-gray-700">Expense Type</label>
            <select
              id="exp-description"
              value={selectedExpense}
              onChange={(e) => {
                setSelectedExpense(e.target.value)
                setSubItemDescription('');
              }}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
              required
            >
              <option value="" disabled>-- Select an expense --</option>
              {dailyExpenseItems.map(item => (
                <option key={item.id} value={item.name}>{item.name}</option>
              ))}
              <option value="OTHER">Other...</option>
            </select>
          </div>

          {selectedExpenseItem?.allowSubItems && (
             <div>
                <label htmlFor="exp-sub-item" className="block text-sm font-medium text-gray-700">
                    Details for {selectedExpenseItem.name}
                </label>
                <input
                  type="text"
                  id="exp-sub-item"
                  list={selectedExpenseItem.subItems && selectedExpenseItem.subItems.length > 0 ? datalistId : undefined}
                  value={subItemDescription}
                  onChange={(e) => setSubItemDescription(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  placeholder="e.g., Veg Puff"
                  required
                />
                {selectedExpenseItem.subItems && selectedExpenseItem.subItems.length > 0 && (
                    <datalist id={datalistId}>
                        {selectedExpenseItem.subItems.map(sub => <option key={sub} value={sub} />)}
                    </datalist>
                )}
            </div>
          )}

          {selectedExpense === 'OTHER' && (
             <div>
                <label htmlFor="exp-custom-description" className="block text-sm font-medium text-gray-700">Custom Description</label>
                <input
                  type="text"
                  id="exp-custom-description"
                  value={customDescription}
                  onChange={(e) => setCustomDescription(e.target.value)}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                  placeholder="e.g., Unplanned repair"
                  required
                />
            </div>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="py-2 px-4 bg-gray-200 text-gray-800 rounded-md text-sm font-semibold hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="py-2 px-4 flex items-center bg-purple-600 text-white rounded-md text-sm font-semibold hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-colors"
            >
              <PlusIcon className="w-4 h-4 mr-2" />
              Add Expense
            </button>
          </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseModal;