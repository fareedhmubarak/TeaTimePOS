import React, { useState, useEffect } from 'react';
import { XIcon } from './Icons.tsx';
import { supabase } from '../supabaseClient.ts';

interface DataEntryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (formData: any) => void;
    columns: string[];
    initialData: any | null;
    tableName: string;
}

// Columns that shouldn't be user-editable
const IGNORED_COLUMNS = ['id', 'created_at', 'invoice_number'];

const DataEntryModal: React.FC<DataEntryModalProps> = ({ isOpen, onClose, onSave, columns, initialData, tableName }) => {
    const [formData, setFormData] = useState<any>({});
    const [fkOptions, setFkOptions] = useState<{ [key: string]: { id: any; label: string }[] }>({});
    const [fkLoading, setFkLoading] = useState<{ [key: string]: boolean }>({});

    const editableColumns = columns.filter(col => !IGNORED_COLUMNS.includes(col));

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            const emptyForm: { [key: string]: any } = {};
            editableColumns.forEach(col => {
                // Provide better defaults for new rows
                if (col === 'allow_sub_items') {
                    emptyForm[col] = false;
                } else if (tableName === 'expense_items' && col === 'category') {
                    emptyForm[col] = 'Daily';
                }
                else {
                    emptyForm[col] = '';
                }
            });
            setFormData(emptyForm);
        }
    }, [initialData, columns, isOpen, tableName]);

    useEffect(() => {
        if (!isOpen) {
            setFkOptions({});
            setFkLoading({});
            return;
        };

        const fetchForeignKeyData = async () => {
            for (const col of editableColumns) {
                const match = col.match(/^(\w+)_id$/);
                if (match) {
                    const singular = match[1];
                    let targetTable = '';

                    // Simple pluralization and handling for compound names
                    if (singular === 'purchase_entry') {
                        targetTable = 'purchase_entries';
                    } else if (singular.endsWith('y')) {
                        targetTable = singular.slice(0, -1) + 'ies';
                    } else {
                        targetTable = singular + 's';
                    }
                    
                    setFkLoading(prev => ({ ...prev, [col]: true }));

                    const { data, error } = await supabase
                        .from(targetTable)
                        .select('id, name, title, description, primary_description')
                        .limit(1000);

                    if (data) {
                        const options = data.map(item => ({
                            id: item.id,
                            label: item.name || item.title || item.description || item.primary_description || `ID: ${item.id}`
                        })).sort((a,b) => a.label.localeCompare(b.label));
                        setFkOptions(prev => ({ ...prev, [col]: options }));
                    }
                    setFkLoading(prev => ({ ...prev, [col]: false }));
                }
            }
        };

        fetchForeignKeyData();
    }, [isOpen, editableColumns]);

    if (!isOpen) return null;

    const handleChange = (key: string, value: any) => {
        setFormData((prev: any) => ({ ...prev, [key]: value }));
    };
    
    const handleJsonChange = (key: string, value: string) => {
        // Keep the string in state for textarea, attempt to parse on save.
        setFormData((prev: any) => ({ ...prev, [key]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        // Final data processing before saving
        const finalData = { ...formData };
        for (const key in finalData) {
            // Attempt to parse any JSON textareas
            if (typeof finalData[key] === 'string' && finalData[key].startsWith('{') || finalData[key].startsWith('[')) {
                try {
                    finalData[key] = JSON.parse(finalData[key]);
                } catch (err) {
                    // Ignore if it's not valid JSON, send as string
                }
            }
            // Ensure foreign keys are numbers
            if(key.endsWith('_id') && finalData[key] !== null && finalData[key] !== '') {
                finalData[key] = parseInt(finalData[key], 10);
            }
        }
        onSave(finalData);
    };

    const renderInput = (key: string) => {
        const value = formData[key];
        
        // Special case for expense_items category
        if (tableName === 'expense_items' && key === 'category') {
            return (
                <select
                    value={value ?? 'Daily'}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="mt-1 w-full p-2 border rounded-md bg-white"
                >
                    <option value="Daily">Daily</option>
                    <option value="Monthly">Monthly</option>
                </select>
            );
        }

        // Foreign Key Dropdown
        if (fkOptions[key]) {
            return (
                <select
                    value={value ?? ''}
                    onChange={(e) => handleChange(key, e.target.value)}
                    className="mt-1 w-full p-2 border rounded-md bg-white"
                    disabled={fkLoading[key]}
                >
                    {fkLoading[key] ? <option>Loading...</option> : <option value="">-- Select --</option>}
                    {fkOptions[key].map(opt => (
                        <option key={opt.id} value={opt.id}>{opt.label}</option>
                    ))}
                </select>
            );
        }

        // Boolean Checkbox
        if (typeof value === 'boolean') {
            return <input type="checkbox" checked={!!value} onChange={(e) => handleChange(key, e.target.checked)} className="mt-2 h-5 w-5 rounded border-gray-300 text-purple-600 focus:ring-purple-600" />;
        }
        
        // JSON Textarea
        if (typeof value === 'object' && value !== null) {
            const displayValue = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
            return <textarea value={displayValue} onChange={(e) => handleJsonChange(key, e.target.value)} className="mt-1 w-full p-2 border rounded-md font-mono text-xs" rows={5} />;
        }
        
        const isNumberColumn = typeof initialData?.[key] === 'number';
        const isForeignKey = key.endsWith('_id') || key.endsWith('_fkey');
        
        return <input type={isNumberColumn || isForeignKey ? "number" : "text"} value={value ?? ''} onChange={(e) => handleChange(key, e.target.value)} className="mt-1 w-full p-2 border rounded-md" />;
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h2 className="text-xl font-bold text-gray-800">
                        {initialData ? `Editing row ${initialData.id} in ` : 'Add new row to '}
                        <span className="font-mono text-purple-700">{tableName}</span>
                    </h2>
                    <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full"><XIcon className="w-5 h-5" /></button>
                </div>
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
                    {editableColumns.map(key => (
                        <div key={key}>
                            <label htmlFor={key} className="block text-sm font-medium text-gray-700 font-mono">{key}</label>
                            {renderInput(key)}
                        </div>
                    ))}
                </form>
                <div className="p-4 bg-gray-50 border-t flex justify-end space-x-2">
                    <button type="button" onClick={onClose} className="py-2 px-4 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">Cancel</button>
                    <button type="submit" onClick={handleSubmit} className="py-2 px-4 bg-purple-600 text-white font-semibold rounded-md hover:bg-purple-700">
                        {initialData ? 'Save Changes' : 'Create Row'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataEntryModal;