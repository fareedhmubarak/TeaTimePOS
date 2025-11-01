import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Order, BilledItem } from '../types.ts';
import { XIcon, ChartBarIcon, ClockIcon, MenuIcon, HomeIcon, ReceiptIcon } from './Icons.tsx';

interface HeaderProps {
  orders: Order[];
  activeOrderIndex: number;
  onSelectHold: (index: number) => void;
  onCloseHold: (index: number) => void;
  onNavigate: (view: 'home' | 'pos' | 'admin') => void;
  currentView: 'home' | 'pos' | 'admin';
  billedItems: BilledItem[];
  onViewInvoice: (invoiceNumber: number, invoiceDate?: string, invoiceTimestamp?: number) => void;
  onGoToNewOrder: () => void;
  isViewingHistory: boolean;
  onAddExpenseClick: () => void;
  onToggleSidebar?: () => void;
}

const Header: React.FC<HeaderProps> = ({ 
  orders, activeOrderIndex, onSelectHold, onCloseHold, onNavigate, currentView, 
  billedItems, onViewInvoice, onGoToNewOrder, isViewingHistory, onAddExpenseClick, onToggleSidebar 
}) => {
  const [showRecent, setShowRecent] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowRecent(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [dropdownRef]);

  const recentInvoices = useMemo(() => {
    // Get today's date in the same format as item.date (M/D/YYYY)
    const today = new Date();
    const todayDateString = today.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    
    const invoices: { [key: number]: { date: string; total: number; status?: 'hold' | 'synced'; timestamp: number; } } = {};
    
    // Filter only today's bills
    billedItems
      .filter(item => item.date === todayDateString)
      .forEach(item => {
        if (!invoices[item.invoiceNumber]) {
            invoices[item.invoiceNumber] = { date: item.date, total: 0, status: item.status, timestamp: item.timestamp };
        }
        invoices[item.invoiceNumber].total += item.price;
    });

    return Object.entries(invoices)
        .map(([invoiceNumber, data]) => ({ invoiceNumber: parseInt(invoiceNumber), ...data }))
        .sort((a, b) => b.timestamp - a.timestamp) // Sort by timestamp for true recency
        .slice(0, 10);
  }, [billedItems]);
  
  const heldOrderIndices = orders
    .map((order, index) => ({ order, index }))
    .filter(({ order, index }) => index < orders.length - 1 && order.items.length > 0)
    .map(({ index }) => index);
  
  const lastOrderIndex = orders.length - 1;
  const isViewingHeldOrder = activeOrderIndex !== lastOrderIndex;

  const showNewOrderButton = isViewingHistory || isViewingHeldOrder;
  const isPosView = currentView === 'pos';

  return (
    <header className="bg-white shadow-md z-10">
      <div className="mx-auto px-2 sm:px-4">
        <div className="flex items-center justify-between h-16">
          {/* LEFT SECTION */}
          <div className="flex items-center space-x-2">
            {isPosView && onToggleSidebar && (
              <button 
                onClick={onToggleSidebar}
                className="p-2 text-gray-600 rounded-full hover:bg-gray-100 md:hidden"
                aria-label="Open categories menu"
              >
                <MenuIcon className="h-6 w-6" />
              </button>
            )}
             <button onClick={() => onNavigate('home')} className="flex items-center space-x-2">
                <h1 className="text-2xl md:text-3xl font-extrabold text-purple-800">Tea Time</h1>
            </button>
          </div>

          {/* CENTER SECTION */}
          <div className="flex-1 flex justify-center px-2 min-w-0">
            {isPosView && (heldOrderIndices.length > 0 || showNewOrderButton) && (
              <div className="no-scrollbar flex items-center bg-gray-100 border border-gray-200 rounded-lg p-1 space-x-1 overflow-x-auto whitespace-nowrap">
                {heldOrderIndices.map((heldIndex, listPosition) => {
                  const order = orders[heldIndex];
                  const holdNumber = listPosition + 1;
                  return (
                    <button
                      key={order.id}
                      onClick={() => { onNavigate('pos'); onSelectHold(heldIndex); }}
                      className={`flex items-center justify-center space-x-2 px-3 sm:px-5 py-3 text-lg font-bold rounded-md transition-all duration-200 focus:outline-none flex-shrink-0 ${
                        activeOrderIndex === heldIndex && !isViewingHistory
                          ? 'bg-purple-800 text-white shadow-inner'
                          : 'text-gray-700 bg-gray-200 hover:bg-gray-300'
                      }`}
                    >
                      <span>{`Hold ${holdNumber}`}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          onCloseHold(heldIndex);
                        }}
                        className={`p-0.5 rounded-full transition-colors duration-200 hover:bg-gray-400`}
                        aria-label={`Close Hold ${holdNumber}`}
                      >
                        <XIcon className="w-3.5 h-3.5" />
                      </span>
                    </button>
                  );
                })}
                {showNewOrderButton && (
                    <button
                        onClick={() => { onNavigate('pos'); onGoToNewOrder(); }}
                        className={`px-3 sm:px-5 py-3 text-lg font-bold rounded-md transition-all duration-200 focus:outline-none flex-shrink-0 ${
                          !isViewingHeldOrder && !isViewingHistory
                            ? 'bg-purple-800 text-white shadow-inner'
                            : 'text-gray-700 bg-gray-200 hover:bg-gray-300'
                        }`}
                    >
                        New Order
                    </button>
                )}
              </div>
            )}
          </div>

          {/* RIGHT SECTION */}
          <div className="flex items-center space-x-2">
            <button 
              onClick={() => onNavigate('home')}
              className={`p-2 rounded-full hover:bg-gray-100 hover:text-purple-800 ${currentView === 'home' ? 'text-purple-800' : 'text-gray-600'}`}
              aria-label="Home"
            >
              <HomeIcon className="h-6 w-6" />
            </button>
            <button 
              onClick={() => onNavigate('admin')}
              className={`p-2 rounded-full hover:bg-gray-100 hover:text-purple-800 ${currentView === 'admin' ? 'text-purple-800' : 'text-gray-600'}`}
              aria-label="View Admin Dashboard"
            >
              <ChartBarIcon className="h-6 w-6" />
            </button>
             <button 
              onClick={onAddExpenseClick}
              className="p-2 text-gray-600 rounded-full hover:bg-gray-100 hover:text-purple-800"
              aria-label="Add Expense"
            >
              <ReceiptIcon className="h-6 w-6" />
            </button>
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowRecent(prev => !prev)}
                className="p-2 text-gray-600 rounded-full hover:bg-gray-100 hover:text-purple-800"
                aria-label="View Recent Orders"
              >
                <ClockIcon className="h-6 w-6" />
              </button>
              {showRecent && (
                <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg z-20 border border-gray-200">
                  <div className="py-2 px-4 border-b">
                    <h3 className="font-bold text-gray-800">Today's Orders</h3>
                  </div>
                  <ul className="max-h-80 overflow-y-auto">
                    {recentInvoices.length > 0 ? (
                      recentInvoices.map(inv => (
                        <li key={inv.invoiceNumber} className="px-4 py-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer" onClick={() => { onNavigate('pos'); onViewInvoice(inv.invoiceNumber, inv.date, inv.timestamp); setShowRecent(false); }}>
                          <div className="flex justify-between items-center text-lg">
                            <span className="font-semibold text-gray-700 flex items-center">
                                {inv.status === 'hold' && <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>}
                                {inv.invoiceNumber > 0 ? `Invoice #${inv.invoiceNumber}` : 'Saving...'}
                            </span>
                            <span className="text-gray-500">{inv.date}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-base text-gray-500">Total</span>
                            <span className="font-bold text-purple-800">₹{inv.total.toFixed(2)}</span>
                          </div>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-3 text-lg text-gray-500 text-center">No orders today.</li>
                    )}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;