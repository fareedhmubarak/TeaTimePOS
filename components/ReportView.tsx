import React, { useMemo, useState, useEffect } from 'react';
import { BilledItem, Expense, StockEntry, ExpenseItem } from '../types.ts';
import OrdersByTimeChart from './OrdersByTimeChart.tsx';
import RevenueByHourChart from './RevenueByHourChart.tsx';
import ExpenseDetailModal from './ExpenseDetailModal.tsx';
import { supabase } from '../supabaseClient.ts';

interface ReportViewProps {
  billedItems: BilledItem[];
  expenses: Expense[];
  stockEntries: StockEntry[];
  expenseItems: ExpenseItem[];
  startDate: string;
  endDate: string;
  title: string;
  reportType: 'daily' | 'monthly' | 'range';
}

// Helper function to get the number of days in a month for a given date
const getDaysInMonth = (date: Date): number => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
};

// Helper to parse YYYY-MM-DD to a Date object at the start of the day (midnight)
const parseDateString = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    // Setting time to 00:00:00 to ensure comparisons work correctly for the first day.
    return new Date(year, month - 1, day, 0, 0, 0);
};

const ReportView: React.FC<ReportViewProps> = ({ billedItems, expenses, stockEntries, expenseItems, startDate, endDate, title, reportType }) => {
    const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
    const [typeFilter, setTypeFilter] = useState<'both' | 'Daily' | 'Monthly' | 'Purchase'>('both');
    const [descriptionFilter, setDescriptionFilter] = useState<string>('all');
    const [productNameFilter, setProductNameFilter] = useState<string>('all');
    const [itemForOrdersChart, setItemForOrdersChart] = useState<string>('all');
    const [invoiceCount, setInvoiceCount] = useState<number>(0);

    // Fetch invoice count directly from database for accurate counting
    useEffect(() => {
        const fetchInvoiceCount = async () => {
            try {
                // Parse dates from M/D/YYYY format (from ReportsPage) or YYYY-MM-DD format
                let reportStart: Date;
                let reportEnd: Date;
                
                // Check if date is in M/D/YYYY format
                if (startDate.includes('/')) {
                    const [month, day, year] = startDate.split('/').map(Number);
                    reportStart = new Date(year, month - 1, day);
                } else {
                    reportStart = new Date(startDate);
                }
                
                if (endDate.includes('/')) {
                    const [month, day, year] = endDate.split('/').map(Number);
                    reportEnd = new Date(year, month - 1, day);
                } else {
                    reportEnd = new Date(endDate);
                }
                
                // Format dates for database query (YYYY-MM-DD) using local date, not UTC
                const startYear = reportStart.getFullYear();
                const startMonth = String(reportStart.getMonth() + 1).padStart(2, '0');
                const startDay = String(reportStart.getDate()).padStart(2, '0');
                const startDateStr = `${startYear}-${startMonth}-${startDay}`;
                
                const endYear = reportEnd.getFullYear();
                const endMonth = String(reportEnd.getMonth() + 1).padStart(2, '0');
                const endDay = String(reportEnd.getDate()).padStart(2, '0');
                const endDateStr = `${endYear}-${endMonth}-${endDay}`;
                
                // Query invoices by bill_date (preferred) or created_at date part
                // For daily reports, startDateStr === endDateStr
                const { data, error } = await supabase
                    .from('invoices')
                    .select('id, bill_date, created_at');
                
                if (!error && data) {
                    // Filter invoices that fall within the date range
                    const filtered = data.filter(invoice => {
                        // Use bill_date if available, otherwise use created_at date part
                        const invoiceDate = invoice.bill_date || invoice.created_at.split('T')[0];
                        return invoiceDate >= startDateStr && invoiceDate <= endDateStr;
                    });
                    setInvoiceCount(filtered.length);
                } else if (error) {
                    console.error('Error fetching invoice count:', error);
                    // Fallback to billedItems count
                    const uniqueInvoiceNumbers = new Set<number>();
                    billedItems.forEach(item => {
                        const [month, day, year] = item.date.split('/').map(Number);
                        const itemDate = new Date(year, month - 1, day);
                        const reportStartDateOnly = new Date(reportStart.getFullYear(), reportStart.getMonth(), reportStart.getDate());
                        const reportEndDateOnly = new Date(reportEnd.getFullYear(), reportEnd.getMonth(), reportEnd.getDate(), 23, 59, 59);
                        if (itemDate >= reportStartDateOnly && itemDate <= reportEndDateOnly) {
                            uniqueInvoiceNumbers.add(item.invoiceNumber);
                        }
                    });
                    setInvoiceCount(uniqueInvoiceNumbers.size);
                }
            } catch (err) {
                console.error('Error fetching invoice count:', err);
                // Fallback to billedItems count
                const uniqueInvoiceNumbers = new Set<number>();
                billedItems.forEach(item => {
                    const [month, day, year] = item.date.split('/').map(Number);
                    const itemDate = new Date(year, month - 1, day);
                    // Parse dates from M/D/YYYY format
                    let reportStart: Date;
                    let reportEnd: Date;
                    if (startDate.includes('/')) {
                        const [m, d, y] = startDate.split('/').map(Number);
                        reportStart = new Date(y, m - 1, d);
                    } else {
                        reportStart = new Date(startDate);
                    }
                    if (endDate.includes('/')) {
                        const [m, d, y] = endDate.split('/').map(Number);
                        reportEnd = new Date(y, m - 1, d);
                    } else {
                        reportEnd = new Date(endDate);
                    }
                    const reportStartDateOnly = new Date(reportStart.getFullYear(), reportStart.getMonth(), reportStart.getDate());
                    const reportEndDateOnly = new Date(reportEnd.getFullYear(), reportEnd.getMonth(), reportEnd.getDate(), 23, 59, 59);
                    if (itemDate >= reportStartDateOnly && itemDate <= reportEndDateOnly) {
                        uniqueInvoiceNumbers.add(item.invoiceNumber);
                    }
                });
                setInvoiceCount(uniqueInvoiceNumbers.size);
            }
        };
        
        fetchInvoiceCount();
    }, [startDate, endDate, billedItems]);

    const {
        totalSales,
        totalOrders,
        profit,
        totalExpenses,
        remainingSale,
        itemsSold,
        allExpensesInRange,
        ordersByTime,
        revenueByHour,
        topItemsSold
    } = useMemo(() => {
        // Parse dates from M/D/YYYY format (from ReportsPage) or YYYY-MM-DD format
        let reportStart: Date;
        let reportEnd: Date;
        
        if (startDate.includes('/')) {
            const [month, day, year] = startDate.split('/').map(Number);
            reportStart = new Date(year, month - 1, day);
        } else {
            reportStart = new Date(startDate);
        }
        
        if (endDate.includes('/')) {
            const [month, day, year] = endDate.split('/').map(Number);
            reportEnd = new Date(year, month - 1, day);
        } else {
            reportEnd = new Date(endDate);
        }

        const reportStartDateOnly = new Date(reportStart.getFullYear(), reportStart.getMonth(), reportStart.getDate());
        const reportEndDateOnly = new Date(reportEnd.getFullYear(), reportEnd.getMonth(), reportEnd.getDate(), 23, 59, 59);
        
        const relevantBilledItems = billedItems.filter(item => {
            // Parse date string (M/D/YYYY format) to compare dates
            const [month, day, year] = item.date.split('/').map(Number);
            const itemDate = new Date(year, month - 1, day);
            const itemDateOnly = new Date(itemDate.getFullYear(), itemDate.getMonth(), itemDate.getDate());
            return itemDateOnly >= reportStartDateOnly && itemDateOnly <= reportEndDateOnly;
        });

        const totalSales = relevantBilledItems.reduce((sum, item) => sum + item.price, 0);
        const profit = relevantBilledItems.reduce((sum, item) => sum + item.profit, 0);
        
        // Count unique orders (invoices) in the date range
        // Use database invoice count if available, otherwise fallback to billedItems count
        const uniqueInvoiceNumbers = new Set<number>();
        relevantBilledItems.forEach(item => {
            uniqueInvoiceNumbers.add(item.invoiceNumber);
        });
        const totalOrders = invoiceCount > 0 ? invoiceCount : uniqueInvoiceNumbers.size;
        
        // --- EXPENSE CALCULATION LOGIC BASED ON REPORT TYPE ---

        // 1. Standard daily expenses from the expense modal
        const dailyExpensesFromModal = expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            return expenseDate >= reportStartDateOnly && expenseDate <= reportEndDateOnly;
        });
        const dailyExpensesTotal = dailyExpensesFromModal.reduce((sum, e) => sum + e.amount, 0);

        // Map expense item names to their category for quick lookup
        const expenseItemCategoryMap = new Map<string, 'Daily' | 'Monthly'>();
        expenseItems.forEach(item => {
            expenseItemCategoryMap.set(item.name, item.category);
        });
        
        // 2. Separate stock entries into daily and monthly
        const dailyPurchases: StockEntry[] = [];
        const monthlyPurchases: StockEntry[] = [];

        stockEntries.forEach(entry => {
            const category = expenseItemCategoryMap.get(entry.primaryDescription);
            if (category === 'Monthly') {
                monthlyPurchases.push(entry);
            } else {
                dailyPurchases.push(entry);
            }
        });

        // 3. Calculate total for daily purchases within the report range
        const relevantDailyPurchases = dailyPurchases.filter(entry => {
            const entryDate = parseDateString(entry.date);
            return entryDate >= reportStartDateOnly && entryDate <= reportEndDateOnly;
        });
        const dailyPurchasesTotal = relevantDailyPurchases.reduce((sum, e) => sum + (e.totalCost || 0), 0);

        // 4. Calculate expenses based on report type
        let totalExpenses = 0;
        let allExpensesInRange: any[] = [];

        if (reportType === 'daily') {
            // Daily: Show only daily expenses (daily expenses from modal + daily purchases)
            totalExpenses = dailyExpensesTotal + dailyPurchasesTotal;
            allExpensesInRange = [
                ...dailyExpensesFromModal.map(e => ({ 
                    description: e.description, 
                    amount: e.amount, 
                    quantity: '-', // Daily expenses don't have quantity
                    date: new Date(e.date).toLocaleDateString('en-CA'), 
                    type: 'Daily' 
                })),
                ...relevantDailyPurchases.map(e => {
                    // Calculate total quantity from items
                    const totalQuantity = (e.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
                    return {
                        description: e.primaryDescription || 'Purchase', 
                        amount: e.totalCost || 0,
                        quantity: totalQuantity > 0 ? totalQuantity : '-',
                        date: new Date(e.date + 'T12:00:00').toLocaleDateString('en-CA'), 
                        type: 'Purchase' 
                    };
                })
            ];
        } else {
            // Monthly or Range: Show daily expenses + monthly expenses (consolidated as single line items)
            // Calculate prorated monthly purchases for the total
            let proratedMonthlyTotal = 0;
            const consolidatedMonthlyEntries: any[] = [];
            
            // Process each monthly purchase entry separately (each entry = one line item)
            monthlyPurchases.forEach(entry => {
                const entryDate = parseDateString(entry.date);
                const endOfMonth = new Date(entryDate.getFullYear(), entryDate.getMonth() + 1, 0, 23, 59, 59);
                
                // Check if this entry overlaps with the report range
                const overlapStartDate = new Date(Math.max(entryDate.getTime(), reportStartDateOnly.getTime()));
                const overlapEndDate = new Date(Math.min(endOfMonth.getTime(), reportEndDateOnly.getTime()));
                
                if (overlapStartDate <= overlapEndDate) {
                    const daysInEntryMonth = getDaysInMonth(entryDate);
                    const remainingDaysInMonth = daysInEntryMonth - entryDate.getDate() + 1;
                    
                    if (remainingDaysInMonth > 0) {
                        const dailyProratedAmount = (entry.totalCost || 0) / remainingDaysInMonth;
                        const daysInOverlap = Math.floor((overlapEndDate.getTime() - overlapStartDate.getTime()) / (1000 * 3600 * 24)) + 1;
                        const proratedAmount = daysInOverlap * dailyProratedAmount;
                        
                        proratedMonthlyTotal += proratedAmount;
                        
                        // Calculate total quantity from items
                        const totalQuantity = (entry.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
                        
                        // Add as single consolidated entry
                        consolidatedMonthlyEntries.push({
                            description: entry.primaryDescription || 'Monthly Purchase',
                            amount: proratedAmount,
                            quantity: totalQuantity > 0 ? totalQuantity : '-',
                            date: new Date(entry.date + 'T12:00:00').toLocaleDateString('en-CA'),
                            type: 'Monthly'
                        });
                    }
                }
            });

            totalExpenses = dailyExpensesTotal + dailyPurchasesTotal + proratedMonthlyTotal;
            allExpensesInRange = [
                ...dailyExpensesFromModal.map(e => ({ 
                    description: e.description, 
                    amount: e.amount,
                    quantity: '-', // Daily expenses don't have quantity
                    date: new Date(e.date).toLocaleDateString('en-CA'), 
                    type: 'Daily' 
                })),
                ...relevantDailyPurchases.map(e => {
                    // Calculate total quantity from items
                    const totalQuantity = (e.items || []).reduce((sum, item) => sum + (item.quantity || 0), 0);
                    return {
                        description: e.primaryDescription || 'Purchase', 
                        amount: e.totalCost || 0,
                        quantity: totalQuantity > 0 ? totalQuantity : '-',
                        date: new Date(e.date + 'T12:00:00').toLocaleDateString('en-CA'), 
                        type: 'Purchase' 
                    };
                }),
                ...consolidatedMonthlyEntries
            ];
        }

        // Sort expenses by date (newest first)
        allExpensesInRange.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // --- END OF EXPENSE LOGIC ---

        const remainingSale = totalSales - totalExpenses;

        const itemMap = new Map<string, { quantity: number; price: number; profit: number }>();
        relevantBilledItems.forEach(item => {
            const existing = itemMap.get(item.productName) || { quantity: 0, price: 0, profit: 0 };
            existing.quantity += item.quantity;
            existing.price += item.price;
            existing.profit += item.profit;
            itemMap.set(item.productName, existing);
        });

        const itemsSold = Array.from(itemMap.entries()).map(([productName, data]) => ({ productName, ...data }))
                            .sort((a, b) => b.quantity - a.quantity);

        // Calculate revenue by hour
        const revenueByHour = Array.from({ length: 17 }, (_, i) => ({ hour: i + 5, revenue: 0 }));
        relevantBilledItems.forEach(item => {
            const date = new Date(item.timestamp);
            const hour = date.getHours();
            if (hour >= 5 && hour <= 21) {
                const bucket = revenueByHour.find(b => b.hour === hour);
                if (bucket) {
                    bucket.revenue += item.price;
                }
            }
        });

        // Calculate orders by time (can be filtered by item)
        const ordersByTime = Array.from({ length: 17 }, (_, i) => ({ hour: i + 5, orders: 0 }));
        
        const invoiceTimestamps = new Map<number, number>();
        relevantBilledItems.forEach(item => {
            // Filter by item if selected
            if (itemForOrdersChart !== 'all' && item.productName !== itemForOrdersChart) {
                return;
            }
            if (!invoiceTimestamps.has(item.invoiceNumber)) {
                invoiceTimestamps.set(item.invoiceNumber, item.timestamp);
            }
        });
        
        invoiceTimestamps.forEach((timestamp, invoiceNumber) => {
            const date = new Date(timestamp);
            const hour = date.getHours();
            
            // Ensure hour is within our display range (5 AM to 9 PM = 5-21)
            if (hour >= 5 && hour <= 21) {
                const bucket = ordersByTime.find(b => b.hour === hour);
                if (bucket) {
                    bucket.orders++;
                }
            }
        });
        
        const topItemsSold = itemsSold.slice(0, 10);

        return { totalSales, totalOrders, profit, totalExpenses, remainingSale, itemsSold, allExpensesInRange, ordersByTime, revenueByHour, topItemsSold };
    }, [billedItems, expenses, stockEntries, expenseItems, startDate, endDate, reportType, invoiceCount, itemForOrdersChart]);
    
    // Reset filters when report data changes
    useEffect(() => {
        setTypeFilter('both');
        setDescriptionFilter('all');
        setProductNameFilter('all');
        setItemForOrdersChart('all');
    }, [startDate, endDate, reportType]);

    // Get unique descriptions for expense filter dropdown
    const uniqueDescriptions = useMemo(() => {
        const descriptions = new Set<string>();
        allExpensesInRange.forEach(expense => {
            descriptions.add(expense.description);
        });
        return Array.from(descriptions).sort();
    }, [allExpensesInRange]);

    // Get unique product names for items filter dropdown
    const uniqueProductNames = useMemo(() => {
        const productNames = new Set<string>();
        itemsSold.forEach(item => {
            productNames.add(item.productName);
        });
        return Array.from(productNames).sort();
    }, [itemsSold]);

    // Filter expenses based on selected filters
    const filteredExpenses = useMemo(() => {
        return allExpensesInRange.filter(expense => {
            // Type filter
            if (typeFilter !== 'both' && expense.type !== typeFilter) {
                return false;
            }
            
            // Description filter
            if (descriptionFilter !== 'all' && expense.description !== descriptionFilter) {
                return false;
            }
            
            return true;
        });
    }, [allExpensesInRange, typeFilter, descriptionFilter]);

    // Filter items based on selected product name filter
    const filteredItemsSold = useMemo(() => {
        if (productNameFilter === 'all') {
            return itemsSold;
        }
        return itemsSold.filter(item => item.productName === productNameFilter);
    }, [itemsSold, productNameFilter]);

    const formatCurrency = (value: number) => {
        return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-bold text-gray-800">Report for {title}</h1>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
                <div className="bg-white p-5 rounded-xl shadow-sm">
                    <h3 className="text-base font-medium text-gray-500">Total Orders</h3>
                    <p className="mt-2 text-2xl font-bold text-indigo-600">{totalOrders}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm">
                    <h3 className="text-base font-medium text-gray-500">Total Sale</h3>
                    <p className="mt-2 text-2xl font-bold text-purple-700">{formatCurrency(totalSales)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpenseModalOpen(true)}>
                    <h3 className="text-base font-medium text-gray-500">Expenses</h3>
                    <p className="mt-2 text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm">
                    <h3 className="text-base font-medium text-gray-500">Remaining Sale</h3>
                    <p className={`mt-2 text-2xl font-bold ${remainingSale >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(remainingSale)}
                    </p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm">
                    <h3 className="text-base font-medium text-gray-500">Profit</h3>
                    <p className="mt-2 text-2xl font-bold text-blue-600">{formatCurrency(profit)}</p>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Analytics</h2>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3">
                        <OrdersByTimeChart 
                            data={ordersByTime} 
                            itemOptions={uniqueProductNames}
                            selectedItem={itemForOrdersChart}
                            onSelectItem={setItemForOrdersChart}
                        />
                    </div>
                    <div className="lg:col-span-2">
                        <RevenueByHourChart data={revenueByHour} />
                    </div>
                </div>
                {/* Summary for the selected item / orders chart */}
                <div className="mt-4 bg-white p-4 rounded-xl shadow-sm">
                    {(() => {
                        const total = ordersByTime.reduce((s, b) => s + b.orders, 0);
                        const nonZero = ordersByTime.filter(b => b.orders > 0);
                        const maxVal = nonZero.length ? Math.max(...nonZero.map(b => b.orders)) : 0;
                        const minVal = nonZero.length ? Math.min(...nonZero.map(b => b.orders)) : 0;
                        const formatHour = (h: number) => {
                            if (h === 12) return '12PM';
                            if (h > 12) return `${h - 12}PM`;
                            if (h === 0) return '12AM';
                            return `${h}AM`;
                        };
                        const peakHours = ordersByTime.filter(b => b.orders === maxVal).map(b => formatHour(b.hour));
                        const lowHours = ordersByTime.filter(b => b.orders === minVal && minVal > 0).map(b => formatHour(b.hour));
                        const label = (itemForOrdersChart === 'all') ? 'All items' : itemForOrdersChart;
                        return (
                            <div className="text-sm text-gray-700">
                                <div className="flex flex-wrap items-center gap-3 mb-1">
                                    <span className="font-semibold text-gray-900">Summary:</span>
                                    <span>
                                        <span className="font-medium">{label}</span> total count: <span className="font-semibold text-purple-700">{total}</span>
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-3">
                                    <span>
                                        Peak hour{peakHours.length > 1 ? 's' : ''}: <span className="font-semibold">{peakHours.length ? peakHours.join(', ') : '—'}</span> ({maxVal})
                                    </span>
                                    <span>
                                        Low hour{lowHours.length > 1 ? 's' : ''}: <span className="font-semibold">{lowHours.length ? lowHours.join(', ') : '—'}</span> {minVal > 0 ? `(${minVal})` : ''}
                                    </span>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white shadow-sm rounded-xl overflow-hidden">
                    <h3 className="text-xl font-bold text-gray-800 p-4 border-b">Items Summary</h3>
                    <div className="p-4 border-b bg-gray-50">
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Product Name Filter */}
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Product</label>
                                <select
                                    value={productNameFilter}
                                    onChange={(e) => setProductNameFilter(e.target.value)}
                                    className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                                >
                                    <option value="all">All Products</option>
                                    {uniqueProductNames.map(name => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <table className="w-full text-base text-left text-gray-500">
                            <thead className="text-sm text-gray-700 uppercase bg-gray-50 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Item Name</th>
                                    <th scope="col" className="px-6 py-3 text-center">Items Sold</th>
                                    <th scope="col" className="px-6 py-3 text-right">Total Price</th>
                                    <th scope="col" className="px-6 py-3 text-right">Total Profit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItemsSold.map((item, index) => (
                                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{item.productName}</td>
                                        <td className="px-6 py-4 text-center">{item.quantity}</td>
                                        <td className="px-6 py-4 text-right">{formatCurrency(item.price)}</td>
                                        <td className="px-6 py-4 text-right text-green-600">{formatCurrency(item.profit)}</td>
                                    </tr>
                                ))}
                                {filteredItemsSold.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-8 text-gray-500 text-base">No items match the selected filter.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="bg-white shadow-sm rounded-xl overflow-hidden">
                    <h3 className="text-xl font-bold text-gray-800 p-4 border-b">Expenses Summary</h3>
                    <div className="p-4 border-b bg-gray-50">
                        <div className="flex flex-col sm:flex-row gap-4">
                            {/* Type Filter */}
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Type</label>
                                <select
                                    value={typeFilter}
                                    onChange={(e) => setTypeFilter(e.target.value as 'both' | 'Daily' | 'Monthly' | 'Purchase')}
                                    className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                                >
                                    <option value="both">Both</option>
                                    <option value="Daily">Daily</option>
                                    <option value="Monthly">Monthly</option>
                                    <option value="Purchase">Purchase</option>
                                </select>
                            </div>
                            
                            {/* Description Filter */}
                            <div className="flex-1">
                                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Description</label>
                                <select
                                    value={descriptionFilter}
                                    onChange={(e) => setDescriptionFilter(e.target.value)}
                                    className="w-full px-3 py-2 text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 bg-white"
                                >
                                    <option value="all">All Items</option>
                                    {uniqueDescriptions.map(desc => (
                                        <option key={desc} value={desc}>{desc}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <table className="w-full text-base text-left text-gray-500">
                            <thead className="text-sm text-gray-700 uppercase bg-gray-50 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Date</th>
                                    <th scope="col" className="px-6 py-3">Description</th>
                                    <th scope="col" className="px-6 py-3">Type</th>
                                    <th scope="col" className="px-6 py-3 text-center">Unit</th>
                                    <th scope="col" className="px-6 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredExpenses.map((item, index) => (
                                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{item.date}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.description}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.type}</td>
                                        <td className="px-6 py-4 text-center text-gray-600">{item.quantity}</td>
                                        <td className="px-6 py-4 text-right text-red-600">{formatCurrency(item.amount)}</td>
                                    </tr>
                                ))}
                                {filteredExpenses.length === 0 && (
                                    <tr><td colSpan={5} className="text-center py-8 text-gray-500 text-base">No expenses match the selected filters.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <ExpenseDetailModal 
                isOpen={isExpenseModalOpen}
                onClose={() => setExpenseModalOpen(false)}
                expenses={allExpensesInRange}
                title={`Expense Details for ${title}`}
            />
        </div>
    );
};

export default ReportView;