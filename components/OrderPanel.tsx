import React, { useState } from 'react';
import { Order } from '../types.ts';
import OrderItem from './OrderItem.tsx';
import { XIcon } from './Icons.tsx';
import { printReceipt, PrintData } from '../utils/printer.ts';

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
    bg-white border-l border-gray-200 flex flex-col
    fixed inset-0 z-40 w-full transform transition-transform duration-300 ease-in-out
    md:relative md:inset-auto md:z-auto md:w-96 md:translate-x-0 md:flex-shrink-0
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

      // Try direct printing first (will show printer selection if Web Serial API is available)
      await printReceipt(printData, true);
    } catch (error: any) {
      alert(error.message || 'Failed to print. Please try again.');
      console.error('Print error:', error);
    } finally {
      setIsPrinting(false);
    }
  };

  return (
    <aside className={asideClasses}>
      <div className="p-4 border-b border-gray-200 space-y-3">
        <div className="flex justify-between items-start">
          <h2 className="text-3xl font-bold text-gray-800">
              {isReadOnly ? 'Viewing Invoice' : (isEditing ? 'Editing Invoice' : 'Invoice')} #{isPending ? `${invoiceNumber * -1}`.slice(-4) : invoiceNumber}
              {isPending && <span className="text-lg font-normal text-gray-500 ml-2">(Saving...)</span>}
          </h2>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {isReadOnly && !isPending && isTodayInvoice && (
              <>
                <button onClick={onEditInvoice} className="text-lg font-medium text-purple-600 hover:text-purple-800">
                  Edit
                </button>
                <button onClick={onDeleteInvoice} className="text-lg font-medium text-red-600 hover:text-red-800">
                  Delete
                </button>
              </>
            )}
            {isReadOnly && !isPending && (
              <button 
                onClick={handlePrint} 
                className="text-lg font-medium text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                title="Print Receipt"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print</span>
              </button>
            )}
            {!isReadOnly && <button onClick={onClearOrder} className="text-lg font-medium text-red-500 hover:text-red-700">Clear All</button>}
            <button onClick={onMobileClose} className="p-1 text-gray-500 hover:text-gray-800 md:hidden" aria-label="Close order panel">
                <XIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        <div>
          <label htmlFor="billing-date" className="text-base font-medium text-gray-600">Billing Date</label>
          <input
              type="date"
              id="billing-date"
              value={billingDate.toISOString().split('T')[0]}
              onChange={(e) => {
                  const [year, month, day] = e.target.value.split('-').map(Number);
                  // Create date at noon local time to avoid timezone issues near midnight
                  onBillingDateChange(new Date(year, month - 1, day, 12, 0, 0));
              }}
              disabled={isReadOnly || isEditing}
              className="block w-full bg-gray-50 border border-gray-300 rounded-md py-3 px-4 text-lg disabled:bg-gray-200 disabled:cursor-not-allowed"
          />
        </div>
      </div>


      <div className="flex-1 overflow-y-auto p-4">
        {order.items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500 text-lg">
            This order is empty
          </div>
        ) : (
          <div className="space-y-4">
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

      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="space-y-2 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-2xl font-bold">Total Amount</span>
              <span className="text-4xl font-bold text-purple-900">₹{totalAmount.toFixed(2)}</span>
            </div>
        </div>

        {!isReadOnly && (
            <div className="flex space-x-2">
                <button
                    onClick={onHoldOrder}
                    disabled={!canHold || isEditing}
                    className="w-1/2 py-5 bg-red-500 text-white rounded-md text-lg font-semibold hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {isEditing ? 'Update First' : (canHold ? 'Hold' : 'Hold Full')}
                </button>
                <button 
                    onClick={onBillOrder}
                    className="w-1/2 py-5 bg-purple-800 text-white rounded-md text-lg font-semibold hover:bg-purple-900"
                >
                    {isEditing ? 'Update Bill' : 'Bill'}
                </button>
            </div>
        )}
        {isReadOnly && !isPending && (
          <button
            onClick={handlePrint}
            disabled={isPrinting}
            className="w-full py-5 bg-blue-600 text-white rounded-md text-lg font-semibold hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center space-x-2 transition-colors"
            title="Print Invoice"
          >
            {isPrinting ? (
              <>
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Printing...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
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