import React, { useState, useMemo } from 'react';
import CategorySidebar from './CategorySidebar.tsx';
import ProductGrid from './ProductGrid.tsx';
import OrderPanel from './OrderPanel.tsx';
import { CATEGORIES } from '../constants.ts';
import { Order, Product, CartItem, BilledItem } from '../types.ts';
import { ShoppingCartIcon } from './Icons.tsx';

interface POSViewProps {
  orders: Order[];
  activeOrderIndex: number;
  activeOrder: Order;
  products: Product[];
  billedItems: BilledItem[];
  viewedInvoiceNumber: number | null;
  viewedOrder: Order | null;
  invoiceCounter: number;
  editingInvoiceNumber: number | null;
  billingDate: Date;
  onBillingDateChange: (date: Date) => void;
  onAddItem: (product: Product) => void;
  onUpdateQuantity: (productId: number, newQuantity: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearOrder: () => void;
  onSelectHold: (index: number) => void;
  onCloseHold: (index: number) => void;
  onHoldOrder: () => void;
  onBillOrder: () => void;
  onViewInvoice: (invoiceNumber: number) => void;
  onEditInvoice: (invoiceNumber: number) => void;
  onDeleteInvoice: (invoiceNumber: number) => void;
  onGoToNewOrder: () => void;
}

const POSView: React.FC<POSViewProps> = ({
  orders, activeOrderIndex, activeOrder, products, billedItems, viewedInvoiceNumber, viewedOrder, invoiceCounter,
  editingInvoiceNumber, billingDate, onBillingDateChange, onAddItem, onUpdateQuantity, onRemoveItem, onClearOrder, 
  onSelectHold, onCloseHold, onHoldOrder, onBillOrder, onViewInvoice, onEditInvoice, onDeleteInvoice, onGoToNewOrder
}) => {
  const [selectedCategory, setSelectedCategory] = useState(CATEGORIES[0]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobileOrderOpen, setMobileOrderOpen] = useState(false);

  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category);
    setMobileSidebarOpen(false);
  };

  const filteredProducts = useMemo(() => {
    const categoryProducts = products.filter(p => {
        if (selectedCategory === 'FREQUENT') return p.category === 'FREQUENT';
        return (p.category === selectedCategory || (p as any).originalCategory === selectedCategory);
    });
      
    return categoryProducts.filter(product =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [selectedCategory, searchTerm, products]);
  
  const isViewingHistory = viewedInvoiceNumber !== null;
  const displayOrder = isViewingHistory ? viewedOrder : activeOrder;
  const displayInvoiceNumber = isViewingHistory ? viewedInvoiceNumber : (editingInvoiceNumber || invoiceCounter);
  const isEditing = editingInvoiceNumber !== null;

  return (
    <div className="flex flex-1 overflow-hidden">
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        ></div>
      )}
      <CategorySidebar
        categories={CATEGORIES}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        isOpen={isMobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
      />
      <main className="flex flex-1 relative">
        <div className="flex-grow flex flex-col p-2 sm:p-4 overflow-hidden">
          <ProductGrid
            products={filteredProducts}
            onAddItem={onAddItem}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            activeOrderItems={activeOrder.items}
          />
        </div>
        <OrderPanel
          order={displayOrder}
          invoiceNumber={displayInvoiceNumber!}
          onUpdateQuantity={onUpdateQuantity}
          onRemoveItem={onRemoveItem}
          onClearOrder={onClearOrder}
          onBillOrder={onBillOrder}
          onHoldOrder={onHoldOrder}
          canHold={orders.length < 6}
          isReadOnly={isViewingHistory}
          isEditing={isEditing}
          onEditInvoice={() => onEditInvoice(displayInvoiceNumber!)}
          onDeleteInvoice={() => onDeleteInvoice(displayInvoiceNumber!)}
          isMobileOpen={isMobileOrderOpen}
          onMobileClose={() => setMobileOrderOpen(false)}
          billingDate={billingDate}
          onBillingDateChange={onBillingDateChange}
        />
        <div className="md:hidden fixed bottom-6 right-6 z-10">
          <button 
            onClick={() => setMobileOrderOpen(true)}
            className="bg-purple-800 text-white p-4 rounded-full shadow-lg flex items-center justify-center relative"
            aria-label="View current order"
          >
            <ShoppingCartIcon className="h-6 w-6" />
            {activeOrder.items.length > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full h-5 w-5 flex items-center justify-center border-2 border-white">
                {activeOrder.items.reduce((acc, item) => acc + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </main>
    </div>
  );
};

export default POSView;