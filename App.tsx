import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Header from './components/Header.tsx';
import HomeScreen from './components/HomeScreen.tsx';
import POSView from './components/POSView.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import ExpenseModal from './components/ExpenseModal.tsx';
import PasswordModal from './components/PasswordModal.tsx';
import UpdateNotification from './components/UpdateNotification.tsx';
import PrinterSelectionModal from './components/PrinterSelectionModal.tsx';
import { supabase } from './supabaseClient.ts';
import { deleteProductImage } from './utils/imageUpload.ts';
import { printReceipt, PrintData } from './utils/printer.ts';

let orderCounter = 1;

// --- Data Mapping Functions ---
const mapInvoiceToBilledItems = (invoice: any, dailyInvoiceNumber: number): BilledItem[] => {
    // Use bill_date for display date if available, otherwise use created_at
    // Ensure consistent date formatting across the app
    let date: string;
    if (invoice.bill_date) {
        // bill_date is DATE type (YYYY-MM-DD format)
        const dateObj = new Date(invoice.bill_date + 'T00:00:00');
        date = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    } else {
        // Extract date from created_at (TIMESTAMPTZ)
        const dateObj = new Date(invoice.created_at);
        date = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    }
    
    // Always use created_at for timestamp to preserve the actual order time (for charts)
    // bill_date is typically DATE type (date-only) which defaults to midnight
    const timestamp = new Date(invoice.created_at).getTime();
    
    // If invoice has no items, return empty array (invoice still counted in daily numbers)
    const items = invoice.invoice_items || [];
    if (items.length === 0) {
        return []; // Empty invoice - no billed items, but invoice number is still assigned
    }
    
    return items.map((item: any) => ({
        invoiceNumber: dailyInvoiceNumber, // Use daily invoice number instead of database ID
        invoiceDbId: invoice.id, // Store database ID separately for operations
        productName: item.product_name,
        quantity: item.quantity,
        price: item.price_per_item * item.quantity,
        profit: item.profit_per_item * item.quantity,
        date: date,
        timestamp: timestamp, // Use created_at timestamp to preserve time component
        status: 'synced',
    }));
};

// Calculate daily invoice numbers for all invoices
const calculateDailyInvoiceNumbers = (invoices: any[]): Map<number, number> => {
    // Group invoices by date - use bill_date if available, otherwise created_at
    const invoicesByDate: { [date: string]: any[] } = {};
    
    invoices.forEach(invoice => {
        // Use bill_date if available (DATE type), otherwise use created_at date part
        let dateStr: string;
        if (invoice.bill_date) {
            // bill_date is already a DATE type (YYYY-MM-DD format)
            const dateObj = new Date(invoice.bill_date + 'T00:00:00');
            dateStr = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
        } else {
            // Extract date from created_at (TIMESTAMPTZ)
            const dateObj = new Date(invoice.created_at);
            dateStr = dateObj.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
        }
        
        if (!invoicesByDate[dateStr]) {
            invoicesByDate[dateStr] = [];
        }
        invoicesByDate[dateStr].push(invoice);
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


const ADMIN_PASSWORD = '0830';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'pos' | 'admin'>('home');
  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isPrinterSelectionModalOpen, setIsPrinterSelectionModalOpen] = useState(false);
  const [pendingPrintData, setPendingPrintData] = useState<PrintData | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
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
  // Get today's date in IST (India Standard Time)
  // Uses browser's local timezone (should be IST if user is in India)
  // This ensures the billing date matches the actual date in India
  const getTodayISTDate = () => {
    const now = new Date();
    // Use local date components (browser timezone, should be IST in India)
    // Set time to noon to avoid timezone edge cases
    return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
  };
  
  const [billingDate, setBillingDate] = useState(getTodayISTDate());
  
  // Data State (from Supabase)
  const [products, setProducts] = useState<Product[]>([]);
  const [billedItems, setBilledItems] = useState<BilledItem[]>([]);
  const [allInvoices, setAllInvoices] = useState<any[]>([]); // Store all invoices for accurate counting
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);


  // Auto-print when order is placed if "Save & Print Mode" is enabled
  // DISABLED: User wants manual print only, no auto-print
  // useEffect(() => {
  //   if (!orderPlacedInfo || isPrinting) return;

  //   const autoPrint = async () => {
  //     setIsPrinting(true);
  //     try {
  //       // Check if "Save & Print Mode" is enabled
  //       const { data: settings } = await supabase
  //         .from('printer_settings')
  //         .select('save_and_print_mode, connection_type, selected_bluetooth_printer')
  //         .order('updated_at', { ascending: false })
  //         .limit(1)
  //         .maybeSingle();

  //       const shouldAutoPrint = settings?.save_and_print_mode ?? false; // Default to false - manual print only

  //       if (shouldAutoPrint) {
  //         console.log('Auto-print enabled, printing automatically...');
          
  //         // Get date from current billing date or first billed item
  //         const firstBilledItem = billedItems.find(item => item.invoiceNumber === orderPlacedInfo.invoiceNumber);
  //         const timestamp = firstBilledItem?.timestamp || Date.now();
          
  //         const dateStr = new Date(timestamp).toLocaleDateString('en-US', { 
  //           year: 'numeric', 
  //           month: 'long', 
  //           day: 'numeric'
  //         });
  //         const timeStr = new Date(timestamp).toLocaleTimeString('en-US', {
  //           hour: '2-digit',
  //           minute: '2-digit'
  //         });

  //         const printData: PrintData = {
  //           invoiceNumber: orderPlacedInfo.invoiceNumber,
  //           date: dateStr,
  //           time: timeStr,
  //           items: orderPlacedInfo.items,
  //           totalAmount: orderPlacedInfo.totalAmount
  //         };

  //         // Check if printer is saved
  //         const hasSavedPrinter = settings && 
  //           settings.connection_type === 'Bluetooth' && 
  //           settings.selected_bluetooth_printer;

  //         if (hasSavedPrinter) {
  //           console.log('Found saved printer, auto-printing...');
  //           await printReceipt(printData, true);
  //         } else {
  //           console.log('No saved printer, showing selection modal...');
  //           setPendingPrintData(printData);
  //           setIsPrinterSelectionModalOpen(true);
  //         }
  //       }
  //     } catch (error: any) {
  //       console.warn('Auto-print check failed:', error);
  //       // Silent fail - user can still manually print
  //     } finally {
  //       setIsPrinting(false);
  //     }
  //   };

  //   // Small delay to ensure modal is rendered first
  //   const timer = setTimeout(() => {
  //     autoPrint();
  //   }, 100);

  //   return () => clearTimeout(timer);
  // }, [orderPlacedInfo, billedItems, isPrinting]);

  // Initialize: Clear any existing auth on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('adminAuthenticated');
    }
  }, []);

  // Retry loading products function - for ProductGrid retry button
  const retryLoadProducts = useCallback(async () => {
    try {
      console.log('[retryLoadProducts] Retrying to load products from database...');
      const { data, error } = await supabase.from('products').select('*');
      
      if (error) {
        console.error('[retryLoadProducts] Error:', error);
        throw new Error(error.message || 'Failed to load products');
      }
      
      const loadedProducts = (data || []).map((p: any) => ({ 
        ...p, 
        imageUrl: p.image_url,
        displayOrder: p.display_order || 0
      }));
      setProducts(loadedProducts);
      console.log(`[retryLoadProducts] Successfully loaded ${loadedProducts.length} products`);
    } catch (error: any) {
      console.error('[retryLoadProducts] Failed to retry loading products:', error);
      throw error; // Re-throw so ProductGrid can handle it
    }
  }, []);

  // Refresh invoices function - reusable and memoized
  const refreshInvoices = useCallback(async (limitTo7Days = false) => {
    try {
      console.log('[refreshInvoices] Fetching fresh invoices from database...');
      
      // Always fetch ALL invoices for today (no limit) to ensure accurate invoice numbering
      const todayIST = getTodayISTDate();
      const todayDateStr = `${todayIST.getFullYear()}-${String(todayIST.getMonth() + 1).padStart(2, '0')}-${String(todayIST.getDate()).padStart(2, '0')}`;
      
      let query = supabase
        .from('invoices')
        .select('*, invoice_items(*)');
      
      // If limitTo7Days is true, fetch today + last 7 days
      // Otherwise, fetch ALL invoices (for accurate numbering)
      if (limitTo7Days) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString();
        // Fetch ALL invoices for today OR invoices from last 7 days
        query = query.or(`bill_date.eq.${todayDateStr},created_at.gte.${sevenDaysAgoStr}`);
      } else {
        // Fetch ALL invoices - needed for accurate invoice numbering
        // No filter - get everything
      }
      
      query = query.order('id', { ascending: false });
      
      const { data: invoicesData, error: invoicesError } = await query;
      
      if (invoicesError) {
        console.error('[refreshInvoices] Error:', invoicesError);
        return;
      }
      
      const invoices = invoicesData || [];
      console.log(`[refreshInvoices] Fetched ${invoices.length} invoices`);
      
      // Count invoices for today to verify we got them all
      const todayInvoices = invoices.filter((inv: any) => {
        const invDate = inv.bill_date || inv.created_at.split('T')[0];
        return invDate === todayDateStr;
      });
      console.log(`[refreshInvoices] Found ${todayInvoices.length} invoices for today (${todayDateStr})`);
      
      // Update all invoices state - merge with existing to avoid losing data
      setAllInvoices(prev => {
        const existingIds = new Set(invoices.map((inv: any) => inv.id));
        const olderInvoices = prev.filter(inv => !existingIds.has(inv.id));
        return [...invoices, ...olderInvoices];
      });
      
      // Recalculate billed items with fresh data
      const dbIdToDailyNumber = calculateDailyInvoiceNumbers(invoices);
      const mappedBilledItems = invoices.flatMap((invoice: any) => {
        const dailyInvoiceNumber = dbIdToDailyNumber.get(invoice.id) || invoice.id;
        return mapInvoiceToBilledItems(invoice, dailyInvoiceNumber);
      });
      
      // Merge billed items - keep existing ones, update/remove changed ones
      setBilledItems(prev => {
        const invoiceIds = new Set(invoices.map((inv: any) => inv.id));
        const otherItems = prev.filter(item => !item.invoiceDbId || !invoiceIds.has(item.invoiceDbId));
        return [...mappedBilledItems, ...otherItems];
      });
      
      console.log('[refreshInvoices] Invoices refreshed successfully');
    } catch (error) {
      console.error('[refreshInvoices] Failed to refresh invoices:', error);
    }
  }, []);

  // Set up real-time subscription for invoices
  useEffect(() => {
    console.log('[App] Setting up real-time subscription for invoices...');
    
    const channel = supabase
      .channel('invoices-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'invoices'
        },
        (payload) => {
          console.log('[App] Invoice change detected:', payload.eventType, payload.new || payload.old);
          // Refresh invoices when any change occurs
          refreshInvoices();
        }
      )
      .subscribe((status) => {
        console.log('[App] Real-time subscription status:', status);
      });

      return () => {
        console.log('[App] Cleaning up real-time subscription');
        supabase.removeChannel(channel);
      };
  }, [refreshInvoices]);

  // Auto-update billing date at midnight IST (12:00 AM IST)
  useEffect(() => {
    const checkAndUpdateBillingDate = () => {
      const todayIST = getTodayISTDate();
      const currentBillingDate = new Date(billingDate.getFullYear(), billingDate.getMonth(), billingDate.getDate(), 12, 0, 0);
      
      // Compare dates (year, month, day only) - check if date changed at midnight IST
      if (todayIST.getFullYear() !== currentBillingDate.getFullYear() ||
          todayIST.getMonth() !== currentBillingDate.getMonth() ||
          todayIST.getDate() !== currentBillingDate.getDate()) {
        console.log('[App] Date changed detected (midnight IST), updating billing date from', 
          currentBillingDate.toLocaleDateString(), 'to', todayIST.toLocaleDateString());
        setBillingDate(todayIST);
      }
    };
    
    // Check immediately
    checkAndUpdateBillingDate();
    
    // Check every minute to catch midnight IST transition (12:00 AM IST = 6:30 PM UTC previous day)
    const interval = setInterval(checkAndUpdateBillingDate, 60000); // Every minute
    
    return () => clearInterval(interval);
  }, [billingDate]);

  // Refresh invoices and ensure products are loaded when POS view becomes active
  useEffect(() => {
    if (view === 'pos') {
      console.log('[App] POS view active, refreshing invoices and products...');
      
      // Ensure billing date is set to today (IST)
      const todayIST = getTodayISTDate();
      const currentBillingDate = new Date(billingDate.getFullYear(), billingDate.getMonth(), billingDate.getDate(), 12, 0, 0);
      if (todayIST.getFullYear() !== currentBillingDate.getFullYear() ||
          todayIST.getMonth() !== currentBillingDate.getMonth() ||
          todayIST.getDate() !== currentBillingDate.getDate()) {
        console.log('[App] Updating billing date to today (IST) when entering POS view');
        setBillingDate(todayIST);
      }
      
      // Always refresh invoices to get ALL invoices for today (critical for accurate numbering)
      refreshInvoices(false).catch((error) => {
        console.error('[App] Failed to refresh invoices:', error);
      });
      
      // If products are empty, automatically retry loading them
      if (products.length === 0) {
        console.log('[App] No products found, automatically retrying to load products...');
        retryLoadProducts().catch((error) => {
          console.error('[App] Auto-retry failed:', error);
        });
      }
    }
  }, [view, refreshInvoices, products.length, retryLoadProducts, billingDate]);

  // Periodic refresh of invoices every 30 seconds when in POS view
  useEffect(() => {
    if (view !== 'pos') return;
    
    const interval = setInterval(() => {
      console.log('[App] Periodic invoice refresh...');
      refreshInvoices();
    }, 30000); // Every 30 seconds
    
    return () => clearInterval(interval);
  }, [view, refreshInvoices]);

  useEffect(() => {
    const fetchInitialData = async () => {
        try {
            setLoading(true);
            setError(null); // Clear any previous errors
            
            console.log('🔄 Starting data fetch...');
            
            // Set a timeout to ensure loading is cleared even if something hangs
            // Increased timeout to allow all data to load completely
            const timeoutId = setTimeout(() => {
                console.warn('⚠️ Data fetch taking too long, forcing loading to false');
                setLoading(false);
            }, 30000); // 30 second timeout - allow time for all data to load
            
            // PHASE 1: Load critical data first (products, categories, invoices) - needed for POS/billing
            console.log('📦 Phase 1: Loading critical data (products, categories, invoices)...');
            
            // Retry function for failed queries - more retries for reliability
            const retryQuery = async (queryFn: () => Promise<any>, retries = 3, delay = 1000, isProducts = false) => {
                for (let i = 0; i < retries; i++) {
                    try {
                        const result = await queryFn();
                        if (!result.error) return result;
                        console.error(`Query error (attempt ${i + 1}/${retries}):`, result.error);
                        if (i < retries - 1) {
                            const waitTime = delay * (i + 1); // Increasing delay
                            console.log(`⚠️ Query failed, retrying in ${waitTime}ms... (${i + 1}/${retries})`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                        }
                    } catch (err: any) {
                        console.error(`Query exception (attempt ${i + 1}/${retries}):`, err);
                        if (i < retries - 1) {
                            const waitTime = delay * (i + 1); // Increasing delay
                            console.log(`⚠️ Query error, retrying in ${waitTime}ms... (${i + 1}/${retries})`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                        } else {
                            throw err;
                        }
                    }
                }
                throw new Error('Query failed after retries');
            };
            
            // Calculate date 7 days ago for invoice fetching (optimized - only fetch recent invoices)
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            sevenDaysAgo.setHours(0, 0, 0, 0);
            const sevenDaysAgoStr = sevenDaysAgo.toISOString(); // Full ISO timestamp format
            
            // Load critical data in parallel - ensure all data loads before showing UI
            // For invoices: fetch ALL invoices for today + last 7 days (needed for accurate invoice numbering)
            const todayIST = getTodayISTDate();
            const todayDateStr = `${todayIST.getFullYear()}-${String(todayIST.getMonth() + 1).padStart(2, '0')}-${String(todayIST.getDate()).padStart(2, '0')}`;
            
            const [productsResult, categoriesResult, invoicesResult] = await Promise.allSettled([
                retryQuery(() => supabase.from('products').select('*'), 3, 1000, true), // 3 retries, 1s delay
                retryQuery(() => supabase.from('categories').select('*').order('display_order', { ascending: true }), 3, 1000),
                retryQuery(() => {
                    // Fetch ALL invoices for today (no limit) + last 7 days for context
                    return supabase.from('invoices')
                        .select('*, invoice_items(*)')
                        .or(`bill_date.eq.${todayDateStr},created_at.gte.${sevenDaysAgoStr}`)
                        .order('id', { ascending: false });
                }, 3, 1000)
            ]);

            // Process critical data - products are essential, retry if failed
            if (productsResult.status === 'fulfilled' && !productsResult.value.error) {
                const loadedProducts = (productsResult.value.data || []).map((p: any) => ({ 
                    ...p, 
                    imageUrl: p.image_url,
                    displayOrder: p.display_order || 0
                }));
                setProducts(loadedProducts);
                console.log('✅ Products loaded:', loadedProducts.length);
            } else {
                const errorMsg = productsResult.status === 'rejected' ? productsResult.reason?.message : productsResult.value?.error?.message;
                console.error('❌ Failed to load products:', errorMsg);
                // Try one more time with a simple query (no retry wrapper)
                console.log('🔄 Attempting final product load retry...');
                try {
                    const { data, error } = await supabase.from('products').select('*');
                    if (!error && data) {
                        const loadedProducts = data.map((p: any) => ({ 
                            ...p, 
                            imageUrl: p.image_url,
                            displayOrder: p.display_order || 0
                        }));
                        setProducts(loadedProducts);
                        console.log('✅ Products loaded on final retry:', loadedProducts.length);
                    } else {
                        console.error('❌ Final retry also failed:', error?.message);
                    }
                } catch (finalError: any) {
                    console.error('❌ Final retry exception:', finalError);
                }
            }

            if (categoriesResult.status === 'fulfilled' && !categoriesResult.value.error) {
                setCategories((categoriesResult.value.data || []).map((c: any) => ({
                    id: c.id,
                    name: c.name,
                    displayOrder: c.display_order
                })));
                console.log('✅ Categories loaded:', categoriesResult.value.data?.length || 0);
            } else {
                const errorMsg = categoriesResult.status === 'rejected' ? categoriesResult.reason?.message : categoriesResult.value?.error?.message;
                console.error('❌ Failed to load categories:', errorMsg);
            }

            if (invoicesResult.status === 'fulfilled' && !invoicesResult.value.error) {
                const invoices = invoicesResult.value.data || [];
                setAllInvoices(invoices);
                const dbIdToDailyNumber = calculateDailyInvoiceNumbers(invoices);
                const mappedBilledItems = invoices.flatMap((invoice: any) => {
                    const dailyInvoiceNumber = dbIdToDailyNumber.get(invoice.id) || invoice.id;
                    return mapInvoiceToBilledItems(invoice, dailyInvoiceNumber);
                });
                setBilledItems(mappedBilledItems);
                
                // Log how many invoices for today to verify we got them all
                const todayInvoices = invoices.filter((inv: any) => {
                    const invDate = inv.bill_date || inv.created_at.split('T')[0];
                    return invDate === todayDateStr;
                });
                console.log('✅ Invoices loaded:', invoices.length, `(${todayInvoices.length} for today)`);
            } else {
                const errorMsg = invoicesResult.status === 'rejected' ? invoicesResult.reason?.message : invoicesResult.value?.error?.message;
                console.warn('⚠️ Failed to load invoices:', errorMsg);
            }

            // PHASE 2: Load ALL data before showing UI (both billing and admin screens need this data)
            console.log('📦 Phase 2: Loading secondary data (expenses, stock entries, etc.)...');
            
            const [
                expenseItemsData,
                expensesData,
                stockEntriesData
            ] = await Promise.allSettled([
                retryQuery(() => supabase.from('expense_items').select('*'), 3, 1000),
                retryQuery(() => supabase.from('expenses').select('*').order('expense_date', { ascending: false }), 3, 1000),
                retryQuery(() => supabase.from('purchase_entries').select('*, purchase_items(*)').order('entry_date', { ascending: false }), 3, 1000)
            ]);

            // Process secondary data
            if (expenseItemsData.status === 'fulfilled' && !expenseItemsData.value.error) {
                setExpenseItems((expenseItemsData.value.data || []).map((e: any) => ({ ...e, allowSubItems: e.allow_sub_items, subItems: e.sub_items })));
                console.log('✅ Expense items loaded:', expenseItemsData.value.data?.length || 0);
            } else {
                console.warn('⚠️ Failed to load expense items');
            }

            if (expensesData.status === 'fulfilled' && !expensesData.value.error) {
                setExpenses((expensesData.value.data || []).map((e: any) => ({ ...e, date: new Date(e.expense_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) })));
                console.log('✅ Expenses loaded:', expensesData.value.data?.length || 0);
            } else {
                console.warn('⚠️ Failed to load expenses');
            }

            if (stockEntriesData.status === 'fulfilled' && !stockEntriesData.value.error) {
                setStockEntries((stockEntriesData.value.data || []).map(mapPurchaseEntryToStockEntry));
                console.log('✅ Stock entries loaded:', stockEntriesData.value.data?.length || 0);
            } else {
                console.warn('⚠️ Failed to load stock entries');
            }

            // Clear timeout and show UI only after ALL data is loaded
            clearTimeout(timeoutId);
            setLoading(false);
            console.log('✅ All data loading complete - UI can render now');

        } catch (err: any) {
            console.error("❌ Fatal error fetching initial data:", err);
            setLoading(false);
            setError(err.message || "Failed to initialize application. Please refresh the page.");
        }
    };
    
    // Always ensure loading is set properly
    fetchInitialData().catch((err: any) => {
        console.error("❌ Fatal error in fetchInitialData:", err);
        setLoading(false);
        setError(err.message || "Failed to initialize application. Please refresh the page.");
    });
  }, []);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
        console.log('✅ PWA: Install prompt event received! Browser will show install icon in toolbar', e);
        // Don't prevent default - let browser show install icon in toolbar automatically
        // Store the event for programmatic triggering if needed
        setInstallPromptEvent(e);
    };

    // Check PWA installability
    const checkPWAInstallability = async () => {
        console.log('🔍 Checking PWA installability...');
        
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.getRegistration();
                if (registration) {
                    console.log('✅ PWA: Service Worker registered', registration.scope);
                    console.log('✅ PWA: Service Worker active:', registration.active !== null);
                    console.log('✅ PWA: Service Worker state:', registration.active?.state || 'N/A');
                } else {
                    console.warn('❌ PWA: Service Worker not registered');
                }
            } catch (err) {
                console.error('❌ PWA: Service Worker check failed', err);
            }
        }

        // Check manifest
        try {
            const response = await fetch('/manifest.json');
            if (response.ok) {
                const manifest = await response.json();
                console.log('✅ PWA: Manifest loaded', manifest);
                console.log('📋 Manifest icons:', manifest.icons?.length || 0);
                console.log('📋 Manifest display:', manifest.display);
            } else {
                console.error('❌ PWA: Manifest not found');
            }
        } catch (err) {
            console.error('❌ PWA: Manifest fetch failed', err);
        }

        // Check if app is already installed
        const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
        if (isStandalone) {
            console.log('ℹ️ PWA: App is already installed (standalone mode detected)');
        }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    
    // Check installability multiple times to catch the event
    setTimeout(checkPWAInstallability, 2000);
    setTimeout(checkPWAInstallability, 5000);
    setTimeout(checkPWAInstallability, 10000);
    
    // Also check when user interacts with the page (engagement requirement)
    const checkOnInteraction = () => {
        console.log('👆 User interaction detected - rechecking installability');
        checkPWAInstallability();
        document.removeEventListener('click', checkOnInteraction);
        document.removeEventListener('keydown', checkOnInteraction);
    };
    document.addEventListener('click', checkOnInteraction, { once: true });
    document.addEventListener('keydown', checkOnInteraction, { once: true });

    // Service Worker update detection
    let printerSelectionHandler: EventListener | null = null;
    
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
      
      // Listen for printer selection requests from OrderPanel
      printerSelectionHandler = (event: Event) => {
        const customEvent = event as CustomEvent;
        console.log('Received showPrinterSelection event:', customEvent.detail);
        if (customEvent.detail && customEvent.detail.printData) {
          setPendingPrintData(customEvent.detail.printData);
          setIsPrinterSelectionModalOpen(true);
        }
      };
      
      window.addEventListener('showPrinterSelection', printerSelectionHandler);
    }

    return () => {
        window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        if (printerSelectionHandler) {
          window.removeEventListener('showPrinterSelection', printerSelectionHandler);
        }
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
    // Use LOCAL date components to avoid timezone issues
    const year = billingDate.getFullYear();
    const month = billingDate.getMonth() + 1;
    const day = billingDate.getDate();
    
    // Create billing date string in database format (YYYY-MM-DD) using LOCAL date
    const billingDateForDB = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    
    // Format for display comparison (M/D/YYYY)
    const selectedDateString = `${month}/${day}/${year}`;

    console.log('[nextInvoiceNumber] Calculating for billing date:', billingDateForDB, '(', selectedDateString, ')');
    console.log('[nextInvoiceNumber] Total invoices in state:', allInvoices.length);

    // Count invoices from allInvoices - MUST use bill_date, not created_at
    // This ensures we count ALL invoices for the selected billing date
    const invoicesForSelectedDate = allInvoices.filter(invoice => {
        // ALWAYS prefer bill_date if it exists (it's the actual billing date)
        // Only fall back to created_at date if bill_date is missing (legacy data)
        let invoiceDateStr: string;
        if (invoice.bill_date) {
            // bill_date is DATE type (YYYY-MM-DD), use it directly
            invoiceDateStr = invoice.bill_date;
        } else {
            // Fallback: extract date from created_at (TIMESTAMPTZ)
            // Parse as local date to avoid timezone shifts
            const createdDate = new Date(invoice.created_at);
            const localYear = createdDate.getFullYear();
            const localMonth = createdDate.getMonth() + 1;
            const localDay = createdDate.getDate();
            invoiceDateStr = `${localYear}-${String(localMonth).padStart(2, '0')}-${String(localDay).padStart(2, '0')}`;
        }
        
        const matches = invoiceDateStr === billingDateForDB;
        if (matches) {
            console.log('[nextInvoiceNumber] Found matching invoice:', invoice.id, 'with date:', invoiceDateStr);
        }
        return matches;
    });

    console.log('[nextInvoiceNumber] Invoices for selected date:', invoicesForSelectedDate.length);

    if (invoicesForSelectedDate.length === 0) {
        console.log('[nextInvoiceNumber] No invoices found, starting from 1');
        return 1; // Start from 1 for a new day
    }

    // Calculate daily invoice numbers for the selected date's invoices
    const dbIdToDailyNumber = calculateDailyInvoiceNumbers(invoicesForSelectedDate);
    
    // Find the maximum daily invoice number
    const maxDailyNumber = Math.max(...Array.from(dbIdToDailyNumber.values()));
    console.log('[nextInvoiceNumber] Max daily invoice number from DB:', maxDailyNumber);
    
    // Also check billedItems for any 'hold' status items (optimistic updates)
    const invoicesForDate = billedItems.filter(item => item.date === selectedDateString);
    const holdInvoicesForDate = invoicesForDate.filter(item => item.status === 'hold');
    const maxHoldInvoiceNumber = holdInvoicesForDate.length > 0 
      ? Math.max(...holdInvoicesForDate.map(item => item.invoiceNumber))
      : 0;
    
    const nextNumber = Math.max(maxDailyNumber, maxHoldInvoiceNumber) + 1;
    console.log('[nextInvoiceNumber] Next invoice number:', nextNumber);
    return nextNumber;
  }, [billedItems, billingDate, allInvoices]);

  const handleNavigate = (newView: 'home' | 'pos' | 'admin') => {
    // ALWAYS require password for admin access
    if (newView === 'admin') {
      // Prevent navigation - show password modal instead
      setIsPasswordModalOpen(true);
      return; // CRITICAL: return prevents setView('admin') from executing
    }
    
    // Clear any previous errors when navigating
    setError(null);
    
    // Allow navigation even if products aren't loaded - will show error in POS view if needed
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
                  alert('App installation started! Please follow the prompts to complete installation.');
              } else {
                  console.log('User dismissed the install prompt');
              }
              setInstallPromptEvent(null); // We can only use the prompt once.
          }).catch((err: any) => {
              console.error('Install prompt error:', err);
              alert('Installation failed. Please try manual installation or check browser settings.');
          });
      } else {
          // Fallback: Show instructions based on device
          const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
          const isAndroid = /Android/.test(navigator.userAgent);
          const isStandalone = (window.navigator as any).standalone || window.matchMedia('(display-mode: standalone)').matches;
          
          if (isStandalone) {
              alert('App is already installed! You\'re using the installed version.');
              return;
          }
          
          if (isIOS) {
              alert('To install on iOS:\n\n1. Tap the Share button (square with arrow up)\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" in the top right\n\nYou can then open the app from your home screen!');
          } else if (isAndroid) {
              alert('To install on Android:\n\n1. Tap the menu (3 dots) in your browser\n2. Look for "Install app" or "Add to Home screen"\n3. Tap it and confirm\n\nOr look for the install icon in your browser\'s address bar!');
          } else {
              alert('To install this app:\n\n1. Look for the install icon (➕) in your browser\'s address bar\n2. Or use browser menu:\n   - Chrome/Edge: Menu → "Install Tea Time POS"\n   - Firefox: Menu → "Install"\n\nMake sure you\'re using Chrome, Edge, or Opera for best PWA support.');
          }
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
    if (editingInvoiceNumber) { alert("Please update or clear the bill before setting to hold."); return; }
    if (orders.length >= 8) { alert("Maximum of 7 orders can be held."); return; }
    if (activeOrder.items.length === 0) { alert("Cannot set an empty order to hold."); return; }
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
  
    // OPTIMIZED: No need to refresh before billing - we'll calculate invoice number from current state
    // This saves a full database query and makes billing instant

    // Create a fresh copy of items to bill
    const itemsToBill = activeOrder.items.map(item => ({ ...item, product: { ...item.product } }));

    // STEP 1: PERFORM DATABASE SAVE FIRST - CRITICAL PATH
    let newInvoiceId: number | null = null;
    let dailyInvoiceNumber: number = 0;
    
    try {
      // Calculate totals
      const total_amount = itemsToBill.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
      const total_profit = itemsToBill.reduce((sum, item) => sum + item.product.profit * item.quantity, 0);
      
      // CRITICAL: Use ACTUAL current date in IST for bill_date
      // This ensures bill_date always matches the actual date when invoice is created (IST)
      // Both created_at (timestamp) and bill_date (date) should reflect the same date in IST
      const now = new Date();
      
      // Get local date components (browser timezone, should be IST in India)
      const year = now.getFullYear();
      const month = now.getMonth() + 1; // getMonth() returns 0-11
      const day = now.getDate();
      
      // Format as YYYY-MM-DD for database
      const billDateForDB = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Also update billingDate state to match actual IST date
      const actualISTDate = new Date(year, month - 1, day, 12, 0, 0);
      setBillingDate(actualISTDate);
      
      console.log('[handleBillOrder] Billing with date (IST):', billDateForDB, 'at', now.toLocaleString('en-IN'));

      // OPTIMIZED: Use products from state instead of fetching from DB
      // Products are already loaded in Phase 1, so we can use them directly
      const productIdsInDB = new Set(products.map(p => p.id));

      // STEP 1.1: Insert invoice record
      const { data: invoiceData, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          total_amount,
          total_profit,
          bill_date: billDateForDB,
        })
        .select()
        .single();
      
      if (invoiceError || !invoiceData || !invoiceData.id) {
        throw new Error(invoiceError?.message || "Failed to create invoice record.");
      }
      
      newInvoiceId = invoiceData.id;
      console.log(`[BILLING] Invoice created in DB with ID: ${newInvoiceId}`);

      // STEP 1.2: Insert invoice items
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
        throw new Error(itemsError.message || "Failed to save invoice items.");
      }
      console.log(`[BILLING] Invoice items saved for invoice ID: ${newInvoiceId}`);

      // STEP 2: CALCULATE DAILY INVOICE NUMBER
      // Fetch ALL invoices for the billing date (not just last 7 days) to ensure accurate numbering
      // This is critical to prevent invoice number resets
      const { data: freshInvoicesData, error: refreshError } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('bill_date', billDateForDB) // Filter by exact billing date - CRITICAL for accurate numbering
        .order('id', { ascending: true }); // Sort ascending to get creation order

      if (refreshError) {
        throw new Error(`Failed to refresh invoices: ${refreshError.message}`);
      }

      const freshInvoices = freshInvoicesData || [];
      console.log(`[handleBillOrder] Found ${freshInvoices.length} invoices for date ${billDateForDB}`);
      
      // STEP 3: CALCULATE DAILY INVOICE NUMBER FROM DATABASE
      // Use calculateDailyInvoiceNumbers which groups by date and assigns sequential numbers
      const dbIdToDailyNumber = calculateDailyInvoiceNumbers(freshInvoices);
      dailyInvoiceNumber = dbIdToDailyNumber.get(newInvoiceId) || freshInvoices.length;
      
      // Safety check: if calculation failed, use the count as fallback
      if (!dailyInvoiceNumber || dailyInvoiceNumber <= 0) {
        console.warn(`[handleBillOrder] Invoice number calculation failed, using count: ${freshInvoices.length}`);
        dailyInvoiceNumber = freshInvoices.length;
      }
      
      console.log(`[BILLING] Calculated daily invoice number: ${dailyInvoiceNumber} for DB ID: ${newInvoiceId}`);

      // STEP 4: UPDATE ALL INVOICES STATE (OPTIMIZED - merge with existing, don't replace)
      // Merge fresh invoices for the billing date with existing invoices
      setAllInvoices(prev => {
        const existingIds = new Set(freshInvoices.map((inv: any) => inv.id));
        const olderInvoices = prev.filter(inv => !existingIds.has(inv.id));
        // Fresh invoices first (most recent), then older ones
        return [...freshInvoices, ...olderInvoices];
      });

      // STEP 5: UPDATE BILLED ITEMS STATE
      const billDateString = new Date(`${billDateForDB}T00:00:00`).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
      const timestamp = new Date().getTime();
      const syncedBilledItems: BilledItem[] = itemsToBill.map(item => ({
        invoiceNumber: dailyInvoiceNumber,
        invoiceDbId: newInvoiceId!,
        productName: item.product.name,
        quantity: item.quantity,
        price: item.product.price * item.quantity,
        profit: item.product.profit * item.quantity,
        date: billDateString,
        timestamp: timestamp,
        status: 'synced'
      }));

      setBilledItems(prev => [...syncedBilledItems, ...prev]);
      console.log(`[BILLING] Updated billedItems state with invoice #${dailyInvoiceNumber}`);

      // STEP 6: PREPARE PRINT DATA
      const itemsForPrint = itemsToBill.map(item => ({
        name: String(item.product.name || ''),
        quantity: Number(item.quantity || 0),
        price: Number((item.product.price * item.quantity).toFixed(2))
      }));

      const printDateString = new Date(`${billDateForDB}T00:00:00`).toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric'
      });
      const timeStr = new Date().toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });

      const printData: PrintData = {
        invoiceNumber: dailyInvoiceNumber,
        date: printDateString,
        time: timeStr,
        items: itemsForPrint,
        totalAmount: Number(total_amount.toFixed(2))
      };

      // STEP 7: CLEAR ORDER (only after successful save)
      const isLastOrder = activeOrderIndex === orders.length - 1;
      const isHeldOrder = orders.length > 1 && !isLastOrder;
      
      if (isHeldOrder) {
        // This is a held order being billed - remove it and move to next
        const newOrders = orders.filter((o) => o.id !== activeOrder.id);
        setOrders(newOrders);
        setActiveOrderIndex(newOrders.length - 1);
        console.log(`[BILLING] Held order billed directly. Invoice #${dailyInvoiceNumber}`);
      } else {
        // This is a regular order - clear it
        handleClearOrder();
      }

      // STEP 8: PRINT DIRECTLY (no popup)
      try {
        console.log(`[BILLING] Printing invoice #${dailyInvoiceNumber} directly...`);
        await printReceipt(printData, true);
        console.log(`[BILLING] Print completed for invoice #${dailyInvoiceNumber}`);
      } catch (printError: any) {
        console.error(`[BILLING] Print failed for invoice #${dailyInvoiceNumber}:`, printError);
        // Don't block the billing flow if print fails - order is already saved
        // User can print later from the invoice view
      }

    } catch (err: any) {
      console.error("[BILLING ERROR] Billing failed:", err);
      alert(`Failed to save order to the database: ${err.message}. Please try again.`);

      // ROLLBACK: If an invoice was partially created, delete it to prevent orphaned records
      if (newInvoiceId) {
          console.error(`[BILLING] Rolling back partially created invoice #${newInvoiceId}...`);
          try {
            await supabase.from('invoices').delete().eq('id', newInvoiceId);
            console.log(`[BILLING] Successfully rolled back invoice #${newInvoiceId}`);
          } catch (rollbackError: any) {
            console.error(`[BILLING] Failed to rollback invoice #${newInvoiceId}:`, rollbackError);
          }
      }
      
      // DO NOT update UI state on error - keep order intact for retry
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
    if (activeOrder.items.length > 0) { alert("Please bill or set your current active order to hold before editing."); return; }
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

  const handleDeleteExpense = async (expenseId: number) => {
    const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
    if(error) { 
      alert(`Failed to delete expense: ${error.message}`); 
    } else {
      setExpenses(prev => prev.filter(exp => exp.id !== expenseId));
    }
  };

  const handleAddStockEntry = async (entry: Omit<StockEntry, 'id' | 'totalCost'>) => {
    const total_cost = entry.items.reduce((sum, item) => sum + (item.cost || 0) * (item.quantity || 0), 0);
    const { data: entryData, error: entryError } = await supabase.from('purchase_entries').insert({
        entry_date: entry.date,
        primary_description: entry.primaryDescription,
        total_cost,
        bill_image_url: entry.billImageUrl
    }).select().single();

    if(entryError || !entryData) { alert(`Failed to create purchase entry: ${entryError?.message}`); return; }

    const itemsToInsert = entry.items.map(item => ({ purchase_entry_id: entryData.id, ...item }));
    const { error: itemsError } = await supabase.from('purchase_items').insert(itemsToInsert);
    if(itemsError) { alert(`Failed to save purchase items: ${itemsError.message}`); return; }

    const newEntry = mapPurchaseEntryToStockEntry({ ...entryData, purchase_items: entry.items });
    setStockEntries(prev => [newEntry, ...prev].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleUpdateStockEntry = async (updatedEntry: StockEntry) => {
    const total_cost = updatedEntry.items.reduce((sum, item) => sum + (item.cost || 0) * (item.quantity || 0), 0);
    const { error: updateError } = await supabase.from('purchase_entries').update({
        entry_date: updatedEntry.date,
        primary_description: updatedEntry.primaryDescription,
        total_cost,
        bill_image_url: updatedEntry.billImageUrl
    }).eq('id', updatedEntry.id);
    if(updateError) { alert(`Failed to update entry: ${updateError.message}`); return; }

    const { error: deleteError } = await supabase.from('purchase_items').delete().eq('purchase_entry_id', updatedEntry.id);
    if(deleteError) { alert(`Failed to clear old items: ${deleteError.message}`); return; }

    const itemsToInsert = updatedEntry.items.map(item => ({ purchase_entry_id: updatedEntry.id, ...item }));
    const { error: insertError } = await supabase.from('purchase_items').insert(itemsToInsert);
    if(insertError) { alert(`Failed to save new items: ${insertError.message}`); return; }

    setStockEntries(prev => prev.map(e => e.id === updatedEntry.id ? { ...updatedEntry, totalCost: total_cost } : e).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
  };

  const handleDeleteStockEntry = async (entryId: number) => {
    if (window.confirm('Are you sure you want to delete this stock entry?')) {
        const { error } = await supabase.from('purchase_entries').delete().eq('id', entryId);
        if(error) { alert(`Failed to delete entry: ${error.message}`); }
        else { setStockEntries(prev => prev.filter(entry => entry.id !== entryId)); }
    }
  };
  
  const handleAddProduct = async (productData: Omit<Product, 'id'>) => {
    // Get max display_order for this category to set new product's order
    const categoryProducts = products.filter(p => p.category === productData.category);
    const maxOrder = categoryProducts.length > 0 
      ? Math.max(...categoryProducts.map(p => p.displayOrder || 0))
      : 0;
    const newDisplayOrder = maxOrder + 1;
    
    const { data, error } = await supabase.from('products').insert({ 
      name: productData.name, 
      price: productData.price, 
      profit: productData.profit, 
      category: productData.category, 
      image_url: productData.imageUrl,
      display_order: newDisplayOrder
    }).select().single();
    if(error) { alert(`Failed to add product: ${error.message}`); }
    else { 
      setProducts(prev => [...prev, { 
        ...data, 
        imageUrl: data.image_url,
        displayOrder: data.display_order || 0
      }]); 
    }
  };

  const handleReorderCategories = async (newOrder: string[]) => {
    try {
      // Update display_order for all categories based on new order
      const updatePromises = newOrder.map((categoryName, index) => {
        const category = categories.find(c => c.name === categoryName);
        if (!category) return Promise.resolve();
        
        return supabase
          .from('categories')
          .update({ 
            display_order: index + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', category.id);
      });

      await Promise.all(updatePromises);
      
      // Update local state
      const updatedCategories = newOrder.map((name, index) => {
        const existing = categories.find(c => c.name === name);
        return existing 
          ? { ...existing, displayOrder: index + 1 }
          : { id: 0, name, displayOrder: index + 1 };
      }).filter(c => c.id !== 0);
      
      setCategories(updatedCategories);
      console.log('[App] Category order updated successfully');
    } catch (error: any) {
      console.error('Failed to reorder categories:', error);
      alert(`Failed to update category order: ${error.message}`);
    }
  };

  const handleUpdateProduct = async (updatedProduct: Product) => {
    // Get the old product to check if image changed
    const oldProduct = products.find(p => p.id === updatedProduct.id);
    
    console.log('[App] Updating product:', updatedProduct.id, 'Old image:', oldProduct?.imageUrl, 'New image:', updatedProduct.imageUrl);
    
    // Delete old image from storage if it was replaced with a new one
    if (oldProduct?.imageUrl && 
        oldProduct.imageUrl !== updatedProduct.imageUrl && 
        oldProduct.imageUrl.includes('/storage/v1/object/public/')) {
      // Old image is in storage and different from new one
      console.log('[App] Deleting old image:', oldProduct.imageUrl);
      await deleteProductImage(oldProduct.imageUrl);
    }
    
    const { data, error } = await supabase
      .from('products')
      .update({ 
        name: updatedProduct.name, 
        price: updatedProduct.price, 
        profit: updatedProduct.profit, 
        category: updatedProduct.category, 
        image_url: updatedProduct.imageUrl || null, // Explicitly set to null if empty
        display_order: updatedProduct.displayOrder || 0
      })
      .eq('id', updatedProduct.id)
      .select()
      .single();
      
    if(error) { 
      console.error('[App] Failed to update product:', error);
      alert(`Failed to update product: ${error.message}`); 
    } else {
      console.log('[App] Product updated successfully:', data);
      console.log('[App] Updated image_url from DB:', data.image_url);
      
      // Update local state with data from database (ensures consistency)
      setProducts(prev => prev.map(p => 
        p.id === updatedProduct.id 
          ? { ...data, imageUrl: data.image_url || '', displayOrder: data.display_order || 0 } 
          : p
      ));
      
      // Also refresh products from database to ensure we have the latest data
      const { data: refreshedProducts, error: refreshError } = await supabase
        .from('products')
        .select('*')
        .eq('id', updatedProduct.id)
        .single();
        
      if (!refreshError && refreshedProducts) {
        console.log('[App] Refreshed product from DB:', refreshedProducts);
        setProducts(prev => prev.map(p => 
          p.id === updatedProduct.id 
            ? { ...refreshedProducts, imageUrl: refreshedProducts.image_url || '', displayOrder: refreshedProducts.display_order || 0 }
            : p
        ));
      }
    }
  };

  const handleDeleteProduct = async (productId: number) => {
    if (window.confirm("Are you sure? This may affect past reports.")) {
      // Get product to delete its image from storage
      const product = products.find(p => p.id === productId);
      if (product?.imageUrl && product.imageUrl.includes('/storage/v1/object/public/')) {
        await deleteProductImage(product.imageUrl);
      }
      
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
            categories={categories}
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
            onRetryLoadProducts={retryLoadProducts}
            onReorderCategories={handleReorderCategories}
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
                categories={categories}
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
                onCategoryAdded={async () => {
                  // Reload categories when a new one is added
                  const { data, error } = await supabase
                    .from('categories')
                    .select('*')
                    .order('display_order', { ascending: true });
                  if (!error && data) {
                    setCategories(data.map((c: any) => ({
                      id: c.id,
                      name: c.name,
                      displayOrder: c.display_order
                    })));
                  }
                }}
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

  // Show loading screen only while actively loading (not if loading failed)
  if (loading) {
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="text-3xl font-bold text-purple-800">Tea Time POS</div>
            <div className="mt-4 text-gray-600">Loading...</div>
            <div className="mt-2 text-sm text-gray-500">This should only take a moment</div>
        </div>
    );
  }

  if (error && (view === 'pos' || view === 'admin')) {
    // Only show error screen if user is trying to use POS/Admin without data
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-red-50 p-4">
            <div className="text-2xl font-bold text-red-700">Connection Error</div>
            <p className="mt-2 text-red-600 text-center">Could not connect to the Supabase database.</p>
            <p className="mt-4 text-sm text-gray-600 text-center">Please ensure you have correctly configured your Supabase URL and anon key in the `supabaseClient.ts` file and that your internet connection is active.</p>
            <pre className="mt-2 p-2 bg-red-100 text-red-800 text-xs rounded-md text-left max-w-full overflow-x-auto">{error}</pre>
            <button 
              onClick={() => {
                setError(null);
                setView('home');
                window.location.reload();
              }}
              className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
            >
              Go to Home
            </button>
        </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-gray-100 font-sans text-gray-800 overflow-hidden">
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
        onToggleSidebar={view === 'pos' ? () => {} : undefined}
      />
      <div className="flex-1 overflow-hidden min-h-0">
        {renderContent()}
      </div>
      <ExpenseModal 
        isOpen={isExpenseModalOpen}
        onClose={() => setExpenseModalOpen(false)}
        onAddExpense={handleAddExpense}
        dailyExpenseItems={dailyExpenseItems}
        expenses={expenses}
        onDeleteExpense={handleDeleteExpense}
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
      <PrinterSelectionModal
        isOpen={isPrinterSelectionModalOpen}
        onClose={() => {
          setIsPrinterSelectionModalOpen(false);
          setPendingPrintData(null);
        }}
        onSelect={async (printer: BluetoothPrinter) => {
          // Printer is already saved by the modal
          console.log('Printer selected:', printer.name);
          
          // DON'T auto-print - just save the printer and close the modal
          // User will click Print button manually when ready
          
          setIsPrinterSelectionModalOpen(false);
          setPendingPrintData(null);
          // Don't close order modal - let user decide when to print
        }}
      />
    </div>
  );
};

export default App;