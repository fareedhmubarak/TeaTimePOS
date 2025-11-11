import React, { useState, useMemo, useEffect } from "react";
import CategorySidebar from "./CategorySidebar.tsx";
import ProductGrid from "./ProductGrid.tsx";
import OrderPanel from "./OrderPanel.tsx";
import { Order, Product, CartItem, BilledItem, Category } from "../types.ts";
import { ShoppingCartIcon } from "./Icons.tsx";

interface POSViewProps {
  orders: Order[];
  activeOrderIndex: number;
  activeOrder: Order;
  products: Product[];
  categories: Category[];
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
  onRetryLoadProducts?: () => Promise<void>;
  onReorderCategories?: (newOrder: string[]) => void;
}

const POSView: React.FC<POSViewProps> = ({
  orders,
  activeOrderIndex,
  activeOrder,
  products,
  categories,
  billedItems,
  viewedInvoiceNumber,
  viewedOrder,
  invoiceCounter,
  editingInvoiceNumber,
  billingDate,
  onBillingDateChange,
  onAddItem,
  onUpdateQuantity,
  onRemoveItem,
  onClearOrder,
  onSelectHold,
  onCloseHold,
  onHoldOrder,
  onBillOrder,
  onViewInvoice,
  onEditInvoice,
  onDeleteInvoice,
  onGoToNewOrder,
  onRetryLoadProducts,
  onReorderCategories,
}) => {
  // Get all unique categories: ordered categories from DB + product categories not in DB
  const allCategories = useMemo(() => {
    // Get category names from ordered categories
    const orderedCategoryNames = categories.map(c => c.name);
    
    // Get unique product categories that aren't in the ordered list
    const productCats = products
      .map((p) => p.category)
      .filter(
        (cat, index, self) =>
          cat && 
          cat !== "FREQUENT" && 
          self.indexOf(cat) === index &&
          !orderedCategoryNames.includes(cat)
      );
    
    // Combine: ordered categories first, then product categories
    return [...orderedCategoryNames, ...productCats];
  }, [categories, products]);

  const [selectedCategory, setSelectedCategory] = useState(
    allCategories[0] || 'TEA'
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isMobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [isMobileOrderOpen, setMobileOrderOpen] = useState(false);

  // Update selected category if current one is removed or list changes
  useEffect(() => {
    if (!allCategories.includes(selectedCategory) && allCategories.length > 0) {
      setSelectedCategory(allCategories[0]);
    }
  }, [allCategories, selectedCategory]);

  const handleSelectCategory = (category: string) => {
    setSelectedCategory(category);
    setMobileSidebarOpen(false);
  };

  const filteredProducts = useMemo(() => {
    const categoryProducts = products.filter((p) => {
      if (selectedCategory === "FREQUENT") return p.category === "FREQUENT";
      return (
        p.category === selectedCategory ||
        (p as any).originalCategory === selectedCategory
      );
    });

    const filtered = categoryProducts.filter((product) =>
      product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Sort by display_order first (if available), then alphabetically
    return filtered.sort((a, b) => {
      // First sort by display_order (ascending) - products with display_order come first
      const aOrder = a.displayOrder || 999999;
      const bOrder = b.displayOrder || 999999;
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // If display_order is same or not set, sort alphabetically
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      return aName.localeCompare(bName);
    });
  }, [selectedCategory, searchTerm, products]);

  const isViewingHistory = viewedInvoiceNumber !== null;
  const displayOrder = isViewingHistory ? viewedOrder : activeOrder;
  const displayInvoiceNumber = isViewingHistory
    ? viewedInvoiceNumber
    : editingInvoiceNumber || invoiceCounter;
  const isEditing = editingInvoiceNumber !== null;

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        ></div>
      )}
      <CategorySidebar
        categories={allCategories}
        selectedCategory={selectedCategory}
        onSelectCategory={handleSelectCategory}
        isOpen={isMobileSidebarOpen}
        onClose={() => setMobileSidebarOpen(false)}
        onReorderCategories={onReorderCategories}
      />
      <main className="flex flex-1 relative h-full overflow-hidden">
        <div className="flex-grow flex flex-col p-1 sm:p-2 overflow-hidden h-full">
          <ProductGrid
            products={filteredProducts}
            onAddItem={onAddItem}
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            activeOrderItems={activeOrder.items}
            onRetryLoadProducts={onRetryLoadProducts}
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
          canHold={orders.length < 8}
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
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-sm font-bold rounded-full h-6 w-6 flex items-center justify-center border-2 border-white">
                {activeOrder.items.reduce(
                  (acc, item) => acc + item.quantity,
                  0
                )}
              </span>
            )}
          </button>
        </div>
      </main>
    </div>
  );
};

export default POSView;
