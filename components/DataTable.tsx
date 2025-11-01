import React from 'react';
import { PencilIcon, TrashIcon, ArrowUpIcon, ArrowDownIcon } from './Icons.tsx';

type SortConfig = {
    key: string;
    direction: 'ascending' | 'descending';
} | null;

interface DataTableProps {
    columns: string[];
    data: any[];
    sortConfig: SortConfig;
    onSort: (key: string) => void;
    onEdit: (row: any) => void;
    onDelete: (row: any) => void;
    onViewInvoice?: (row: any) => void;
}

const DataTable: React.FC<DataTableProps> = ({ columns, data, sortConfig, onSort, onEdit, onDelete, onViewInvoice }) => {

    const renderValue = (value: any) => {
        if (value === null || typeof value === 'undefined') return <span className="text-gray-400">NULL</span>;
        if (typeof value === 'boolean') return value ? 'true' : 'false';
        if (typeof value === 'object') return <pre className="bg-gray-100 p-1 rounded text-xs max-w-xs overflow-x-auto">{JSON.stringify(value, null, 2)}</pre>;
        const strValue = String(value);
        if (strValue.length > 50) {
            return <span title={strValue}>{strValue.substring(0, 50)}...</span>;
        }
        return strValue;
    };

    if (data.length === 0) {
        return <div className="text-center py-8 text-gray-500">No data found.</div>;
    }

    return (
        <div className="bg-white shadow-md rounded-lg overflow-x-auto">
            <div className="max-h-[65vh] overflow-y-auto">
                <table className="w-full text-sm text-left text-gray-500">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-100 sticky top-0">
                        <tr>
                            {columns.map(col => (
                                <th key={col} scope="col" className="px-6 py-3 cursor-pointer" onClick={() => onSort(col)}>
                                    <div className="flex items-center">
                                        {col}
                                        {sortConfig && sortConfig.key === col && (
                                            sortConfig.direction === 'ascending' 
                                            ? <ArrowUpIcon className="w-3 h-3 ml-1" /> 
                                            : <ArrowDownIcon className="w-3 h-3 ml-1" />
                                        )}
                                    </div>
                                </th>
                            ))}
                            <th scope="col" className="px-6 py-3 text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {data.map((row, rowIndex) => (
                            <tr key={row.id || rowIndex} className="bg-white border-b hover:bg-gray-50">
                                {columns.map(col => (
                                    <td key={col} className="px-6 py-4 align-top">{renderValue(row[col])}</td>
                                ))}
                                <td className="px-6 py-4 align-top">
                                    <div className="flex justify-center items-center space-x-2">
                                        {onViewInvoice && (
                                            <button 
                                                onClick={() => onViewInvoice(row)} 
                                                className="p-2 text-green-600 hover:bg-green-100 rounded-full" 
                                                aria-label={`View invoice ${row.invoice_number || row.id}`}
                                                title="View Invoice in Billing Screen"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                </svg>
                                            </button>
                                        )}
                                        <button onClick={() => onEdit(row)} className="p-2 text-blue-600 hover:bg-blue-100 rounded-full" aria-label={`Edit row ${row.id}`}>
                                            <PencilIcon className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => onDelete(row)} className="p-2 text-red-600 hover:bg-red-100 rounded-full" aria-label={`Delete row ${row.id}`}>
                                            <TrashIcon className="w-4 h-4" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default DataTable;