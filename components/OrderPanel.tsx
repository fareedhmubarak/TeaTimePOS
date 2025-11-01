import React from 'react';
import { Order } from '../types.ts';
import OrderItem from './OrderItem.tsx';
import { XIcon } from './Icons.tsx';

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
  
  const isPending = invoiceNumber < 0;
  
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
                <h2 className="text-xl font-bold text-gray-800">Order Details</h2>
            </div>
            <div className="flex-1 flex items-center justify-center text-gray-500">
                Order not found.
            </div>
        </aside>
    );
  }
    
  const totalAmount = order.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const handlePrint = () => {
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('Please allow pop-ups to print receipts');
      return;
    }

    const dateStr = billingDate.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
    const timeStr = new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice #${invoiceNumber}</title>
          <style>
            @page {
              size: 58mm auto;
              margin: 0;
              padding: 0;
            }
            @media print {
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body { 
                margin: 0;
                padding: 2mm 3mm;
                width: 58mm;
                font-size: 10px;
              }
              html, body {
                height: auto;
                overflow: visible;
              }
            }
            body {
              font-family: Arial, sans-serif;
              width: 58mm;
              margin: 0;
              padding: 2mm 3mm;
              color: #000;
              font-size: 10px;
            }
            .header {
              text-align: center;
              border-bottom: 1px solid #000;
              padding-bottom: 2mm;
              margin-bottom: 2mm;
            }
            .header h1 {
              margin: 0;
              font-size: 14px;
              font-weight: bold;
              line-height: 1.1;
            }
            .header p {
              margin: 1px 0 0 0;
              font-size: 9px;
              line-height: 1.1;
            }
            .invoice-info {
              margin-bottom: 2mm;
              font-size: 8px;
              line-height: 1.3;
            }
            .invoice-info div {
              display: flex;
              justify-content: space-between;
              margin-bottom: 1px;
            }
            .items {
              border-top: 1px dashed #000;
              border-bottom: 1px dashed #000;
              padding: 2mm 0;
              margin: 2mm 0;
            }
            .item {
              display: flex;
              justify-content: space-between;
              margin-bottom: 2mm;
              font-size: 9px;
              line-height: 1.2;
              word-wrap: break-word;
            }
            .item-name {
              flex: 1;
              margin-right: 2mm;
            }
            .item-qty {
              margin: 0 1mm;
              white-space: nowrap;
              font-size: 8px;
            }
            .item-price {
              text-align: right;
              min-width: 18mm;
              white-space: nowrap;
            }
            .total {
              margin-top: 2mm;
              text-align: right;
            }
            .total-label {
              font-size: 10px;
              font-weight: bold;
              margin-bottom: 1px;
            }
            .total-amount {
              font-size: 14px;
              font-weight: bold;
            }
            .footer {
              margin-top: 2mm;
              text-align: center;
              font-size: 8px;
              border-top: 1px dashed #000;
              padding-top: 2mm;
            }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Tea Time</h1>
            <p>Point of Sale</p>
          </div>
          <div class="invoice-info">
            <div>
              <span>Invoice #:</span>
              <span>${invoiceNumber}</span>
            </div>
            <div>
              <span>Date:</span>
              <span>${dateStr} ${timeStr}</span>
            </div>
          </div>
          <div class="items">
            ${order.items.map(item => `
              <div class="item">
                <span class="item-name">${item.product.name}</span>
                <span class="item-qty">Qty: ${item.quantity}</span>
                <span class="item-price">₹${(item.product.price * item.quantity).toFixed(2)}</span>
              </div>
            `).join('')}
          </div>
          <div class="total">
            <div class="total-label">Total Amount</div>
            <div class="total-amount">₹${totalAmount.toFixed(2)}</div>
          </div>
          <div class="footer">
            <p>Thank you for your visit!</p>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <aside className={asideClasses}>
      <div className="p-4 border-b border-gray-200 space-y-3">
        <div className="flex justify-between items-start">
          <h2 className="text-xl font-bold text-gray-800">
              {isReadOnly ? 'Viewing Invoice' : (isEditing ? 'Editing Invoice' : 'Invoice')} #{isPending ? `${invoiceNumber * -1}`.slice(-4) : invoiceNumber}
              {isPending && <span className="text-sm font-normal text-gray-500 ml-2">(Saving...)</span>}
          </h2>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {isReadOnly && !isPending && isTodayInvoice && (
              <>
                <button onClick={onEditInvoice} className="text-sm font-medium text-purple-600 hover:text-purple-800">
                  Edit
                </button>
                <button onClick={onDeleteInvoice} className="text-sm font-medium text-red-600 hover:text-red-800">
                  Delete
                </button>
              </>
            )}
            {isReadOnly && !isPending && (
              <button 
                onClick={handlePrint} 
                className="text-sm font-medium text-blue-600 hover:text-blue-800 flex items-center space-x-1"
                title="Print Receipt"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                <span>Print</span>
              </button>
            )}
            {!isReadOnly && <button onClick={onClearOrder} className="text-sm font-medium text-red-500 hover:text-red-700">Clear All</button>}
            <button onClick={onMobileClose} className="p-1 text-gray-500 hover:text-gray-800 md:hidden" aria-label="Close order panel">
                <XIcon className="w-5 h-5" />
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
                  // Create date at noon local time to avoid timezone issues near midnight
                  onBillingDateChange(new Date(year, month - 1, day, 12, 0, 0));
              }}
              disabled={isReadOnly || isEditing}
              className="block w-full bg-gray-50 border border-gray-300 rounded-md py-1 px-2 text-sm disabled:bg-gray-200 disabled:cursor-not-allowed"
          />
        </div>
      </div>


      <div className="flex-1 overflow-y-auto p-4">
        {order.items.length === 0 ? (
          <div className="h-full flex items-center justify-center text-gray-500">
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
              <span className="text-lg font-bold">Total Amount</span>
              <span className="text-2xl font-bold text-purple-900">₹{totalAmount.toFixed(2)}</span>
            </div>
        </div>

        {!isReadOnly && (
            <div className="flex space-x-2">
                <button
                    onClick={onHoldOrder}
                    disabled={!canHold || isEditing}
                    className="w-1/2 py-3 bg-red-500 text-white rounded-md text-sm font-semibold hover:bg-red-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                    {isEditing ? 'Update First' : (canHold ? 'Pending' : 'Pending Full')}
                </button>
                <button 
                    onClick={onBillOrder}
                    className="w-1/2 py-3 bg-purple-800 text-white rounded-md text-sm font-semibold hover:bg-purple-900"
                >
                    {isEditing ? 'Update Bill' : 'Bill'}
                </button>
            </div>
        )}
        {isReadOnly && !isPending && (
          <button
            onClick={handlePrint}
            className="w-full py-3 bg-blue-600 text-white rounded-md text-sm font-semibold hover:bg-blue-700 flex items-center justify-center space-x-2"
            title="Print Invoice"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Invoice</span>
          </button>
        )}
      </div>
    </aside>
  );
};

export default OrderPanel;