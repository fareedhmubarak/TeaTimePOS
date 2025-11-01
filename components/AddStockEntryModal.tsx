import React, { useState, useEffect } from 'react';
import { StockEntry, StockItem, ExpenseItem } from '../types.ts';
import { PlusIcon, TrashIcon, UploadIcon, XIcon } from './Icons.tsx';

interface AddStockEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (entry: Omit<StockEntry, 'id' | 'totalCost'>, id?: number) => void;
    entryToEdit: StockEntry | null;
    expenseItems: ExpenseItem[];
}

// Helper to get today's date in YYYY-MM-DD format for the local timezone
const getTodayDateString = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};


const AddStockEntryModal: React.FC<AddStockEntryModalProps> = ({ isOpen, onClose, onSave, entryToEdit, expenseItems }) => {
    const [date, setDate] = useState(getTodayDateString());
    const [primaryDescription, setPrimaryDescription] = useState('');
    const [items, setItems] = useState<StockItem[]>([{ id: Date.now().toString(), name: '', quantity: 1, cost: 0 }]);
    const [billImageUrl, setBillImageUrl] = useState<string | undefined>(undefined);
    const [singleCost, setSingleCost] = useState<string>('');
    
    const selectedExpenseItem = expenseItems.find(e => e.name === primaryDescription);

    useEffect(() => {
        if (entryToEdit) {
            setDate(entryToEdit.date); // Use existing date string directly to avoid timezone issues
            setPrimaryDescription(entryToEdit.primaryDescription);
            setItems(entryToEdit.items.length > 0 ? entryToEdit.items : [{ id: Date.now().toString(), name: '', quantity: 1, cost: 0 }]);
            setBillImageUrl(entryToEdit.billImageUrl);
            if (entryToEdit.items.length === 1 && !expenseItems.find(e => e.name === entryToEdit.primaryDescription)?.allowSubItems) {
                setSingleCost(entryToEdit.items[0].cost.toString());
            } else {
                setSingleCost('');
            }
        } else {
            // Reset to today's date for new entries
            setDate(getTodayDateString());
            setPrimaryDescription('');
            setItems([{ id: Date.now().toString(), name: '', quantity: 1, cost: 0 }]);
            setBillImageUrl(undefined);
            setSingleCost('');
        }
    }, [entryToEdit, isOpen, expenseItems]);

    const handlePrimaryDescriptionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const newDescription = e.target.value;
        setPrimaryDescription(newDescription);
        const selected = expenseItems.find(i => i.name === newDescription);
        
        setSingleCost('');
        if (!selected?.allowSubItems) {
            setItems([{ id: Date.now().toString(), name: newDescription, quantity: 1, cost: 0 }]);
        } else {
            setItems([{ id: Date.now().toString(), name: '', quantity: 1, cost: 0 }]);
        }
    };

    const handleItemChange = (id: string, field: 'name' | 'quantity' | 'cost', value: string | number) => {
        setItems(currentItems => currentItems.map(item => item.id === id ? { ...item, [field]: value } : item));
    };

    const handleAddItem = () => {
        setItems([...items, { id: Date.now().toString(), name: '', quantity: 1, cost: 0 }]);
    };

    const handleRemoveItem = (id: string) => {
        if (items.length > 1) {
            setItems(items.filter(item => item.id !== id));
        } else {
            alert("You must have at least one item.");
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setBillImageUrl(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        if (!date || !primaryDescription) {
            alert('Please provide a date and select a primary item.');
            return;
        }

        let finalItems: StockItem[];

        if (selectedExpenseItem?.allowSubItems) {
            finalItems = items.filter(item => item.name.trim() !== '' && (item.cost || 0) > 0 && (item.quantity || 0) > 0);
            if (finalItems.length === 0) {
                alert('Please add at least one valid sub-item with a name, quantity, and cost.');
                return;
            }
        } else {
            const cost = parseFloat(singleCost);
            if (isNaN(cost) || cost <= 0) {
                alert('Please enter a valid cost.');
                return;
            }
            finalItems = [{ id: Date.now().toString(), name: primaryDescription, quantity: 1, cost }];
        }
        
        onSave({ date, primaryDescription, items: finalItems, billImageUrl }, entryToEdit?.id);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">{entryToEdit ? 'Edit Purchase' : 'Add New Purchase'}</h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><XIcon className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label htmlFor="date" className="block text-sm font-medium">Date</label>
                            <input id="date" type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1 w-full p-2 border rounded-md" required />
                        </div>
                         <div>
                            <label htmlFor="primary-item" className="block text-sm font-medium text-gray-700">Primary Item</label>
                            <select
                                id="primary-item"
                                value={primaryDescription}
                                onChange={handlePrimaryDescriptionChange}
                                className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm bg-white"
                                required
                            >
                                <option value="" disabled>-- Select an item --</option>
                                {expenseItems.map(item => (
                                    <option key={item.id} value={item.name}>{item.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    
                    {primaryDescription && (
                        <div>
                            {selectedExpenseItem?.allowSubItems ? (
                                <>
                                    <h3 className="text-lg font-semibold mb-2">Sub-Items</h3>
                                    <div className="space-y-2">
                                        {items.map((item, index) => {
                                            const hasPredefinedSubItems = selectedExpenseItem?.subItems && selectedExpenseItem.subItems.length > 0;
                                            const dataListId = `subitems-for-${selectedExpenseItem.id}`;
                                            return(
                                            <div key={item.id} className="grid grid-cols-12 gap-2 items-center">
                                                {hasPredefinedSubItems ? (
                                                    <>
                                                        <input
                                                            list={dataListId}
                                                            value={item.name}
                                                            onChange={e => handleItemChange(item.id, 'name', e.target.value)}
                                                            className="p-2 border rounded-md col-span-5"
                                                            placeholder="Select or type sub-item"
                                                        />
                                                        <datalist id={dataListId}>
                                                            {selectedExpenseItem.subItems!.map(subItem => (
                                                                <option key={subItem} value={subItem} />
                                                            ))}
                                                        </datalist>
                                                    </>
                                                ) : (
                                                    <input type="text" placeholder={`Sub-Item Name #${index + 1}`} value={item.name} onChange={e => handleItemChange(item.id, 'name', e.target.value)} className="p-2 border rounded-md col-span-5" />
                                                )}

                                                <input type="number" placeholder="Qty" value={item.quantity || ''} onChange={e => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)} className="p-2 border rounded-md col-span-3" min="1" step="1"/>
                                                <input type="number" placeholder="Cost" value={item.cost || ''} onChange={e => handleItemChange(item.id, 'cost', parseFloat(e.target.value) || 0)} className="p-2 border rounded-md col-span-3" min="0" step="0.01"/>
                                                <button type="button" onClick={() => handleRemoveItem(item.id)} className="p-2 text-red-500 hover:bg-red-100 rounded-full col-span-1 disabled:opacity-50" disabled={items.length <= 1}><TrashIcon className="w-5 h-5"/></button>
                                            </div>
                                            )
                                        })}
                                    </div>
                                    <button type="button" onClick={handleAddItem} className="mt-2 flex items-center text-sm text-purple-600 font-semibold hover:underline">
                                        <PlusIcon className="w-4 h-4 mr-1" /> Add another sub-item
                                    </button>
                                </>
                            ) : (
                                <div>
                                    <label htmlFor="total-cost" className="block text-sm font-medium text-gray-700">Total Cost (₹)</label>
                                    <input
                                        type="number"
                                        id="total-cost"
                                        value={singleCost}
                                        onChange={(e) => setSingleCost(e.target.value)}
                                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500 sm:text-sm"
                                        placeholder="e.g., 15000"
                                        required
                                        min="0.01"
                                        step="0.01"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                     <div>
                        <label className="block text-sm font-medium text-gray-700">Attach Bill/Receipt (Optional)</label>
                        <div className="mt-1 flex items-center justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md">
                           {billImageUrl ? (
                                <div className="text-center">
                                    <img src={billImageUrl} alt="Receipt preview" className="max-h-40 mx-auto mb-2"/>
                                    <button onClick={() => setBillImageUrl(undefined)} className="text-sm text-red-500">Remove</button>
                                </div>
                           ) : (
                             <div className="space-y-1 text-center">
                                <UploadIcon className="mx-auto h-12 w-12 text-gray-400"/>
                                <div className="flex text-sm text-gray-600">
                                <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-purple-600 hover:text-purple-500 focus-within:outline-none">
                                    <span>Upload a file</span>
                                    <input id="file-upload" name="file-upload" type="file" className="sr-only" accept="image/*" capture="environment" onChange={handleFileChange} />
                                </label>
                                <p className="pl-1">or use camera</p>
                                </div>
                                <p className="text-xs text-gray-500">PNG, JPG up to 10MB</p>
                            </div>
                           )}
                        </div>
                    </div>
                </form>
                <div className="p-4 bg-gray-50 border-t flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" onClick={handleSubmit} className="py-2 px-4 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700">
                        {entryToEdit ? 'Save Changes' : 'Save Entry'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AddStockEntryModal;