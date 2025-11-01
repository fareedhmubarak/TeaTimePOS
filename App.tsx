import React, { useState, useMemo, useEffect } from 'react';
import Header from './components/Header.tsx';
import HomeScreen from './components/HomeScreen.tsx';
import POSView from './components/POSView.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import ExpenseModal from './components/ExpenseModal.tsx';
import PasswordModal from './components/PasswordModal.tsx';
import OrderPlacedModal from './components/OrderPlacedModal.tsx';
import UpdateNotification from './components/UpdateNotification.tsx';
import { supabase } from './supabaseClient.ts';
import { Order, Product, CartItem, BilledItem, Expense, StockEntry, ExpenseItem } from './types.ts';

let orderCounter = 1;

// --- Data Mapping Functions ---
const mapInvoiceToBilledItems = (invoice: any, dailyInvoiceNumber: number): BilledItem[] => {
    // Use bill_date if available for accuracy, otherwise fallback to created_at
    const recordDate = invoice.bill_date ? new Date(invoice.bill_date) : new Date(invoice.created_at);
    // Adjust for timezone if parsing from a simple date string like 'YYYY-MM-DD'
    const timestamp = recordDate.getTime() + (invoice.bill_date ? recordDate.getTimezoneOffset() * 60000 : 0);
    const date = new Date(timestamp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    
    return (invoice.invoice_items || []).map((item: any) => ({
        invoiceNumber: dailyInvoiceNumber, // Use daily invoice number instead of database ID
        invoiceDbId: invoice.id, // Store database ID separately for operations
        productName: item.product_name,
        quantity: item.quantity,
        price: item.price_per_item * item.quantity,
        profit: item.profit_per_item * item.quantity,
        date: date,
        timestamp: timestamp,
        status: 'synced',
    }));
};

// Calculate daily invoice numbers for all invoices
const calculateDailyInvoiceNumbers = (invoices: any[]): Map<number, number> => {
    // Group invoices by date
    const invoicesByDate: { [date: string]: any[] } = {};
    
    invoices.forEach(invoice => {
        const recordDate = invoice.bill_date ? new Date(invoice.bill_date) : new Date(invoice.created_at);
        const timestamp = recordDate.getTime() + (invoice.bill_date ? recordDate.getTimezoneOffset() * 60000 : 0);
        const date = new Date(timestamp).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
        
        if (!invoicesByDate[date]) {
            invoicesByDate[date] = [];
        }
        invoicesByDate[date].push(invoice);
    });
    
    // Sort invoices within each date by ID (which reflects creation order) and assign sequential numbers
    const dbIdToDailyNumber = new Map<number, number>();
    
    Object.values(invoicesByDate).forEach(dateInvoices => {
        // Sort by ID to get creation order
        dateInvoices.sort((a, b) => a.id - b.id);
        
        // Assign sequential numbers starting from 1
        dateInvoices.forEach((invoice, index) => {
            dbIdToDailyNumber.set(invoice.id, index + 1);
        });
    });
    
    return dbIdToDailyNumber;
};

const mapPurchaseEntryToStockEntry = (entry: any): StockEntry => ({
    id: entry.id,
    date: entry.entry_date,
    primaryDescription: entry.primary_description,
    totalCost: entry.total_cost,
    billImageUrl: entry.bill_image_url,
    items: (entry.purchase_items || []).map((item: any) => ({
        id: item.id.toString(),
        name: item.name,
        quantity: item.quantity,
        cost: item.cost,
    }))
});


const ADMIN_PASSWORD = '08101990';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'pos' | 'admin'>('home');
  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [orderPlacedInfo, setOrderPlacedInfo] = useState<{ invoiceNumber: number; totalAmount: number } | null>(null);
  
  // App State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [installPromptEvent, setInstallPromptEvent] = useState<Event | null>(null);
  const [showUpdateNotification, setShowUpdateNotification] = useState(false);
  const [serviceWorkerRegistration, setServiceWorkerRegistration] = useState<ServiceWorkerRegistration | null>(null);
  
  // POS State
  const [orders, setOrders] = useState<Order[]>([{ id: orderCounter++, items: [] }]);
  const [activeOrderIndex, setActiveOrderIndex] = useState(0);
  const [viewedInvoiceNumber, setViewedInvoiceNumber] = useState<number | null>(null);
  const [editingInvoiceNumber, setEditingInvoiceNumber] = useState<number | null>(null);
  const [billingDate, setBillingDate] = useState(new Date());
  
  // Data State (from Supabase)
  const [products, setProducts] = useState<Product[]>([]);
  const [billedItems, setBilledItems] = useState<BilledItem[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);

  // Initialize: Clear any existing auth on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('adminAuthenticated');
    }
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
        try {
            setLoading(true);
            const [
                productsData,
                expenseItemsData,
                expensesData,
                invoicesData,
                stockEntriesData
            ] = await Promise.all([
                supabase.from('products').select('*'),
                supabase.from('expense_items').select('*'),
                supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
                supabase.from('invoices').select('*, invoice_items(*)').order('id', { ascending: false }).limit(100), // Load more for accurate daily invoice numbers
                supabase.from('purchase_entries').select('*, purchase_items(*)').order('entry_date', { ascending: false })
            ]);

            // Check for errors in parallel fetches
            const errors = [productsData.error, expenseItemsData.error, expensesData.error, invoicesData.error, stockEntriesData.error].filter(Boolean);
            if (errors.length > 0) {
                throw new Error(errors.map(e => e?.message).join(', '));
            }
            
            // Map and set state
            setProducts((productsData.data || []).map((p: any) => ({ ...p, imageUrl: p.image_url })));
            setExpenseItems((expenseItemsData.data || []).map((e: any) => ({ ...e, allowSubItems: e.allow_sub_items, subItems: e.sub_items })));
            setExpenses((expensesData.data || []).map((e: any) => ({ ...e, date: new Date(e.expense_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) })));
            
            // Calculate daily invoice numbers and map invoices
            const invoices = invoicesData.data || [];
            const dbIdToDailyNumber = calculateDailyInvoiceNumbers(invoices);
            const mappedBilledItems = invoices.flatMap((invoice: any) => {
                const dailyInvoiceNumber = dbIdToDailyNumber.get(invoice.id) || invoice.id;
                return mapInvoiceToBilledItems(invoice, dailyInvoiceNumber);
            });
            setBilledItems(mappedBilledItems);
            
            setStockEntries((stockEntriesData.data || []).map(mapPurchaseEntryToStockEntry));

        } catch (err: any) {
            console.error("Error fetching initial data:", err);
            setError(err.message || "Could not load data from the database.");
        } finally {
            setLoading(false);
        }
    };
    fetchInitialData();

    const handleBeforeInstallPrompt = (e: Event) => {
        console.log('PWA: Install prompt event received', e);
        e.preventDefault(); // Prevent the mini-infobar from appearing
        setInstallPromptEvent(e); // Stash the event so it can be triggered later.
    };

    // Check PWA installability
    const checkPWAInstallability = async () => {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    console.log('PWA: Service Worker registered', registration.scope);
                } else {
                    console.warn('PWA: Service Worker not registered');
                }
            } catch (err) {
                console.error('PWA: Service Worker check failed', err);
            }
        }

        // Check manifest
        try {
            const response = await fetch('/manifest.json');
            if (response.ok) {
                const manifest = await response.json();
                console.log('PWA: Manifest loaded', manifest);
            } else {
                console.error('PWA: Manifest not found');
            }
        } catch (err) {
            console.error('PWA: Manifest fetch failed', err);
        }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check installability after a short delay to ensure SW is registered
    setTimeout(checkPWAInstallability, 2000);

    // Service Worker update detection
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        setServiceWorkerRegistration(registration);
        
        // Check for updates every 30 seconds
        setInterval(() => {
          registration.update();
        }, 30000);
      });
      
      // Listen for update available event
      window.addEventListener('sw-update-available', () => {
        setShowUpdateNotification(true);
      });
      
      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SW_ACTIVATED') {
          console.log('Service Worker activated:', event.data.version);
        }
      });
    }

    return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleUpdateApp = () => {
    if (serviceWorkerRegistration && serviceWorkerRegistration.waiting) {
      // Tell the waiting service worker to skip waiting and activate
      serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
      // Reload the page
      window.location.reload();
    } else {
      // If no waiting worker, just reload
      window.location.reload();
    }
  };

  const activeOrder = orders[activeOrderIndex];
  
  // Helper function to get database ID from daily invoice number
  const getInvoiceDbId = (dailyInvoiceNumber: number): number | null => {
    const invoice = billedItems.find(item => item.invoiceNumber === dailyInvoiceNumber);
    return invoice?.invoiceDbId || null;
  };
  
  const nextInvoiceNumber = useMemo(() => {
    // Format the current billing date to match the format stored in billedItems
    const selectedDateString = billingDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });

    // Filter for invoices on the selected date
    const invoicesForDate = billedItems.filter(item => item.date === selectedDateString);

    if (invoicesForDate.length === 0) {
        return 1; // Start from 1 for a new day
    }

    // This logic isn't perfect without a dedicated daily invoice number column.
    // A simple count of unique invoices is more reliable here.
    const uniqueInvoiceIds = new Set(invoicesForDate.map(i => i.invoiceNumber));
    return uniqueInvoiceIds.size + 1;

  }, [billedItems, billingDate]);

  const handleNavigate = (newView: 'home' | 'pos' | 'admin') => {
    // ALWAYS require password for admin access
    if (newView === 'admin') {
      // Prevent navigation - show password modal instead
      setIsPasswordModalOpen(true);
      return; // CRITICAL: return prevents setView('admin') from executing
    }
    
    setView(newView);
    if (newView === 'pos') {
      setViewedInvoiceNumber(null);
      const lastIndex = orders.findIndex(o => o.items.length === 0);
      setActiveOrderIndex(lastIndex !== -1 ? lastIndex : orders.length - 1);
    }
  };

  const handlePasswordSuccess = () => {
    console.log('Password correct - granting admin access');
    setIsAdminAuthenticated(true);
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('adminAuthenticated', 'true');
    }
    setIsPasswordModalOpen(false);
    setView('admin');
  };

  const handlePasswordCancel = () => {
    setIsPasswordModalOpen(false);
  };

  const handleInstallClick = () => {
      if (installPromptEvent && (installPromptEvent as any).prompt) {
          (installPromptEvent as any).prompt(); // Show the install prompt
          (installPromptEvent as any).userChoice.then((choiceResult: { outcome: 'accepted' | 'dismissed' }) => {
              if (choiceResult.outcome === 'accepted') {
                  console.log('User accepted the install prompt');
              } else {
                  console.log('User dismissed the install prompt');
              }
              setInstallPromptEvent(null); // We can only use the prompt once.
          });
      }
  };

  // --- POS Functions (DB Integrated) ---
  const updateOrder = (updatedItems: CartItem[]) => {
    const newOrders = [...orders];
    newOrders[activeOrderIndex] = { ...newOrders[activeOrderIndex], items: updatedItems };
    setOrders(newOrders);
  };

  const handleAddItem = (product: Product) => {
    if (viewedInvoiceNumber !== null) handleGoToNewOrder();
    const existingItem = activeOrder.items.find(item => item.product.id === product.id);
    if (existingItem) {
      updateOrder(activeOrder.items.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      updateOrder([...activeOrder.items, { product, quantity: 1 }]);
    }
  };

  const handleUpdateQuantity = (productId: number, newQuantity: number) => {
    if (newQuantity <= 0) handleRemoveItem(productId);
    else updateOrder(activeOrder.items.map(item => item.product.id === productId ? { ...item, quantity: newQuantity } : item));
  };

  const handleRemoveItem = (productId: number) => {
    updateOrder(activeOrder.items.filter(item => item.product.id !== productId));
  };

  const handleClearOrder = () => {
    updateOrder([]);
    if (editingInvoiceNumber) setEditingInvoiceNumber(null);
  };

  const handleSelectHold = (index: number) => {
    setViewedInvoiceNumber(null);
    setActiveOrderIndex(index);
  };

  const handleHoldOrder = () => {
    if (editingInvoiceNumber) { alert("Please update or clear the bill before setting to pending."); return; }
    if (orders.length >= 6) { alert("Maximum of 5 orders can be pending."); return; }
    if (activeOrder.items.length === 0) { alert("Cannot set an empty order to pending."); return; }
    const newOrders = [...orders, { id: orderCounter++, items: [] }];
    setOrders(newOrders);
    setActiveOrderIndex(newOrders.length - 1);
  };
  
  const handleCloseHold = (indexToClose: number) => {
    if (orders.length <= 1) { handleClearOrder(); return; }
    const newOrders = orders.filter((_, index) => index !== indexToClose);
    let newActiveIndex = activeOrderIndex;
    if (indexToClose === activeOrderIndex) {
      newActiveIndex = 0;
      setEditingInvoiceNumber(null);
    } else if (indexToClose < activeOrderIndex) {
      newActiveIndex = activeOrderIndex - 1;
    }
    setOrders(newOrders);
    setActiveOrderIndex(newActiveIndex);
  };

  const handleUpdateBill = async () => {
    if (activeOrder.items.length === 0) { alert("Cannot update to an empty bill."); return; }
    if (editingInvoiceNumber === null) return;
    
    const invoiceDbId = getInvoiceDbId(editingInvoiceNumber);
    if (!invoiceDbId) {
        alert("Could not find invoice in database.");
        return;
    }
    
    setLoading(true);
    let success = false;
    
    try {
        const { data: currentProductsData, error: productFetchError } = await supabase.from('products').select('id');
        if (productFetchError) {
            throw new Error(`Could not verify products before updating: ${productFetchError.message}`);
        }
        const productIdsInDB = new Set((currentProductsData || []).map(p => p.id));

        const total_amount = activeOrder.items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
        const total_profit = activeOrder.items.reduce((sum, item) => sum + item.product.profit * item.quantity, 0);
        
        // Step 1: Delete old invoice items
        const { error: deleteError } = await supabase
            .from('invoice_items')
            .delete()
            .eq('invoice_id', invoiceDbId);

        if (deleteError) throw new Error(`Failed to clear old items: ${deleteError.message}`);

        // Step 2: Insert new invoice items
        const itemsToInsert = activeOrder.items.map(item => {
            const isProductValid = item.product.id > 0 && productIdsInDB.has(item.product.id);
            return {
                invoice_id: invoiceDbId,
                product_id: isProductValid ? item.product.id : null,
                product_name: item.product.name,
                quantity: item.quantity,
                price_per_item: item.product.price,
                profit_per_item: item.product.profit
            };
        });

        if (itemsToInsert.length > 0) {
            const { error: insertError } = await supabase
                .from('invoice_items')
                .insert(itemsToInsert);
            if (insertError) throw new Error(`Failed to insert new items: ${insertError.message}`);
        }

        // Step 3: Update the main invoice record with new totals
        const { error: updateError } = await supabase
            .from('invoices')
            .update({
                total_amount: total_amount,
                total_profit: total_profit
            })
            .eq('id', invoiceDbId);
        
        if (updateError) throw new Error(`Failed to update invoice totals: ${updateError.message}`);

        success = true;

    } catch(error: any) {
        alert(`Error updating invoice: ${error.message}`);
        if (error.message.includes('insert new items')) {
            alert('CRITICAL: The invoice items could not be saved. The original invoice is now empty. Please re-add items or restore from a backup.');
        }
    } finally {
        setLoading(false);
    }

    if (!success) return;

    // Update local state on success
    const billDateString = new Date(billedItems.find(b => b.invoiceNumber === editingInvoiceNumber)?.timestamp || Date.now()).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    const updatedBilledItemsForInvoice: BilledItem[] = activeOrder.items.map(item => ({
        invoiceNumber: editingInvoiceNumber!,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price * item.quantity,
        profit: item.product.profit * item.quantity,
        date: billDateString,
        timestamp: new Date(billDateString).getTime(),
        status: 'synced'
    }));

    setBilledItems(prev => {
        const otherItems = prev.filter(item => item.invoiceNumber !== editingInvoiceNumber);
        return [...updatedBilledItemsForInvoice, ...otherItems];
    });
    
    alert(`Invoice #${editingInvoiceNumber} has been updated.`);
    setEditingInvoiceNumber(null);
    handleClearOrder();
  };

  const handleBillOrder = async () => {
    if (editingInvoiceNumber !== null) {
      await handleUpdateBill();
      return;
    }
    if (activeOrder.items.length === 0) {
      alert("Cannot bill an empty order.");
      return;
    }
  
    const itemsToBill = [...activeOrder.items];
    const dailyInvoiceNumber = nextInvoiceNumber; // Use the calculated daily invoice number
    const billDateString = billingDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    // This combines the user-selected date with the current time for the timestamp.
    const timestamp = new Date(billingDate).setHours(new Date().getHours(), new Date().getMinutes(), new Date().getSeconds());

    // 1. Optimistic UI Update
    const newBilledItems: BilledItem[] = itemsToBill.map(item => ({
      invoiceNumber: dailyInvoiceNumber,
      productName: item.product.name,
      quantity: item.quantity,
      price: item.product.price * item.quantity,
      profit: item.product.profit * item.quantity,
      date: billDateString,
      timestamp: timestamp,
      status: 'pending',
    }));
  
    setBilledItems(prev => [...newBilledItems, ...prev]);
  
    const isLastOrder = activeOrderIndex === orders.length - 1;
    if (orders.length > 1 && !isLastOrder) {
      const newOrders = orders.filter((o) => o.id !== activeOrder.id);
      setOrders(newOrders);
      setActiveOrderIndex(newOrders.length - 1);
    } else {
      handleClearOrder();
    }
  
    // 2. Background Database Sync
    let newInvoiceId: number | null = null;
    try {
      // Fetch current product IDs to avoid foreign key errors on deleted products
      const { data: currentProductsData, error: productFetchError } = await supabase.from('products').select('id');
      if (productFetchError) {
        throw new Error(`Could not verify products before billing: ${productFetchError.message}`);
      }
      const productIdsInDB = new Set((currentProductsData || []).map(p => p.id));

      const total_amount = itemsToBill.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const total_profit = itemsToBill.reduce((sum, item) => sum + item.product.profit * item.quantity, 0);
      
      // FIX: Align date format with other working parts of the app (e.g., expenses).
      // The `bill_date` column in the database likely expects a 'YYYY-MM-DD' string,
      // and sending a full timestamp was causing a schema cache error.
      const billDateForDB = billingDate.toISOString().split('T')[0];

      // Use a single, atomic insert for the invoice record.
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          total_amount,
          total_profit,
          bill_date: billDateForDB,
        })
        .select()
        .single();
      
      if (invoiceError || !invoiceData) {
        throw new Error(invoiceError?.message || "Failed to create invoice record.");
      }
      
      newInvoiceId = invoiceData.id;

      // Prepare and insert invoice items
      const itemsToInsert = itemsToBill.map(item => {
        const isProductValid = item.product.id > 0 && productIdsInDB.has(item.product.id);
        return {
          invoice_id: newInvoiceId,
          product_id: isProductValid ? item.product.id : null,
          product_name: item.product.name,
          quantity: item.quantity,
          price_per_item: item.product.price,
          profit_per_item: item.product.profit,
        };
      });

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsToInsert);
        
      if (itemsError) {
        // If items fail to insert, the entire transaction is rolled back below.
        throw new Error(itemsError.message || "Failed to save invoice items.");
      }
  
      // 3. Sync Success: Update local state with real data - keep daily invoice number, add database ID
      setBilledItems(prev =>
        prev.map(item =>
          item.invoiceNumber === dailyInvoiceNumber && item.status === 'pending'
            ? { ...item, invoiceDbId: newInvoiceId!, status: 'synced' }
            : item
        )
      );
      
      // 4. Show order placed modal
      const totalAmount = itemsToBill.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      setOrderPlacedInfo({ invoiceNumber: dailyInvoiceNumber, totalAmount });
    } catch (err: any) {
      // 4. Sync Failure: Rollback and Revert UI
      console.error("Optimistic billing failed:", err);
      alert(`Failed to save order to the database: ${err.message}. The order has been moved to 'Held' for you to retry.`);
  
      // If an invoice was partially created (i.e., the invoice insert succeeded but items insert failed),
      // roll it back to prevent inconsistent data.
      if (newInvoiceId) {
          console.error(`An error occurred. Rolling back invoice #${newInvoiceId}...`);
          // This delete is critical for data integrity.
          await supabase.from('invoices').delete().eq('id', newInvoiceId);
      }
      
      // Remove the temporary 'pending' items from the UI
      setBilledItems(prev => prev.filter(item => !(item.invoiceNumber === dailyInvoiceNumber && item.status === 'pending')));
  
      // Restore the failed order to a pending slot so it's not lost
      setOrders(prevOrders => {
        const lastOrder = prevOrders[prevOrders.length - 1];
        if (prevOrders.length >= 6) {
          alert("Cannot add to pending because pending orders are full. Restoring order in the current tab instead.");
          const restoredOrders = [...prevOrders];
          restoredOrders[prevOrders.length - 1].items = itemsToBill;
          return restoredOrders;
        }
  
        const failedOrderAsHold = { id: orderCounter++, items: itemsToBill };
        return [
          ...prevOrders.slice(0, -1),
          failedOrderAsHold,
          lastOrder
        ];
      });
    }
  };


  const [viewedInvoiceContext, setViewedInvoiceContext] = useState<{ date?: string; timestamp?: number } | null>(null);
  
  const handleViewInvoice = (invoiceNumber: number, invoiceDate?: string, invoiceTimestamp?: number) => {
    setViewedInvoiceNumber(invoiceNumber);
    setViewedInvoiceContext(invoiceDate || invoiceTimestamp ? { date: invoiceDate, timestamp: invoiceTimestamp } : null);
    
    // Set billing date to the invoice's date when viewing
    if (invoiceTimestamp) {
      setBillingDate(new Date(invoiceTimestamp));
    } else if (invoiceDate) {
      // Parse the date string (M/D/YYYY format)
      const [month, day, year] = invoiceDate.split('/').map(Number);
      setBillingDate(new Date(year, month - 1, day, 12, 0, 0));
    }
  };
  
  const handleEditInvoice = (invoiceNumber: number) => {
    if (activeOrder.items.length > 0) { alert("Please bill or set your current active order to pending before editing."); return; }
    const itemsForInvoice = billedItems.filter(item => item.invoiceNumber === invoiceNumber);
    if (itemsForInvoice.length === 0) { alert("Cannot edit an empty or invalid invoice."); return; }
    
    // Set billing date to the date of the invoice being edited
    const invoiceDate = itemsForInvoice[0].timestamp;
    setBillingDate(new Date(invoiceDate));

    const cartItems: CartItem[] = itemsForInvoice.map(billedItem => {
        const product = products.find(p => p.name === billedItem.productName);
        return { 
            product: product || { id: -1, name: billedItem.productName, price: billedItem.price / billedItem.quantity, profit: 0, category: 'Unknown', imageUrl: '' },
            quantity: billedItem.quantity 
        };
    });
    updateOrder(cartItems);
    setEditingInvoiceNumber(invoiceNumber);
    setViewedInvoiceNumber(null);
  };

  const handleDeleteInvoice = async (invoiceNumber: number) => {
    if (window.confirm(`Are you sure you want to delete Invoice #${invoiceNumber}? This action cannot be undone.`)) {
        setLoading(true);
        const invoiceDbId = getInvoiceDbId(invoiceNumber);
        if (!invoiceDbId) {
            alert("Could not find invoice in database.");
            setLoading(false);
            return;
        }
        
        const { error } = await supabase.from('invoices').delete().eq('id', invoiceDbId);
        if(error) { alert(`Failed to delete invoice: ${error.message}`); }
        else {
            setBilledItems(prev => prev.filter(item => item.invoiceNumber !== invoiceNumber));
            handleGoToNewOrder();
            alert(`Invoice #${invoiceNumber} has been deleted.`);
        }
        setLoading(false);
    }
  };

  const handleGoToNewOrder = () => {
    setViewedInvoiceNumber(null);
    setViewedInvoiceContext(null); // Clear invoice context
    setBillingDate(new Date()); // Reset to today for new orders
    const lastIndex = orders.findIndex(o => o.items.length === 0);
    setActiveOrderIndex(lastIndex !== -1 ? lastIndex : orders.length - 1);
  };

  // --- Admin Functions (DB Integrated) ---
  const handleAddExpense = async (description: string, amount: number, date: string) => {
    const { data, error } = await supabase.from('expenses').insert({ expense_date: date, description, amount }).select().single();
    if(error) { alert(`Failed to add expense: ${error.message}`); }
    else {
        const newExpense: Expense = { id: data.id, description: data.description, amount: data.amount, date: new Date(data.expense_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) };
        setExpenses(prev => [newExpense, ...prev].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    }
  };

  const handleAddStockEntry = async (entry: Omit<StockEntry, 'id' | 'totalCost'>) => {
    setLoading(true);
    const total_cost = entry.items.reduce((sum, item) => sum + (item.cost || 0) * (item.quantity || 0), 0);
    const { data: entryData, error: entryError } = await supabase.from('purchase_entries').insert({
        entry_date: entry.date,
        primary_description: entry.primaryDescription,
        total_cost,
        bill_image_url: entry.billImageUrl
    }).select().single();

    if(entryError || !entryData) { alert(`Failed to create purchase entry: ${entryError?.message}`); setLoading(false); return; }

    const itemsToInsert = entry.items.map(item => ({ purchase_entry_id: entryData.id, ...item }));
    const { error: itemsError } = await supabase.from('purchase_items').insert(itemsToInsert);
    if(itemsError) { alert(`Failed to save purchase items: ${itemsError.message}`); setLoading(false); return; }

    const newEntry = mapPurchaseEntryToStockEntry({ ...entryData, purchase_items: entry.items });
    setStockEntries(prev => [newEntry, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setLoading(false);
  };

  const handleUpdateStockEntry = async (updatedEntry: StockEntry) => {
    setLoading(true);
    const total_cost = updatedEntry.items.reduce((sum, item) => sum + (item.cost || 0) * (item.quantity || 0), 0);
    const { error: updateError } = await supabase.from('purchase_entries').update({
        entry_date: updatedEntry.date,
        primary_description: updatedEntry.primaryDescription,
        total_cost,
        bill_image_url: updatedEntry.billImageUrl
    }).eq('id', updatedEntry.id);
    if(updateError) { alert(`Failed to update entry: ${updateError.message}`); setLoading(false); return; }

    const { error: deleteError } = await supabase.from('purchase_items').delete().eq('purchase_entry_id', updatedEntry.id);
    if(deleteError) { alert(`Failed to clear old items: ${deleteError.message}`); setLoading(false); return; }

    const itemsToInsert = updatedEntry.items.map(item => ({ purchase_entry_id: updatedEntry.id, ...item }));
    const { error: insertError } = await supabase.from('purchase_items').insert(itemsToInsert);
    if(insertError) { alert(`Failed to save new items: ${insertError.message}`); setLoading(false); return; }

    setStockEntries(prev => prev.map(e => e.id === updatedEntry.id ? { ...updatedEntry, totalCost: total_cost } : e).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
    setLoading(false);
  };

  const handleDeleteStockEntry = async (entryId: number) => {
    if (window.confirm('Are you sure you want to delete this stock entry?')) {
        setLoading(true);
        const { error } = await supabase.from('purchase_entries').delete().eq('id', entryId);
        if(error) { alert(`Failed to delete entry: ${error.message}`); }
        else { setStockEntries(prev => prev.filter(entry => entry.id !== entryId)); }
        setLoading(false);
    }
  };
  
  const handleAddProduct = async (productData: Omit<Product, 'id'>) => {
    const { data, error } = await supabase.from('products').insert({ name: productData.name, price: productData.price, profit: productData.profit, category: productData.category, image_url: productData.imageUrl }).select().single();
    if(error) { alert(`Failed to add product: ${error.message}`); }
    else { setProducts(prev => [...prev, { ...data, imageUrl: data.image_url }]); }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    const { data, error } = await supabase.from('products').update({ name: updatedProduct.name, price: updatedProduct.price, profit: updatedProduct.profit, category: updatedProduct.category, image_url: updatedProduct.imageUrl }).eq('id', updatedProduct.id).select().single();
    if(error) { alert(`Failed to update product: ${error.message}`); }
    else { setProducts(prev => prev.map(p => p.id === updatedProduct.id ? { ...data, imageUrl: data.image_url } : p)); }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (window.confirm("Are you sure? This may affect past reports.")) {
       const { error } = await supabase.from('products').delete().eq('id', productId);
       if(error) { alert(`Failed to delete product: ${error.message}`); }
       else { setProducts(prev => prev.filter(p => p.id !== productId)); }
    }
  };
  
  const handleAddExpenseItem = async (item: Omit<ExpenseItem, 'id'>) => {
    const { data, error } = await supabase.from('expense_items').insert({ name: item.name, category: item.category, allow_sub_items: item.allowSubItems, sub_items: item.subItems }).select().single();
    if (error) { alert(`Failed to add expense item: ${error.message}`); }
    else { setExpenseItems(prev => [...prev, { ...data, allowSubItems: data.allow_sub_items, subItems: data.sub_items }]); }
  };

  const handleUpdateExpenseItem = async (updatedItem: ExpenseItem) => {
    const { data, error } = await supabase.from('expense_items').update({ name: updatedItem.name, category: updatedItem.category, allow_sub_items: updatedItem.allowSubItems, sub_items: updatedItem.subItems }).eq('id', updatedItem.id).select().single();
    if (error) { alert(`Failed to update expense item: ${error.message}`); }
    else { setExpenseItems(prev => prev.map(e => e.id === updatedItem.id ? { ...data, allowSubItems: data.allow_sub_items, subItems: data.sub_items } : e)); }
  };

  const handleDeleteExpenseItem = async (itemId: number) => {
    if (window.confirm('Are you sure you want to delete this expense item?')) {
        const { error } = await supabase.from('expense_items').delete().eq('id', itemId);
        if(error) { alert(`Failed to delete: ${error.message}`); }
        else { setExpenseItems(prev => prev.filter(e => e.id !== itemId)); }
    }
  };

  // --- Memoized derived state ---
  const viewedOrder = useMemo(() => {
    if (viewedInvoiceNumber === null) return null;
    
    // Filter by invoice number first
    let itemsForInvoice = billedItems.filter(item => item.invoiceNumber === viewedInvoiceNumber);
    
    // If we have context (date/timestamp), use it to narrow down to the exact invoice
    if (viewedInvoiceContext) {
      const contextFiltered = itemsForInvoice.filter(item => {
        if (viewedInvoiceContext.date && item.date !== viewedInvoiceContext.date) return false;
        if (viewedInvoiceContext.timestamp && Math.abs(item.timestamp - viewedInvoiceContext.timestamp!) > 60000) return false; // Within 1 minute
        return true;
      });
      
      // Use context-filtered items if found, otherwise fall back to all items with that number
      if (contextFiltered.length > 0) {
        itemsForInvoice = contextFiltered;
      } else {
        // If context didn't match, try to find items by date group (most recent date with this invoice number)
        const itemsByDate: { [date: string]: BilledItem[] } = {};
        itemsForInvoice.forEach(item => {
          if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
          itemsByDate[item.date].push(item);
        });
        
        // Get the most recent date's items
        const dates = Object.keys(itemsByDate).sort((a, b) => {
          const dateA = new Date(itemsByDate[a][0].timestamp);
          const dateB = new Date(itemsByDate[b][0].timestamp);
          return dateB.getTime() - dateA.getTime();
        });
        
        itemsForInvoice = dates.length > 0 ? itemsByDate[dates[0]] : itemsForInvoice;
      }
    } else {
      // No context - group by date and use the most recent date's items (but prefer today's if available)
      const itemsByDate: { [date: string]: BilledItem[] } = {};
      itemsForInvoice.forEach(item => {
        if (!itemsByDate[item.date]) itemsByDate[item.date] = [];
        itemsByDate[item.date].push(item);
      });
      
      // If we have today's date, prefer it
      const today = new Date();
      const todayDateString = today.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
      
      if (itemsByDate[todayDateString] && itemsByDate[todayDateString].length > 0) {
        itemsForInvoice = itemsByDate[todayDateString];
      } else {
        // Otherwise, get the most recent date's items
        const dates = Object.keys(itemsByDate).sort((a, b) => {
          const dateA = new Date(itemsByDate[a][0].timestamp);
          const dateB = new Date(itemsByDate[b][0].timestamp);
          return dateB.getTime() - dateA.getTime();
        });
        
        itemsForInvoice = dates.length > 0 ? itemsByDate[dates[0]] : itemsForInvoice;
      }
    }
    
    if (itemsForInvoice.length === 0) return { id: viewedInvoiceNumber!, items: [] };
    
    const cartItems: CartItem[] = itemsForInvoice.map(billedItem => {
        const product = products.find(p => p.name === billedItem.productName);
        return { product: product || { id: -1, name: billedItem.productName, price: billedItem.price / billedItem.quantity, profit: 0, category: 'Unknown', imageUrl: '' }, quantity: billedItem.quantity };
    });
    return { id: viewedInvoiceNumber!, items: cartItems };
  }, [viewedInvoiceNumber, viewedInvoiceContext, billedItems, products]);
  
  const dailyExpenseItems = useMemo(() => {
    return expenseItems.filter(item => item.category === 'Daily');
  }, [expenseItems]);


  const renderContent = () => {
    switch (view) {
      case 'home':
        return <HomeScreen 
                  onNavigate={handleNavigate} 
                  installPromptEvent={installPromptEvent}
                  onInstallClick={handleInstallClick}
                />;
      case 'pos':
        return (
          <POSView
            orders={orders}
            activeOrderIndex={activeOrderIndex}
            activeOrder={activeOrder}
            products={products}
            billedItems={billedItems}
            viewedInvoiceNumber={viewedInvoiceNumber}
            viewedOrder={viewedOrder}
            invoiceCounter={nextInvoiceNumber}
            editingInvoiceNumber={editingInvoiceNumber}
            billingDate={billingDate}
            onBillingDateChange={setBillingDate}
            onAddItem={handleAddItem}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
            onClearOrder={handleClearOrder}
            onSelectHold={handleSelectHold}
            onCloseHold={handleCloseHold}
            onHoldOrder={handleHoldOrder}
            onBillOrder={handleBillOrder}
            onViewInvoice={handleViewInvoice}
            onEditInvoice={handleEditInvoice}
            onDeleteInvoice={handleDeleteInvoice}
            onGoToNewOrder={handleGoToNewOrder}
          />
        );
      case 'admin':
        return (
            <AdminDashboard
                onNavigate={handleNavigate}
                onViewInvoice={handleViewInvoice}
                billedItems={billedItems} 
                expenses={expenses}
                stockEntries={stockEntries}
                products={products}
                expenseItems={expenseItems}
                onAddStockEntry={handleAddStockEntry}
                onUpdateStockEntry={handleUpdateStockEntry}
                onDeleteStockEntry={handleDeleteStockEntry}
                onAddProduct={handleAddProduct}
                onUpdateProduct={handleUpdateProduct}
                onDeleteProduct={handleDeleteProduct}
                onAddExpenseItem={handleAddExpenseItem}
                onUpdateExpenseItem={handleUpdateExpenseItem}
                onDeleteExpenseItem={handleDeleteExpenseItem}
                installPromptEvent={installPromptEvent}
                onInstallClick={handleInstallClick}
            />
        );
      default:
        return <HomeScreen 
                  onNavigate={handleNavigate} 
                  installPromptEvent={installPromptEvent}
                  onInstallClick={handleInstallClick}
                />;
    }
  }

  if (loading && products.length === 0) {
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="text-3xl font-bold text-purple-800">Tea Time POS</div>
            <div className="mt-4 text-gray-600">Connecting to database...</div>
        </div>
    );
  }

  if (error) {
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-red-50 p-4">
            <div className="text-2xl font-bold text-red-700">Connection Error</div>
            <p className="mt-2 text-red-600 text-center">Could not connect to the Supabase database.</p>
            <p className="mt-4 text-sm text-gray-600 text-center">Please ensure you have correctly configured your Supabase URL and anon key in the `supabaseClient.ts` file and that your internet connection is active.</p>
            <pre className="mt-2 p-2 bg-red-100 text-red-800 text-xs rounded-md text-left max-w-full overflow-x-auto">{error}</pre>
        </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 font-sans text-gray-800">
      {loading && (
        <div className="fixed top-0 left-0 w-full h-full bg-black bg-opacity-20 z-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
        </div>
      )}
      <Header
        orders={orders}
        activeOrderIndex={activeOrderIndex}
        onSelectHold={handleSelectHold}
        onCloseHold={handleCloseHold}
        onNavigate={handleNavigate}
        currentView={view}
        billedItems={billedItems}
        onViewInvoice={handleViewInvoice}
        onGoToNewOrder={handleGoToNewOrder}
        isViewingHistory={viewedInvoiceNumber !== null}
        onAddExpenseClick={() => setExpenseModalOpen(true)}
      />
      {renderContent()}
      <ExpenseModal 
        isOpen={isExpenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onAddExpense={handleAddExpense}
        dailyExpenseItems={dailyExpenseItems}
      />
      <PasswordModal
        isOpen={isPasswordModalOpen}
        onClose={handlePasswordCancel}
        onSuccess={handlePasswordSuccess}
        correctPassword={ADMIN_PASSWORD}
      />
      <UpdateNotification
        isVisible={showUpdateNotification}
        onUpdate={handleUpdateApp}
        onDismiss={() => setShowUpdateNotification(false)}
      />
      {orderPlacedInfo && (
        <OrderPlacedModal
          isOpen={!!orderPlacedInfo}
          onClose={() => setOrderPlacedInfo(null)}
          onPrint={() => {
            // Find the invoice items and print
            const invoiceItems = billedItems.filter(item => item.invoiceNumber === orderPlacedInfo.invoiceNumber);
            if (invoiceItems.length > 0) {
              // Create print window
              const printWindow = window.open('', '_blank');
              if (!printWindow) {
                alert('Please allow pop-ups to print receipts');
                return;
              }

              const dateStr = new Date(invoiceItems[0].timestamp).toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric'
              });
              const timeStr = new Date(invoiceItems[0].timestamp).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
              });

              printWindow.document.write(`
                <!DOCTYPE html>
                <html>
                  <head>
                    <title>Invoice #${orderPlacedInfo.invoiceNumber}</title>
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
                        <span>${orderPlacedInfo.invoiceNumber}</span>
                      </div>
                      <div>
                        <span>Date:</span>
                        <span>${dateStr} ${timeStr}</span>
                      </div>
                    </div>
                    <div class="items">
                      ${invoiceItems.map(item => `
                        <div class="item">
                          <span class="item-name">${item.productName}</span>
                          <span class="item-qty">Qty: ${item.quantity}</span>
                          <span class="item-price">₹${item.price.toFixed(2)}</span>
                        </div>
                      `).join('')}
                    </div>
                    <div class="total">
                      <div class="total-label">Total Amount</div>
                      <div class="total-amount">₹${orderPlacedInfo.totalAmount.toFixed(2)}</div>
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
            }
            setOrderPlacedInfo(null);
          }}
          invoiceNumber={orderPlacedInfo.invoiceNumber}
          totalAmount={orderPlacedInfo.totalAmount}
        />
      )}
    </div>
  );
};

export default App;