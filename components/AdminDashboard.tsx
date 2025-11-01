import React, { useState } from 'react';
import { BilledItem, Expense, StockEntry, Product, ExpenseItem } from '../types.ts';
import ReportsPage from './ReportsPage.tsx';
import StockManagementPage from './StockManagementPage.tsx';
import ProductManagementPage from './ProductManagementPage.tsx';
import ExpenseManagementPage from './ExpenseManagementPage.tsx';
import DatabaseManagementPage from './DatabaseManagementPage.tsx';
import PWADiagnostics from './PWADiagnostics.tsx';
import { ChartBarIcon, DocumentTextIcon, TagIcon, ReceiptIcon, DatabaseIcon, ArrowDownTrayIcon } from './Icons.tsx';

interface AdminDashboardProps {
  billedItems: BilledItem[];
  expenses: Expense[];
  stockEntries: StockEntry[];
  products: Product[];
  expenseItems: ExpenseItem[];
  onAddStockEntry: (entry: Omit<StockEntry, 'id' | 'totalCost'>) => void;
  onUpdateStockEntry: (entry: StockEntry) => void;
  onDeleteStockEntry: (entryId: number) => void;
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (product: Product) => void;
  onDeleteProduct: (productId: number) => void;
  onAddExpenseItem: (item: Omit<ExpenseItem, 'id'>) => void;
  onUpdateExpenseItem: (item: ExpenseItem) => void;
  onDeleteExpenseItem: (itemId: number) => void;
  onNavigate?: (view: 'home' | 'pos' | 'admin') => void;
  onViewInvoice?: (invoiceNumber: number) => void;
  installPromptEvent?: Event | null;
  onInstallClick?: () => void;
}

type AdminTab = 'reports' | 'expenses' | 'items' | 'expenseItems' | 'database';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ 
  billedItems, expenses, stockEntries, products, expenseItems,
  onAddStockEntry, onUpdateStockEntry, onDeleteStockEntry, 
  onAddProduct, onUpdateProduct, onDeleteProduct,
  onAddExpenseItem, onUpdateExpenseItem, onDeleteExpenseItem,
  onNavigate, onViewInvoice,
  installPromptEvent, onInstallClick,
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('reports');

  const renderView = () => {
    switch (activeTab) {
      case 'reports':
        return <ReportsPage billedItems={billedItems} expenses={expenses} stockEntries={stockEntries} expenseItems={expenseItems} />;
      case 'expenses':
        return <StockManagementPage 
                  stockEntries={stockEntries} 
                  expenseItems={expenseItems}
                  onAddStockEntry={onAddStockEntry}
                  onUpdateStockEntry={onUpdateStockEntry}
                  onDeleteStockEntry={onDeleteStockEntry} 
                />;
      case 'items':
        return <ProductManagementPage 
                  products={products}
                  onAddProduct={onAddProduct}
                  onUpdateProduct={onUpdateProduct}
                  onDeleteProduct={onDeleteProduct}
                />;
      case 'expenseItems':
        return <ExpenseManagementPage
                  expenseItems={expenseItems}
                  onAdd={onAddExpenseItem}
                  onUpdate={onUpdateExpenseItem}
                  onDelete={onDeleteExpenseItem}
               />;
      case 'database':
        return <DatabaseManagementPage onNavigate={onNavigate} onViewInvoice={onViewInvoice} />;
      default:
        return null;
    }
  };

  return (
    <main className="flex-1 flex flex-col bg-gray-50">
        <div className="border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between px-6 py-2">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <button
                    onClick={() => setActiveTab('reports')}
                    className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'reports' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    <ChartBarIcon className="w-5 h-5 mr-2" />
                    Reports
                </button>
                <button
                    onClick={() => setActiveTab('expenses')}
                    className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'expenses' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    <DocumentTextIcon className="w-5 h-5 mr-2" />
                    Purchases &amp; Expenses
                </button>
                 <button
                    onClick={() => setActiveTab('items')}
                    className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'items' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    <TagIcon className="w-5 h-5 mr-2" />
                    Items
                </button>
                <button
                    onClick={() => setActiveTab('expenseItems')}
                    className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'expenseItems' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    <ReceiptIcon className="w-5 h-5 mr-2" />
                    Expense Items
                </button>
                <button
                    onClick={() => setActiveTab('database')}
                    className={`flex items-center whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'database' ? 'border-purple-500 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}`}
                >
                    <DatabaseIcon className="w-5 h-5 mr-2" />
                    Database
                </button>
                </nav>
                <div className="flex items-center gap-2">
                    {installPromptEvent && onInstallClick ? (
                        <button
                            onClick={onInstallClick}
                            className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 transition-all transform hover:scale-105 active:scale-95"
                            title="Install Tea Time POS App"
                        >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            <span>Install App</span>
                        </button>
                    ) : (
                        <button
                            onClick={() => {
                                // Fallback: Show instructions
                                const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
                                const isAndroid = /Android/.test(navigator.userAgent);
                                if (isIOS) {
                                    alert('To install on iOS:\n1. Tap the Share button (square with arrow)\n2. Tap "Add to Home Screen"\n3. Tap "Add"');
                                } else if (isAndroid) {
                                    alert('To install on Android:\n1. Tap the menu (3 dots)\n2. Tap "Install app" or "Add to Home screen"\n\nOr look for the install icon in your browser\'s address bar.');
                                } else {
                                    alert('To install this app:\n1. Look for the install icon in your browser\'s address bar\n2. Or use browser menu: Install App / Add to Home Screen\n\nMake sure you\'re using Chrome, Edge, or Safari for best PWA support.');
                                }
                            }}
                            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95"
                            title="PWA Installation Instructions"
                        >
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            <span>Install App</span>
                        </button>
                    )}
                </div>
            </div>
        </div>
        <div className="flex-1 p-4 sm:p-6 overflow-y-auto">
            <PWADiagnostics 
                installPromptEvent={installPromptEvent}
                onInstallClick={onInstallClick}
            />
            {renderView()}
        </div>
    </main>
  );
};

export default AdminDashboard;