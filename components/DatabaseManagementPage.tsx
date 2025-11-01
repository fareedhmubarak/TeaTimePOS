import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient.ts';
import { PlusIcon, SearchIcon } from './Icons.tsx';
import DataTable from './DataTable.tsx';
import DataEntryModal from './DataEntryModal.tsx';

type SortConfig = {
    key: string;
    direction: 'ascending' | 'descending';
} | null;

const ITEMS_PER_PAGE = 15;

// Detect column data type by analyzing sample data
const detectColumnType = (column: string, tableData: any[]): 'date' | 'number' | 'boolean' | 'text' => {
    if (tableData.length === 0) return 'text';
    
    // Check column name for hints
    const lowerColumn = column.toLowerCase();
    if (lowerColumn.includes('date') || lowerColumn.includes('time') || lowerColumn === 'created_at' || lowerColumn === 'updated_at') {
        // Check if values are actually date strings
        const sample = tableData.find(row => row[column] != null);
        if (sample) {
            const value = sample[column];
            // Check if it's an ISO date string or date-like
            if (typeof value === 'string' && (value.includes('T') || value.match(/^\d{4}-\d{2}-\d{2}/))) {
                return 'date';
            }
        }
    }
    
    // Analyze actual data types
    const samples = tableData.slice(0, 10).map(row => row[column]).filter(v => v != null);
    if (samples.length === 0) return 'text';
    
    const firstValue = samples[0];
    
    // Check for boolean
    if (typeof firstValue === 'boolean' || samples.every(v => v === true || v === false || v === 'true' || v === 'false')) {
        return 'boolean';
    }
    
    // Check for number
    if (typeof firstValue === 'number' || samples.every(v => typeof v === 'number' || (!isNaN(parseFloat(String(v))) && isFinite(Number(v))))) {
        return 'number';
    }
    
    // Check for date (ISO strings, date strings)
    if (typeof firstValue === 'string') {
        const datePattern = /^\d{4}-\d{2}-\d{2}/;
        const isoPattern = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;
        if (samples.every(v => {
            const str = String(v);
            return datePattern.test(str) || isoPattern.test(str);
        })) {
            return 'date';
        }
    }
    
    return 'text';
};

interface DatabaseManagementPageProps {
    onNavigate?: (view: 'home' | 'pos' | 'admin') => void;
    onViewInvoice?: (invoiceNumber: number) => void;
}

const DatabaseManagementPage: React.FC<DatabaseManagementPageProps> = ({ onNavigate, onViewInvoice }) => {
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [tableData, setTableData] = useState<any[]>([]);
    const [columns, setColumns] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [modalState, setModalState] = useState<{ isOpen: boolean, data: any | null }>({ isOpen: false, data: null });
    const [searchTerm, setSearchTerm] = useState('');
    const [columnFilters, setColumnFilters] = useState<{ [key: string]: string }>({});
    const [sortConfig, setSortConfig] = useState<SortConfig>(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        const fetchTableNames = async () => {
            setLoading(true);
            const { data, error } = await supabase.rpc('get_public_tables');
            if (error) {
                setError('Could not fetch table list. Please ensure the `get_public_tables` function exists in your Supabase SQL editor.');
                console.error(error);
            } else {
                setTables(data.map((t: any) => t.table_name));
                if (data.length > 0) {
                    setSelectedTable(data[0].table_name);
                }
            }
            setLoading(false);
        };
        fetchTableNames();
    }, []);

    // Calculate daily invoice numbers (same logic as App.tsx)
    const calculateDailyInvoiceNumbersForTable = (invoices: any[]): Map<number, number> => {
        const invoicesByDate: { [date: string]: any[] } = {};
        
        invoices.forEach(invoice => {
            const recordDate = invoice.bill_date ? new Date(invoice.bill_date) : new Date(invoice.created_at);
            const timestamp = recordDate.getTime() + (invoice.bill_date ? recordDate.getTimezoneOffset() * 60000 : 0);
            const date = new Date(timestamp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
            
            if (!invoicesByDate[date]) {
                invoicesByDate[date] = [];
            }
            invoicesByDate[date].push(invoice);
        });
        
        const dbIdToDailyNumber = new Map<number, number>();
        
        Object.values(invoicesByDate).forEach(dateInvoices => {
            dateInvoices.sort((a, b) => a.id - b.id);
            dateInvoices.forEach((invoice, index) => {
                dbIdToDailyNumber.set(invoice.id, index + 1);
            });
        });
        
        return dbIdToDailyNumber;
    };

    useEffect(() => {
        const fetchTableData = async () => {
            if (!selectedTable) return;

            setLoading(true);
            setError(null);
            setTableData([]);
            setColumns([]);
            setCurrentPage(1);
            setSortConfig(null);
            setSearchTerm('');
            setColumnFilters({});

            const { data, error } = await supabase.from(selectedTable).select('*').order('id', { ascending: false });

            if (error) {
                setError(`Error fetching data from ${selectedTable}: ${error.message}`);
                console.error(error);
            } else {
                let processedData = data || [];
                
                // Special handling for invoices table - add computed invoice_number column
                if (selectedTable === 'invoices' && processedData.length > 0) {
                    const dbIdToDailyNumber = calculateDailyInvoiceNumbersForTable(processedData);
                    processedData = processedData.map(invoice => ({
                        ...invoice,
                        invoice_number: dbIdToDailyNumber.get(invoice.id) || invoice.id
                    }));
                }
                
                setTableData(processedData);
                if (processedData.length > 0) {
                    // Put invoice_number first if it exists
                    const keys = Object.keys(processedData[0]);
                    if (keys.includes('invoice_number')) {
                        setColumns(['invoice_number', ...keys.filter(k => k !== 'invoice_number')]);
                    } else {
                        setColumns(keys);
                    }
                }
            }
            setLoading(false);
        };
        fetchTableData();
    }, [selectedTable]);
    
    const handleSort = (key: string) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleDelete = async (row: any) => {
        if (!window.confirm(`Are you sure you want to delete row with id ${row.id} from ${selectedTable}? This cannot be undone.`)) {
            return;
        }
        setLoading(true);
        const { error } = await supabase.from(selectedTable).delete().eq('id', row.id);
        if (error) {
            alert(`Failed to delete row: ${error.message}`);
            setError(error.message);
        } else {
            setTableData(prev => prev.filter(item => item.id !== row.id));
        }
        setLoading(false);
    };

    const handleSave = async (formData: any) => {
        setLoading(true);
        const isEditing = modalState.data && modalState.data.id;
        
        const sanitizedData = { ...formData };

        // When editing, remove fields that should not be updated.
        // 'created_at' is managed by the DB, and 'id' is the primary key.
        if (isEditing) {
            delete sanitizedData.id;
            delete sanitizedData.created_at; 
        }
    
        const query = isEditing
            ? supabase.from(selectedTable).update(sanitizedData).eq('id', modalState.data.id)
            : supabase.from(selectedTable).insert(sanitizedData);
    
        // Use .select().single() to get the new/updated data back and handle errors
        const { data: savedData, error: saveError } = await query.select().single();
    
        if (saveError) {
            alert(`Failed to save: ${saveError.message}`);
            setError(saveError.message);
            setLoading(false);
            return;
        }
    
        if (savedData) {
            if (isEditing) {
                // Update the single row in the local state for better performance
                setTableData(prev => prev.map(item => item.id === savedData.id ? savedData : item));
            } else {
                // Add the new row to the top of the local state
                setTableData(prev => [savedData, ...prev]);
            }
        } else {
            // Fallback to refetching if savedData is not returned for some reason
            const { data: refreshedData, error: fetchError } = await supabase.from(selectedTable).select('*').order('id', { ascending: false });
            if (fetchError) {
                setError(fetchError.message);
            } else {
                setTableData(refreshedData || []);
            }
        }
    
        setModalState({ isOpen: false, data: null });
        setLoading(false);
    };

    const filteredData = useMemo(() => {
        let filtered = [...tableData];
        
        // Apply global search
        if (searchTerm) {
            const lowercasedTerm = searchTerm.toLowerCase();
            filtered = filtered.filter(row =>
                Object.values(row).some(value =>
                    String(value).toLowerCase().includes(lowercasedTerm)
                )
            );
        }
        
        // Apply column-specific filters
        Object.entries(columnFilters).forEach(([column, filterValue]) => {
            if (!filterValue || (typeof filterValue === 'string' && filterValue.trim() === '')) return;
            
            const columnType = detectColumnType(column, tableData);
            
            filtered = filtered.filter(row => {
                const cellValue = row[column];
                
                // Handle different data types
                if (columnType === 'date') {
                    if (!filterValue) return true;
                    const filterDate = new Date(filterValue).toISOString().split('T')[0];
                    if (cellValue === null || cellValue === undefined) return false;
                    
                    // Try to parse the cell value as a date
                    let cellDateStr: string;
                    if (cellValue instanceof Date) {
                        cellDateStr = cellValue.toISOString().split('T')[0];
                    } else if (typeof cellValue === 'string') {
                        // Handle ISO datetime strings
                        if (cellValue.includes('T')) {
                            cellDateStr = cellValue.split('T')[0];
                        } else {
                            cellDateStr = cellValue.split(' ')[0];
                        }
                    } else {
                        return false;
                    }
                    
                    return cellDateStr === filterDate;
                }
                
                if (columnType === 'number') {
                    if (!filterValue) return true;
                    const numValue = parseFloat(filterValue);
                    if (isNaN(numValue)) return String(cellValue).includes(filterValue);
                    
                    if (cellValue === null || cellValue === undefined) return false;
                    const cellNum = typeof cellValue === 'number' ? cellValue : parseFloat(String(cellValue));
                    
                    return !isNaN(cellNum) && cellNum === numValue;
                }
                
                if (columnType === 'boolean') {
                    if (!filterValue) return true;
                    if (cellValue === null || cellValue === undefined) return false;
                    
                    const cellBool = typeof cellValue === 'boolean' ? cellValue : cellValue === 'true' || cellValue === true;
                    const filterBool = filterValue === 'true';
                    
                    return cellBool === filterBool;
                }
                
                // Text matching (case-insensitive)
                if (cellValue === null || cellValue === undefined) return false;
                const lowercasedFilter = filterValue.toLowerCase();
                return String(cellValue).toLowerCase().includes(lowercasedFilter);
            });
        });
        
        return filtered;
    }, [tableData, searchTerm, columnFilters]);

    const sortedData = useMemo(() => {
        let sortableItems = [...filteredData];
        if (sortConfig !== null) {
            sortableItems.sort((a, b) => {
                const valA = a[sortConfig.key];
                const valB = b[sortConfig.key];

                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;
                
                if (valA < valB) {
                    return sortConfig.direction === 'ascending' ? -1 : 1;
                }
                if (valA > valB) {
                    return sortConfig.direction === 'ascending' ? 1 : -1;
                }
                return 0;
            });
        }
        return sortableItems;
    }, [filteredData, sortConfig]);
    
    const paginatedData = useMemo(() => {
        const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
        return sortedData.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [sortedData, currentPage]);
    
    const totalPages = Math.ceil(sortedData.length / ITEMS_PER_PAGE);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <div>
                    <h1 className="text-3xl font-bold text-gray-800">Database Management</h1>
                    {sortConfig && (
                        <p className="text-sm text-gray-600 mt-1">
                            Sorted by: <span className="font-semibold">{sortConfig.key}</span> ({sortConfig.direction})
                        </p>
                    )}
                </div>
                <div className="flex items-center space-x-2">
                    <select
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        className="bg-white border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                        disabled={loading}
                    >
                        {tables.map(table => <option key={table} value={table}>{table}</option>)}
                    </select>
                     <button onClick={() => setModalState({ isOpen: true, data: null })} className="flex items-center bg-purple-600 text-white font-semibold py-2 px-4 rounded-lg shadow hover:bg-purple-700 transition-colors disabled:bg-gray-400" disabled={!selectedTable || loading}>
                        <PlusIcon className="w-5 h-5 mr-2" />
                        Add Row
                    </button>
                </div>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <div className="relative flex-1">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <SearchIcon className="h-5 w-5 text-gray-400" />
                        </div>
                        <input
                            type="text"
                            placeholder={`Search all columns in ${selectedTable || 'table'}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="block w-full bg-white border border-gray-300 rounded-md py-2 pl-10 pr-4"
                            disabled={!selectedTable || loading}
                        />
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`px-4 py-2 rounded-md border transition-colors whitespace-nowrap ${
                            showFilters 
                                ? 'bg-purple-600 text-white border-purple-600' 
                                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                        } ${(!selectedTable || loading || columns.length === 0) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        disabled={!selectedTable || loading || columns.length === 0}
                        title={columns.length === 0 ? 'Load a table first' : showFilters ? 'Hide column filters' : 'Show column filters for each column'}
                    >
                        {showFilters ? 'Hide Filters' : 'Show Column Filters'}
                    </button>
                    <div className="flex items-center gap-2">
                        {sortConfig && (
                            <button
                                onClick={() => setSortConfig(null)}
                                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors text-sm whitespace-nowrap"
                                title={`Clear sort (currently sorting by ${sortConfig.key} ${sortConfig.direction})`}
                            >
                                Clear Sort
                            </button>
                        )}
                        {Object.keys(columnFilters).some(key => columnFilters[key].trim() !== '') && (
                            <button
                                onClick={() => setColumnFilters({})}
                                className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors text-sm whitespace-nowrap"
                            >
                                Clear Filters
                            </button>
                        )}
                    </div>
                </div>
                
                {showFilters && columns.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">Column Filters</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {columns.map(col => {
                                const columnType = detectColumnType(col, tableData);
                                
                                return (
                                    <div key={col} className="flex flex-col">
                                        <label className="text-xs font-medium text-gray-600 mb-1">
                                            {col}
                                            <span className="ml-1 text-xs text-gray-400">({columnType})</span>
                                        </label>
                                        
                                        {columnType === 'date' && (
                                            <input
                                                type="date"
                                                value={columnFilters[col] || ''}
                                                onChange={(e) => setColumnFilters(prev => ({
                                                    ...prev,
                                                    [col]: e.target.value
                                                }))}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            />
                                        )}
                                        
                                        {columnType === 'number' && (
                                            <input
                                                type="number"
                                                placeholder={`Filter ${col}...`}
                                                value={columnFilters[col] || ''}
                                                onChange={(e) => setColumnFilters(prev => ({
                                                    ...prev,
                                                    [col]: e.target.value
                                                }))}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                                step="any"
                                            />
                                        )}
                                        
                                        {columnType === 'boolean' && (
                                            <select
                                                value={columnFilters[col] || ''}
                                                onChange={(e) => setColumnFilters(prev => ({
                                                    ...prev,
                                                    [col]: e.target.value
                                                }))}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                                            >
                                                <option value="">All</option>
                                                <option value="true">True</option>
                                                <option value="false">False</option>
                                            </select>
                                        )}
                                        
                                        {columnType === 'text' && (
                                            <input
                                                type="text"
                                                placeholder={`Filter ${col}...`}
                                                value={columnFilters[col] || ''}
                                                onChange={(e) => setColumnFilters(prev => ({
                                                    ...prev,
                                                    [col]: e.target.value
                                                }))}
                                                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                                            />
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
            
            {loading && <div className="text-center py-8">Loading...</div>}
            {error && <div className="bg-red-100 text-red-700 p-4 rounded-md">{error}</div>}

            {!loading && !error && selectedTable && columns.length > 0 && (
                <div className="space-y-4">
                    <div className="flex justify-between items-center text-sm text-gray-600">
                        <div>
                            Showing <span className="font-semibold">{paginatedData.length}</span> of <span className="font-semibold">{sortedData.length}</span> results
                            {tableData.length !== sortedData.length && (
                                <span> (filtered from <span className="font-semibold">{tableData.length}</span> total rows)</span>
                            )}
                        </div>
                        <div className="text-gray-500 text-xs">
                            💡 Click column headers to sort • Use filters above to filter data
                        </div>
                    </div>
                    <DataTable 
                    columns={columns}
                    data={paginatedData}
                    sortConfig={sortConfig}
                    onSort={handleSort}
                    onEdit={(row) => setModalState({ isOpen: true, data: row })}
                    onDelete={handleDelete}
                    onViewInvoice={selectedTable === 'invoices' && onViewInvoice ? (row) => {
                        // Use the invoice_number which is the daily invoice number
                        const invoiceNumber = row.invoice_number;
                        if (invoiceNumber && onNavigate && onViewInvoice) {
                            // Extract date and timestamp from the invoice row
                            const recordDate = row.bill_date ? new Date(row.bill_date) : new Date(row.created_at);
                            const timestamp = recordDate.getTime() + (row.bill_date ? recordDate.getTimezoneOffset() * 60000 : 0);
                            const date = new Date(timestamp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
                            
                            onNavigate('pos');
                            onViewInvoice(invoiceNumber, date, timestamp);
                        }
                    } : undefined}
                    />
                </div>
            )}
            
            {totalPages > 1 && (
                <div className="flex justify-between items-center mt-4">
                    <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50">Previous</button>
                    <span>Page {currentPage} of {totalPages}</span>
                    <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-4 py-2 bg-gray-200 rounded-md disabled:opacity-50">Next</button>
                </div>
            )}
            
            {modalState.isOpen && (
                <DataEntryModal 
                    isOpen={modalState.isOpen}
                    onClose={() => setModalState({ isOpen: false, data: null })}
                    onSave={handleSave}
                    columns={columns}
                    initialData={modalState.data}
                    tableName={selectedTable}
                />
            )}
        </div>
    );
};

export default DatabaseManagementPage;