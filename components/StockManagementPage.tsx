import React, { useState } from 'react';
import { StockEntry, ExpenseItem } from '../types.ts';
import { PlusIcon, PencilIcon, TrashIcon, ChevronDownIcon, ChevronRightIcon } from './Icons.tsx';
import AddStockEntryModal from './AddStockEntryModal.tsx';

interface StockManagementPageProps {
  stockEntries: StockEntry[];
  expenseItems: ExpenseItem[];
  onAddStockEntry: (entry: Omit<StockEntry, 'id' | 'totalCost'>) => void;
  onUpdateStockEntry: (entry: StockEntry) => void;
  onDeleteStockEntry: (entryId: number) => void;
}

const StockManagementPage: React.FC<StockManagementPageProps> = ({ stockEntries, expenseItems, onAddStockEntry, onUpdateStockEntry, onDeleteStockEntry }) => {
    const [modalState, setModalState] = useState<{isOpen: boolean, entryToEdit: StockEntry | null}>({isOpen: false, entryToEdit: null});
    const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
    
    const openAddModal = () => setModalState({isOpen: true, entryToEdit: null});
    const openEditModal = (entry: StockEntry) => setModalState({isOpen: true, entryToEdit: entry});
    const closeModal = () => setModalState({isOpen: false, entryToEdit: null});

    const toggleRow = (entryId: number) => {
        const newExpandedRows = new Set(expandedRows);
        if (newExpandedRows.has(entryId)) {
            newExpandedRows.delete(entryId);
        } else {
            newExpandedRows.add(entryId);
        }
        setExpandedRows(newExpandedRows);
    };

    const handleSave = (entryData: Omit<StockEntry, 'id' | 'totalCost'>, id?: number) => {
        if (id) {
            onUpdateStockEntry({ ...entryData, id } as StockEntry);
        } else {
            onAddStockEntry(entryData);
        }
        closeModal();
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-xl font-bold text-gray-800">Purchases &amp; Expenses</h1>
                <button onClick={openAddModal} className="flex items-center bg-purple-600 text-white font-semibold py-2.5 px-5 rounded-lg shadow hover:bg-purple-700 transition-colors text-base">
                    <PlusIcon className="w-5 h-5 mr-2" />
                    Add New Purchase
                </button>
            </div>

            <div className="bg-white shadow-md rounded-lg overflow-hidden">
                <div className="max-h-[70vh] overflow-y-auto">
                    <table className="w-full text-base text-left text-gray-500">
                        <thead className="text-sm text-gray-700 uppercase bg-gray-100 sticky top-0">
                            <tr>
                                <th scope="col" className="px-2 py-3 w-12"></th>
                                <th scope="col" className="px-6 py-3">Date</th>
                                <th scope="col" className="px-6 py-3">Primary Item / Description</th>
                                <th scope="col" className="px-6 py-3 text-right">Total Cost</th>
                                <th scope="col" className="px-6 py-3 text-center">Receipt</th>
                                <th scope="col" className="px-6 py-3 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stockEntries.map(entry => {
                                const isExpanded = expandedRows.has(entry.id);
                                return (
                                    <React.Fragment key={entry.id}>
                                        <tr className="bg-white border-b hover:bg-gray-50 cursor-pointer" onClick={() => (entry.items || []).length > 0 && toggleRow(entry.id)}>
                                            <td className="px-2 py-4">
                                                {(entry.items || []).length > 0 && (
                                                    <button className="p-1 rounded-full hover:bg-gray-200">
                                                        {isExpanded ? <ChevronDownIcon className="w-5 h-5 text-gray-600" /> : <ChevronRightIcon className="w-5 h-5 text-gray-600" />}
                                                    </button>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{new Date(entry.date).toLocaleDateString('en-CA')}</td>
                                            <td className="px-6 py-4 font-medium text-gray-900">{entry.primaryDescription || (entry.items && entry.items[0]?.name)}</td>
                                            <td className="px-6 py-4 text-right font-semibold text-red-600">₹{(entry.totalCost || 0).toFixed(2)}</td>
                                            <td className="px-6 py-4 text-center">
                                                {entry.billImageUrl ? 
                                                    <a href={entry.billImageUrl} target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline text-sm" onClick={e => e.stopPropagation()}>View</a> : 
                                                    <span className="text-gray-400 text-sm">None</span>
                                                }
                                            </td>
                                            <td className="px-6 py-4" onClick={e => e.stopPropagation()}>
                                                <div className="flex justify-center items-center space-x-2">
                                                    <button onClick={() => openEditModal(entry)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full">
                                                        <PencilIcon className="w-5 h-5"/>
                                                    </button>
                                                    <button onClick={() => onDeleteStockEntry(entry.id)} className="p-2 text-red-600 hover:bg-red-100 rounded-full">
                                                        <TrashIcon className="w-5 h-5"/>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                        {isExpanded && (
                                            <tr className="bg-gray-50">
                                                <td colSpan={6} className="p-0">
                                                    <div className="p-4">
                                                        <h4 className="font-bold text-gray-700 mb-2 text-base">Details</h4>
                                                        <table className="w-full text-sm">
                                                            <thead className="bg-gray-200">
                                                                <tr>
                                                                    <th className="px-4 py-2 text-left">Item Name</th>
                                                                    <th className="px-4 py-2 text-center">Quantity</th>
                                                                    <th className="px-4 py-2 text-right">Cost per Item</th>
                                                                    <th className="px-4 py-2 text-right">Total</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody>
                                                                {(entry.items || []).map(item => (
                                                                    <tr key={item.id} className="border-b">
                                                                        <td className="px-4 py-2">{item.name}</td>
                                                                        <td className="px-4 py-2 text-center">{item.quantity}</td>
                                                                        <td className="px-4 py-2 text-right">₹{(item.cost || 0).toFixed(2)}</td>
                                                                        <td className="px-4 py-2 text-right font-medium">₹{((item.quantity || 0) * (item.cost || 0)).toFixed(2)}</td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                             {stockEntries.length === 0 && (
                                <tr><td colSpan={6} className="text-center py-8 text-gray-500 text-base">No purchase entries found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {modalState.isOpen && <AddStockEntryModal 
                isOpen={modalState.isOpen}
                onClose={closeModal} 
                onSave={handleSave} 
                entryToEdit={modalState.entryToEdit}
                expenseItems={expenseItems}
            />}
        </div>
    );
};

export default StockManagementPage;