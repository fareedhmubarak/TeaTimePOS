import React, { useState } from 'react';
import { Order } from '../types.ts';
import OrderItem from './OrderItem.tsx';
import { XIcon } from './Icons.tsx';
import { printReceipt, PrintData } from '../utils/printer.ts';
import { supabase } from '../supabaseClient.ts';

interface OrderPanelProps {
  order: Order | null;
  invoiceNumber: number;
  onUpdateQuantity: (productId: number, newQuantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearOrder: () => void;
  onBillOrder: () => void;
  onHoldOrder: () => void;
  canHold: boolean;
  isReadOnly: boolean;
  isEditing: boolean;
  onEditInvoice: () => void;
  onDeleteInvoice: () => void;
  isMobileOpen: boolean;
  onMobileClose: () => void;
  billingDate: Date;
  onBillingDateChange: (date: Date) => void;
}

const OrderPanel: React.FC<OrderPanelProps> = ({ 
  order, invoiceNumber, onUpdateQuantity, onRemoveItem, onClearOrder, 
  onBillOrder, onHoldOrder, canHold, isReadOnly, isEditing, onEditInvoice, 
  onDeleteInvoice, isMobileOpen, onMobileClose, billingDate, onBillingDateChange
}) => {

  const asideClasses = `
    bg-white border-l border-gray-200 flex flex-col h-full
    fixed inset-0 z-40 w-full transform transition-transform duration-300 ease-in-out
    md:relative md:inset-auto md:z-auto md:w-80 md:translate-x-0 md:flex-shrink-0
    ${isMobileOpen ? 'translate-x-0' : 'translate-x-full'}
  `;
  
  const isPending = invoiceNumber < 0; // Note: This is for held orders (kept variable name for code consistency)
  
  // Check if the invoice is from today
  const isTodayInvoice = (() => {
    const today = new Date();
    const invoiceDate = billingDate;
    
    return today.getFullYear() === invoiceDate.getFullYear() &&
           today.getMonth() === invoiceDate.getMonth() &&
           today.getDate() === invoiceDate.getDate();
  })();

  if (!order) {
    return (
        <aside className={asideClasses}>
            <div className="p-4 border-b border-gray-200">
                <h2 className="text-3xl font-bold text-gray-800">Order Details</h2>
            </div>
            <div className="flex-1 flex items-center justify-center text-gray-500 text-lg">
                Order not found.
            </div>
        </aside>
    );
  }
    
  const totalAmount = order.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const [isPrinting, setIsPrinting] = useState(false);

  const handlePrint = async () => {
    setIsPrinting(true);
    try {
      const dateStr = billingDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
      const timeStr = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      console.log('Printing invoice #', invoiceNumber);
      console.log('Order items:', order.items);
      console.log('Order items count:', order.items.length);

      const printData: PrintData = {
        invoiceNumber,
        date: dateStr,
        time: timeStr,
        items: order.items.map(item => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price * item.quantity
        })),
        totalAmount
      };

      console.log('Print data items count:', printData.items.length);
      console.log('Print data items:', printData.items);

      // Check if printer is saved before attempting to print
      try {
        const { data: settings } = await supabase
          .from('printer_settings')
          .select('connection_type, selected_bluetooth_printer')
          .order('updated_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const hasSavedPrinter = settings && 
          settings.connection_type === 'Bluetooth' && 
          settings.selected_bluetooth_printer;

        if (!hasSavedPrinter) {
          // No printer saved - dispatch event to show printer selection modal
          console.log('No saved printer found, dispatching event to show printer selection modal');
          const event = new CustomEvent('showPrinterSelection', { 
            detail: { printData } 
          });
          window.dispatchEvent(event);
          setIsPrinting(false);
          return;
        }

        // Printer found - print directly (no preview, no popup)
        console.log('Found saved printer, printing directly...');
        await printReceipt(printData, true);
      } catch (error: any) {
        console.error('Print error:', error);
        
        // If error indicates no printer is configured, dispatch event
        if (error.message && (
          error.message.includes('No direct printing method available') ||
          error.message.includes('No saved Bluetooth printer') ||
          error.message.includes('No printer is currently selected')
        )) {
          const event = new CustomEvent('showPrinterSelection', { 
            detail: { printData } 
          });
          window.dispatchEvent(event);
        } else {
          alert(error.message || 'Failed to print. Please check printer connection and try again.');
        }
      }
    } catch (error: any) {
      console.error('Print error:', error);
      alert(error.message || 'Failed to print. Please check printer connection and try again.');
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <aside className={asideClasses}>
      <div className="p-2 border-b border-gray-200 space-y-2 flex-shrink-0">
        <div className="flex justify-between items-start">
          <h2 className="text-lg font-bold text-gray-800">
              {isReadOnly ? 'Invoice' : (isEditing ? 'Editing' : 'Invoice')} #{isPending ? `${invoiceNumber * -1}`.slice(-4) : invoiceNumber}
              {isPending && <span className="text-xs font-normal text-gray-500 ml-1">(Saving...)</span>}
          </h2>
          <div className="flex items-center space-x-1 flex-shrink-0">
            {isReadOnly && !isPending && isTodayInvoice && (
              <>
                <button onClick={onEditInvoice} className="text-xs font-medium text-purple-600 hover:text-purple-800 px-1">
                  Edit
                </button>
                <button onClick={onDeleteInvoice} className="text-xs font-medium text-red-600 hover:text-red-800 px-1">
                  Delete
                </button>
              </>
            )}
            {isReadOnly && !isPending && (
              <button 
                onClick={handlePrint} 
                className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center space-x-1 px-1"
                title="Print Receipt"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print</span>
              </button>
            )}
            {!isReadOnly && <button onClick={onClearOrder} className="text-xs font-medium text-red-500 hover:text-red-700 px-1">Clear</button>}
            <button onClick={onMobileClose} className="p-1 text-gray-500 hover:text-gray-800 md:hidden" aria-label="Close order panel">
                <XIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div>
          <label htmlFor="billing-date" className="text-xs font-medium text-gray-600">Billing Date</label>
          <input
              type="date"
              id="billing-date"
              value={billingDate.toISOString().split('T')[0]}
              onChange={(e) => {
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  onBillingDateChange(new Date(year, month - 1, day, 12, 0, 0));
              }}
              disabled={isReadOnly || isEditing}
              className="block w-full bg-gray-50 border border-gray-300 rounded-md py-1 px-2 text-xs disabled:bg-gray-200 disabled:cursor-not-allowed"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 min-h-0">
        {order.items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-xs">
            This order is empty
          </div>
        ) : (
          <div className="space-y-2">
            {order.items.map((item) => (
              <OrderItem
                key={item.product.id}
                item={item}
                onUpdateQuantity={onUpdateQuantity}
                onRemoveItem={onRemoveItem}
                isReadOnly={isReadOnly}
              />
            ))}
          </div>
        )}
      </div>

      <div className="p-2 border-t border-gray-200 bg-gray-50 flex-shrink-0">
        <div className="space-y-1 mb-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold">Total Amount</span>
              <span className="text-xl font-bold text-purple-900">₹{totalAmount.toFixed(2)}</span>
            </div>
        </div>

        {!isReadOnly && (
            <div className="flex space-x-2">
                <button
                    onClick={onHoldOrder}
                    disabled={!canHold || isEditing}
                    className="w-1/2 py-2 bg-red-500 text-white rounded-md text-sm font-semibold hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {isEditing ? 'Update First' : (canHold ? 'Hold' : 'Hold Full')}
                </button>
                <button 
                    onClick={onBillOrder}
                    className="w-1/2 py-2 bg-purple-800 text-white rounded-md text-sm font-semibold hover:bg-purple-900"
                >
                    {isEditing ? 'Update Bill' : 'Bill'}
                </button>
            </div>
        )}
        {isReadOnly && !isPending && (
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="w-full py-2 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
            title="Print Invoice"
          >
            {isPrinting ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Printing...</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print Invoice</span>
              </>
            )}
          </button>
        )}
      </div>
    </aside>
  );
};

export default OrderPanel;