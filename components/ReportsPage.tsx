import React, { useState, useMemo, useRef } from 'react';
import { BilledItem, Expense, StockEntry, ExpenseItem } from '../types.ts';
import ReportView from './ReportView.tsx';
import { CalendarIcon } from './Icons.tsx';

interface ReportsPageProps {
  billedItems: BilledItem[];
  expenses: Expense[];
  stockEntries: StockEntry[];
  expenseItems: ExpenseItem[];
}

type ReportType = 'daily' | 'monthly' | 'range';

const toInputDate = (date: Date): string => {
    return date.toISOString().split('T')[0];
};

const toReportDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
};

const ReportsPage: React.FC<ReportsPageProps> = ({ billedItems, expenses, stockEntries, expenseItems }) => {
    const [reportType, setReportType] = useState<ReportType>('daily');
    const today = new Date();
    const [selectedDate, setSelectedDate] = useState(toInputDate(today));
    
    // For range picker
    const [startDate, setStartDate] = useState(toInputDate(new Date(today.getFullYear(), today.getMonth(), 1)));
    const [endDate, setEndDate] = useState(toInputDate(today));

    const { finalStartDate, finalEndDate, title } = useMemo(() => {
        switch (reportType) {
            case 'daily': {
                const date = new Date(selectedDate + 'T00:00:00'); // Treat as local date
                const reportDate = toReportDate(date);
                return { 
                    finalStartDate: reportDate, 
                    finalEndDate: reportDate,
                    title: date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                };
            }
            case 'monthly': {
                 // The date picker for daily view sets the context for monthly
                const refDate = new Date(selectedDate + 'T00:00:00');
                const firstDay = new Date(refDate.getFullYear(), refDate.getMonth(), 1);
                const lastDay = new Date(refDate.getFullYear(), refDate.getMonth() + 1, 0);
                 return { 
                    finalStartDate: toReportDate(firstDay), 
                    finalEndDate: toReportDate(lastDay),
                    title: firstDay.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                };
            }
            case 'range': {
                const start = new Date(startDate + 'T00:00:00');
                const end = new Date(endDate + 'T00:00:00');
                 return { 
                    finalStartDate: toReportDate(start), 
                    finalEndDate: toReportDate(end),
                    title: `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric'})}`
                };
            }
            default:
                return { finalStartDate: '', finalEndDate: '', title: '' };
        }
    }, [reportType, selectedDate, startDate, endDate]);

    // Custom date input to show single clickable icon while hiding the native one
    const DateInput: React.FC<{ value: string; onChange: (v: string) => void }> = ({ value, onChange }) => {
        const inputRef = useRef<HTMLInputElement>(null);
        const openPicker = () => {
            const el = inputRef.current;
            if (!el) return;
            // Prefer showPicker when available (Chrome), fallback to focus
            // @ts-ignore
            if (typeof el.showPicker === 'function') {
                // @ts-ignore
                el.showPicker();
            } else {
                el.focus();
                el.click();
            }
        };
        return (
            <div className="relative">
                <input
                    ref={inputRef}
                    type="date"
                    value={value}
                    onChange={e => onChange(e.target.value)}
                    className="p-1.5 pl-2 pr-9 border bg-gray-50 rounded-md text-base appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
                />
                <button type="button" onClick={openPicker} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-purple-700">
                    <CalendarIcon className="w-5 h-5" />
                </button>
            </div>
        );
    };

    const renderDateSelectors = () => {
        if (reportType === 'range') {
             return (
                <div className="flex items-center space-x-2 text-base">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-1.5 border bg-gray-50 rounded-md text-base" />
                    <span className="text-gray-600">to</span>
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-1.5 border bg-gray-50 rounded-md text-base" />
                </div>
            );
        }
        
        // Daily and Monthly both use the single date picker
        return (
            <div className="flex items-center space-x-2 text-base text-gray-700 font-medium">
                <span>Date:</span>
                <DateInput value={selectedDate} onChange={setSelectedDate} />
            </div>
        );
    };
    
    return (
        <div className="space-y-6">
            <div className="bg-white p-3 rounded-lg shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-3 sm:space-y-0">
                <div className="flex items-center border border-gray-200 rounded-lg p-1 space-x-1">
                    <button onClick={() => setReportType('daily')} className={`px-4 py-1.5 text-base font-bold rounded-md transition-colors ${reportType === 'daily' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>Daily</button>
                    <button onClick={() => setReportType('monthly')} className={`px-4 py-1.5 text-base font-bold rounded-md transition-colors ${reportType === 'monthly' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>Monthly</button>
                    <button onClick={() => setReportType('range')} className={`px-4 py-1.5 text-base font-bold rounded-md transition-colors ${reportType === 'range' ? 'bg-purple-600 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>Date Range</button>
                </div>
                <div>
                    {renderDateSelectors()}
                </div>
            </div>

            <ReportView 
                billedItems={billedItems} 
                expenses={expenses}
                stockEntries={stockEntries}
                expenseItems={expenseItems}
                startDate={finalStartDate}
                endDate={finalEndDate}
                title={title}
                reportType={reportType}
            />
        </div>
    );
};

export default ReportsPage;