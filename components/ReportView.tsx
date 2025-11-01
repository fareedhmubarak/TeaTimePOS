import React, { useMemo, useState } from 'react';
import { BilledItem, Expense, StockEntry, ExpenseItem } from '../types.ts';
import OrdersByTimeChart from './OrdersByTimeChart.tsx';
import ItemsSoldChart from './ItemsSoldChart.tsx';
import ExpenseDetailModal from './ExpenseDetailModal.tsx';

interface ReportViewProps {
  billedItems: BilledItem[];
  expenses: Expense[];
  stockEntries: StockEntry[];
  expenseItems: ExpenseItem[];
  startDate: string;
  endDate: string;
  title: string;
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

const ReportView: React.FC<ReportViewProps> = ({ billedItems, expenses, stockEntries, expenseItems, startDate, endDate, title }) => {
    const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);

    const {
        totalSales,
        grossProfit,
        totalExpenses,
        netProfit,
        itemsSold,
        allExpensesInRange,
        ordersByTime,
        topItemsSold
    } = useMemo(() => {
        const reportStart = new Date(startDate);
        const reportEnd = new Date(endDate);

        const reportStartDateOnly = new Date(reportStart.getFullYear(), reportStart.getMonth(), reportStart.getDate());
        const reportEndDateOnly = new Date(reportEnd.getFullYear(), reportEnd.getMonth(), reportEnd.getDate(), 23, 59, 59);
        
        const relevantBilledItems = billedItems.filter(item => {
            const itemDate = new Date(item.date);
            return itemDate >= reportStartDateOnly && itemDate <= reportEndDateOnly;
        });

        const totalSales = relevantBilledItems.reduce((sum, item) => sum + item.price, 0);
        const grossProfit = relevantBilledItems.reduce((sum, item) => sum + item.profit, 0);
        
        // --- NEW EXPENSE CALCULATION LOGIC ---

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

        // 4. Calculate total for prorated monthly purchases
        let proratedMonthlyTotal = 0;
        monthlyPurchases.forEach(entry => {
            const entryDate = parseDateString(entry.date);
            const totalCost = entry.totalCost || 0;
            if (totalCost === 0) return;

            const activeStartDate = entryDate;
            const endOfMonth = new Date(entryDate.getFullYear(), entryDate.getMonth() + 1, 0, 23, 59, 59);
            
            const overlapStartDate = new Date(Math.max(activeStartDate.getTime(), reportStartDateOnly.getTime()));
            const overlapEndDate = new Date(Math.min(endOfMonth.getTime(), reportEndDateOnly.getTime()));

            if (overlapStartDate <= overlapEndDate) {
                const daysInEntryMonth = getDaysInMonth(entryDate);
                const remainingDaysInMonth = daysInEntryMonth - entryDate.getDate() + 1;
                if (remainingDaysInMonth <= 0) return;
                const dailyProratedAmount = totalCost / remainingDaysInMonth;
                
                const timeDiff = overlapEndDate.getTime() - overlapStartDate.getTime();
                // Use Math.floor for a more robust day calculation, preventing rounding errors near day boundaries.
                const daysInOverlap = Math.floor(timeDiff / (1000 * 3600 * 24)) + 1;
                
                proratedMonthlyTotal += daysInOverlap * dailyProratedAmount;
            }
        });

        const totalExpenses = dailyExpensesTotal + dailyPurchasesTotal + proratedMonthlyTotal;
        
        // --- UPDATE `allExpensesInRange` TO REFLECT PRORATION (BUG FIX) ---
        const proratedEntriesForTable: any[] = [];
        const loopEndDate = new Date(reportEndDateOnly);
        let currentDate = new Date(reportStartDateOnly);

        while (currentDate <= loopEndDate) {
            monthlyPurchases.forEach(entry => {
                const entryDate = parseDateString(entry.date);
                const endOfMonth = new Date(entryDate.getFullYear(), entryDate.getMonth() + 1, 0, 23, 59, 59);
                
                // Ensure the current loop date is within the expense's active period
                if (currentDate >= entryDate && currentDate <= endOfMonth) {
                    const daysInEntryMonth = getDaysInMonth(entryDate);
                    const remainingDaysInMonth = daysInEntryMonth - entryDate.getDate() + 1;
                    
                    if (remainingDaysInMonth > 0) {
                        const dailyProratedAmount = (entry.totalCost || 0) / remainingDaysInMonth;
                        proratedEntriesForTable.push({
                            description: `${entry.primaryDescription} (Prorated)`,
                            amount: dailyProratedAmount,
                            date: new Date(currentDate).toLocaleDateString('en-CA'), // Format a copy of the date
                            type: 'Monthly'
                        });
                    }
                }
            });
            
            // Increment to the next day
            currentDate.setDate(currentDate.getDate() + 1);
        }
        
        const allExpensesInRange = [
            ...dailyExpensesFromModal.map(e => ({ description: e.description, amount: e.amount, date: new Date(e.date).toLocaleDateString('en-CA'), type: 'Daily' })),
            ...relevantDailyPurchases.map(e => ({ description: e.primaryDescription || 'Purchase', amount: e.totalCost || 0, date: new Date(e.date + 'T12:00:00').toLocaleDateString('en-CA'), type: 'Purchase' })),
            ...proratedEntriesForTable
        ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        // --- END OF EXPENSE LOGIC ---

        const netProfit = totalSales - totalExpenses;

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

        const ordersByTime = Array.from({ length: 17 }, (_, i) => ({ hour: i + 5, orders: 0 }));
        
        const invoiceTimestamps = new Map<number, number>();
        relevantBilledItems.forEach(item => {
            if (!invoiceTimestamps.has(item.invoiceNumber)) {
                invoiceTimestamps.set(item.invoiceNumber, item.timestamp);
            }
        });
        
        invoiceTimestamps.forEach(timestamp => {
            const hour = new Date(timestamp).getHours();
            const bucket = ordersByTime.find(b => b.hour === hour);
            if (bucket) bucket.orders++;
        });
        
        const topItemsSold = itemsSold.slice(0, 10);

        return { totalSales, grossProfit, totalExpenses, netProfit, itemsSold, allExpensesInRange, ordersByTime, topItemsSold };
    }, [billedItems, expenses, stockEntries, expenseItems, startDate, endDate]);
    
    const formatCurrency = (value: number) => {
        return `₹${value.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    return (
        <div className="space-y-6">
            <h1 className="text-xl font-bold text-gray-800">Report for {title}</h1>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white p-5 rounded-xl shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500">Total Sales</h3>
                    <p className="mt-2 text-3xl font-bold text-purple-700">{formatCurrency(totalSales)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500">Gross Profit</h3>
                    <p className="mt-2 text-3xl font-bold text-blue-600">{formatCurrency(grossProfit)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setExpenseModalOpen(true)}>
                    <h3 className="text-sm font-medium text-gray-500">Total Expenses</h3>
                    <p className="mt-2 text-3xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
                </div>
                <div className="bg-white p-5 rounded-xl shadow-sm">
                    <h3 className="text-sm font-medium text-gray-500">Net Profit</h3>
                    <p className={`mt-2 text-3xl font-bold ${netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(netProfit)}
                    </p>
                </div>
            </div>

            <div>
                <h2 className="text-xl font-bold text-gray-800 mb-4">Analytics</h2>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <div className="lg:col-span-3">
                        <OrdersByTimeChart data={ordersByTime} />
                    </div>
                    <div className="lg:col-span-2">
                        <ItemsSoldChart data={topItemsSold} />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white shadow-sm rounded-xl overflow-hidden">
                    <h3 className="text-lg font-bold text-gray-800 p-4 border-b">Items Summary</h3>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Item Name</th>
                                    <th scope="col" className="px-6 py-3 text-center">Items Sold</th>
                                    <th scope="col" className="px-6 py-3 text-right">Total Price</th>
                                    <th scope="col" className="px-6 py-3 text-right">Total Profit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {itemsSold.map((item, index) => (
                                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">{item.productName}</td>
                                        <td className="px-6 py-4 text-center">{item.quantity}</td>
                                        <td className="px-6 py-4 text-right">{formatCurrency(item.price)}</td>
                                        <td className="px-6 py-4 text-right text-green-600">{formatCurrency(item.profit)}</td>
                                    </tr>
                                ))}
                                {itemsSold.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-8 text-gray-500">No items sold in this period.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="bg-white shadow-sm rounded-xl overflow-hidden">
                    <h3 className="text-lg font-bold text-gray-800 p-4 border-b">Expenses Summary</h3>
                    <div className="max-h-[60vh] overflow-y-auto">
                        <table className="w-full text-sm text-left text-gray-500">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 sticky top-0">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Date</th>
                                    <th scope="col" className="px-6 py-3">Description</th>
                                    <th scope="col" className="px-6 py-3">Type</th>
                                    <th scope="col" className="px-6 py-3 text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allExpensesInRange.map((item, index) => (
                                    <tr key={index} className="bg-white border-b hover:bg-gray-50">
                                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">{item.date}</td>
                                        <td className="px-6 py-4 font-medium text-gray-900">{item.description}</td>
                                        <td className="px-6 py-4 text-gray-600">{item.type}</td>
                                        <td className="px-6 py-4 text-right text-red-600">{formatCurrency(item.amount)}</td>
                                    </tr>
                                ))}
                                {allExpensesInRange.length === 0 && (
                                    <tr><td colSpan={4} className="text-center py-8 text-gray-500">No expenses in this period.</td></tr>
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