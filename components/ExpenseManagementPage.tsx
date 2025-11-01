import React, { useState } from 'react';
import { ExpenseItem } from '../types.ts';
import { PlusIcon, PencilIcon, TrashIcon } from './Icons.tsx';
import ExpenseItemModal from './RecurringExpenseModal.tsx';

interface ExpenseManagementPageProps {
  expenseItems: ExpenseItem[];
  onAdd: (item: Omit<ExpenseItem, 'id'>) => void;
  onUpdate: (item: ExpenseItem) => void;
  onDelete: (itemId: number) => void;
}

const ExpenseManagementPage: React.FC<ExpenseManagementPageProps> = ({ expenseItems, onAdd, onUpdate, onDelete }) => {
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingExpense, setEditingExpense] = useState<ExpenseItem | null>(null);

    const openModalForNew = () => {
        setEditingExpense(null);
        setModalOpen(true);
    };

    const openModalForEdit = (expense: ExpenseItem) => {
        setEditingExpense(expense);
        setModalOpen(true);
    };

    const closeModal = () => {
        setModalOpen(false);
        setEditingExpense(null);
    };

    const handleSave = (item: Omit<ExpenseItem, 'id'>) => {
        if (editingExpense) {
            onUpdate({ ...item, id: editingExpense.id });
        } else {
            onAdd(item);
        }
        closeModal();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <h1 className="text-3xl font-bold text-gray-800">Manage Expense Items</h1>
                <button onClick={openModalForNew} className="flex items-center bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-purple-700 transition-colors">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add Expense Item
                </button>
            </div>
            
            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="max-h-[70vh] overflow-y-auto">
                    <table className="w-full text-sm text-left text-gray-500">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">Expense Name</th>
                                <th scope="col" className="px-6 py-3">Category</th>
                                <th scope="col" className="px-6 py-3">Allows Sub-Items</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {expenseItems.map(expense => (
                                <tr key={expense.id} className="bg-white border-b hover:bg-gray-50">
                                    <td className="px-6 py-4 font-medium text-gray-900 align-top">
                                        <div>{expense.name}</div>
                                        {expense.allowSubItems && expense.subItems && expense.subItems.length > 0 && (
                                            <div className="mt-2 flex flex-wrap gap-1">
                                                {expense.subItems.map(subItem => (
                                                    <span key={subItem} className="px-2 py-0.5 text-xs font-normal bg-gray-200 text-gray-700 rounded-full">
                                                        {subItem}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${expense.category === 'Monthly' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                            {expense.category}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 align-top">
                                        {expense.allowSubItems ? 'Yes' : 'No'}
                                    </td>
                                    <td className="px-6 py-4 text-center align-top">
                                        <div className="flex justify-center items-center space-x-2">
                                            <button onClick={() => openModalForEdit(expense)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full">
                                                <PencilIcon className="w-4 h-4"/>
                                            </button>
                                            <button onClick={() => onDelete(expense.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full">
                                                <TrashIcon className="w-4 h-4"/>
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                             {expenseItems.length === 0 && (
                                <tr><td colSpan={5} className="text-center py-8 text-gray-500">No expense items defined.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            
            {isModalOpen && (
                <ExpenseItemModal
                    isOpen={isModalOpen}
                    onClose={closeModal}
                    onSave={handleSave}
                    expenseToEdit={editingExpense}
                />
            )}
        </div>
    );
};

export default ExpenseManagementPage;