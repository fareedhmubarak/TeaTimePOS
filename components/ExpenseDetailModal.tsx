import React from 'react';
import { XIcon } from './Icons.tsx';

interface Expense {
    date: string;
    description: string;
    type: string;
    amount: number;
}

interface ExpenseDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  expenses: Expense[];
  title: string;
}

const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({ isOpen, onClose, expenses, title }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-800">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
            <table className="w-full text-sm text-left text-gray-500">
                <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0">
                    <tr>
                        <th scope="col" className="px-6 py-3">Date</th>
                        <th scope="col" className="px-6 py-3">Description</th>
                        <th scope="col" className="px-6 py-3">Type</th>
                        <th scope="col" className="px-6 py-3 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {expenses.map((item, index) => (
                        <tr key={index} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{item.date}</td>
                            <td className="px-6 py-4 font-medium text-gray-900">{item.description}</td>
                            <td className="px-6 py-4 text-gray-600">{item.type}</td>
                            <td className="px-6 py-4 text-right text-red-600">₹{item.amount.toFixed(2)}</td>
                        </tr>
                    ))}
                    {expenses.length === 0 && (
                        <tr><td colSpan={4} className="text-center py-8 text-gray-500">No expenses recorded in this period.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
        <div className="p-4 bg-gray-50 border-t flex justify-end">
            <button
                type="button"
                onClick={onClose}
                className="py-2 px-4 bg-gray-200 text-gray-800 rounded-md text-sm font-semibold hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetailModal;