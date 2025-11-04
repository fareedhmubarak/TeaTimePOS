import React, { useState, useMemo, useEffect, useCallback } from 'react';
import Header from './components/Header.tsx';
import HomeScreen from './components/HomeScreen.tsx';
import POSView from './components/POSView.tsx';
import AdminDashboard from './components/AdminDashboard.tsx';
import ExpenseModal from './components/ExpenseModal.tsx';
import PasswordModal from './components/PasswordModal.tsx';
import OrderPlacedModal from './components/OrderPlacedModal.tsx';
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


const ADMIN_PASSWORD = '08101990';

const App: React.FC = () => {
  const [view, setView] = useState<'home' | 'pos' | 'admin'>('home');
  const [isExpenseModalOpen, setExpenseModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isPrinterSelectionModalOpen, setIsPrinterSelectionModalOpen] = useState(false);
  const [pendingPrintData, setPendingPrintData] = useState<PrintData | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [orderPlacedInfo, setOrderPlacedInfo] = useState<{ invoiceNumber: number; totalAmount: number; items: Array<{ name: string; quantity: number; price: number }> } | null>(null);
  
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
  const [allInvoices, setAllInvoices] = useState<any[]>([]); // Store all invoices for accurate counting
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stockEntries, setStockEntries] = useState<StockEntry[]>([]);
  const [expenseItems, setExpenseItems] = useState<ExpenseItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  // Debug: Log when orderPlacedInfo changes
  useEffect(() => {
    console.log('=== orderPlacedInfo STATE CHANGED ===');
    console.log('Current value:', orderPlacedInfo);
    console.log('Is truthy?', !!orderPlacedInfo);
    if (orderPlacedInfo) {
      console.log('Invoice #:', orderPlacedInfo.invoiceNumber);
      console.log('Items count:', orderPlacedInfo.items?.length || 0);
    }
  }, [orderPlacedInfo]);

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

  // Refresh invoices function - reusable and memoized
  const refreshInvoices = useCallback(async (limitTo7Days = false) => {
    try {
      console.log('[refreshInvoices] Fetching fresh invoices from database...');
      
      let query = supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .order('id', { ascending: false });
      
      // If limitTo7Days is true, only fetch invoices from last 7 days (optimization)
      if (limitTo7Days) {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setHours(0, 0, 0, 0);
        const sevenDaysAgoStr = sevenDaysAgo.toISOString();
        query = query.gte('created_at', sevenDaysAgoStr);
      }
      
      const { data: invoicesData, error: invoicesError } = await query;
      
      if (invoicesError) {
        console.error('[refreshInvoices] Error:', invoicesError);
        return;
      }
      
      const invoices = invoicesData || [];
      console.log(`[refreshInvoices] Fetched ${invoices.length} invoices`);
      
      // Update all invoices state
      setAllInvoices(invoices);
      
      // Recalculate billed items with fresh data
      const dbIdToDailyNumber = calculateDailyInvoiceNumbers(invoices);
      const mappedBilledItems = invoices.flatMap((invoice: any) => {
        const dailyInvoiceNumber = dbIdToDailyNumber.get(invoice.id) || invoice.id;
        return mapInvoiceToBilledItems(invoice, dailyInvoiceNumber);
      });
      setBilledItems(mappedBilledItems);
      
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

  // Refresh invoices when POS view becomes active
  useEffect(() => {
    if (view === 'pos') {
      console.log('[App] POS view active, refreshing invoices...');
      refreshInvoices();
    }
  }, [view, refreshInvoices]);

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
            const timeoutId = setTimeout(() => {
                console.warn('⚠️ Data fetch taking too long, forcing loading to false');
                setLoading(false);
            }, 5000); // 5 second timeout - show welcome screen faster
            
            // PHASE 1: Load critical data first (products, categories, invoices) - needed for POS/billing
            console.log('📦 Phase 1: Loading critical data (products, categories, invoices)...');
            
            // Retry function for failed queries
            const retryQuery = async (queryFn: () => Promise<any>, retries = 3, delay = 1000) => {
                for (let i = 0; i < retries; i++) {
                    try {
                        const result = await queryFn();
                        if (!result.error) return result;
                        console.error(`Query error (attempt ${i + 1}/${retries}):`, result.error);
                        if (i < retries - 1) {
                            console.log(`⚠️ Query failed, retrying... (${i + 1}/${retries})`);
                            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
                        }
                    } catch (err: any) {
                        console.error(`Query exception (attempt ${i + 1}/${retries}):`, err);
                        if (i < retries - 1) {
                            console.log(`⚠️ Query error, retrying... (${i + 1}/${retries})`);
                            await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
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
            
            const [productsResult, categoriesResult, invoicesResult] = await Promise.allSettled([
                retryQuery(() => supabase.from('products').select('*')),
                retryQuery(() => supabase.from('categories').select('*').order('display_order', { ascending: true })),
                retryQuery(() => supabase.from('invoices')
                    .select('*, invoice_items(*)')
                    .gte('created_at', sevenDaysAgoStr)
                    .order('id', { ascending: false }))
            ]);

            // Process critical data
            if (productsResult.status === 'fulfilled' && !productsResult.value.error) {
                setProducts((productsResult.value.data || []).map((p: any) => ({ ...p, imageUrl: p.image_url })));
                console.log('✅ Products loaded:', productsResult.value.data?.length || 0);
            } else {
                const errorMsg = productsResult.status === 'rejected' ? productsResult.reason?.message : productsResult.value?.error?.message;
                console.error('❌ Failed to load products:', errorMsg);
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
                console.log('✅ Invoices loaded:', invoices.length);
            } else {
                const errorMsg = invoicesResult.status === 'rejected' ? invoicesResult.reason?.message : invoicesResult.value?.error?.message;
                console.warn('⚠️ Failed to load invoices:', errorMsg);
            }

            // Clear timeout and show UI immediately
            clearTimeout(timeoutId);
            setLoading(false);
            console.log('✅ Critical data loaded, UI can render now');

            // PHASE 2: Load non-critical data in background (can be slower)
            console.log('📦 Phase 2: Loading secondary data (expenses, stock entries, etc.)...');
            
            const [
                expenseItemsData,
                expensesData,
                stockEntriesData
            ] = await Promise.allSettled([
                supabase.from('expense_items').select('*'),
                supabase.from('expenses').select('*').order('expense_date', { ascending: false }),
                supabase.from('purchase_entries').select('*, purchase_items(*)').order('entry_date', { ascending: false })
            ]);

            // Process secondary data
            if (expenseItemsData.status === 'fulfilled' && !expenseItemsData.value.error) {
                setExpenseItems((expenseItemsData.value.data || []).map((e: any) => ({ ...e, allowSubItems: e.allow_sub_items, subItems: e.sub_items })));
            } else {
                console.warn('⚠️ Failed to load expense items');
            }

            if (expensesData.status === 'fulfilled' && !expensesData.value.error) {
                setExpenses((expensesData.value.data || []).map((e: any) => ({ ...e, date: new Date(e.expense_date + 'T00:00:00').toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' }) })));
            } else {
                console.warn('⚠️ Failed to load expenses');
            }

            if (stockEntriesData.status === 'fulfilled' && !stockEntriesData.value.error) {
                setStockEntries((stockEntriesData.value.data || []).map(mapPurchaseEntryToStockEntry));
            } else {
                console.warn('⚠️ Failed to load stock entries');
            }

            console.log('✅ All data loading complete');

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
    // Format the current billing date to match the format stored in billedItems
    const selectedDateString = billingDate.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
    
    // Convert billing date to database format (YYYY-MM-DD) using local date, not UTC
    const year = billingDate.getFullYear();
    const month = String(billingDate.getMonth() + 1).padStart(2, '0');
    const day = String(billingDate.getDate()).padStart(2, '0');
    const billingDateForDB = `${year}-${month}-${day}`;

    // Count invoices from allInvoices (more accurate than billedItems)
    // This ensures we count ALL invoices for today, even if they have no items
    const invoicesForToday = allInvoices.filter(invoice => {
        const invoiceDate = invoice.bill_date || invoice.created_at.split('T')[0];
        return invoiceDate === billingDateForDB;
    });

    if (invoicesForToday.length === 0) {
        return 1; // Start from 1 for a new day
    }

    // Calculate daily invoice numbers for today's invoices
    const dbIdToDailyNumber = calculateDailyInvoiceNumbers(invoicesForToday);
    
    // Find the maximum daily invoice number
    const maxDailyNumber = Math.max(...Array.from(dbIdToDailyNumber.values()));
    
    // Also check billedItems for any 'hold' status items (optimistic updates)
    const invoicesForDate = billedItems.filter(item => item.date === selectedDateString);
    const holdInvoicesForDate = invoicesForDate.filter(item => item.status === 'hold');
    const maxHoldInvoiceNumber = holdInvoicesForDate.length > 0 
      ? Math.max(...holdInvoicesForDate.map(i => i.invoiceNumber))
      : 0;
    
    // Return the next number after the maximum found
    return Math.max(maxDailyNumber, maxHoldInvoiceNumber) + 1;

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
  
    // Clear any previous order placed info to prevent stale data
    setOrderPlacedInfo(null);

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
      
      // Use LOCAL date parts for bill_date to avoid timezone shifts (YYYY-MM-DD)
      const year = billingDate.getFullYear();
      const month = String(billingDate.getMonth() + 1).padStart(2, '0');
      const day = String(billingDate.getDate()).padStart(2, '0');
      const billDateForDB = `${year}-${month}-${day}`;

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

      // STEP 2: CALCULATE DAILY INVOICE NUMBER (OPTIMIZED - only fetch last 7 days)
      // Only fetch invoices from last 7 days + today to calculate daily invoice number efficiently
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      sevenDaysAgo.setHours(0, 0, 0, 0);
      const sevenDaysAgoStr = sevenDaysAgo.toISOString();
      
      const { data: freshInvoicesData, error: refreshError } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .gte('created_at', sevenDaysAgoStr)
        .order('id', { ascending: false });

      if (refreshError) {
        throw new Error(`Failed to refresh invoices: ${refreshError.message}`);
      }

      const freshInvoices = freshInvoicesData || [];
      
      // STEP 3: CALCULATE DAILY INVOICE NUMBER FROM DATABASE
      const dbIdToDailyNumber = calculateDailyInvoiceNumbers(freshInvoices);
      dailyInvoiceNumber = dbIdToDailyNumber.get(newInvoiceId) || newInvoiceId;
      
      if (!dailyInvoiceNumber || dailyInvoiceNumber <= 0) {
        throw new Error(`Failed to calculate daily invoice number for invoice ID ${newInvoiceId}`);
      }
      console.log(`[BILLING] Calculated daily invoice number: ${dailyInvoiceNumber} for DB ID: ${newInvoiceId}`);

      // STEP 4: UPDATE ALL INVOICES STATE (OPTIMIZED - merge with existing, don't replace)
      // Only update invoices from last 7 days, keep older ones in state
      setAllInvoices(prev => {
        const existingIds = new Set(freshInvoices.map((inv: any) => inv.id));
        const olderInvoices = prev.filter(inv => !existingIds.has(inv.id));
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

      // STEP 6: CLEAR ORDER (only after successful save)
      const isLastOrder = activeOrderIndex === orders.length - 1;
      if (orders.length > 1 && !isLastOrder) {
        const newOrders = orders.filter((o) => o.id !== activeOrder.id);
        setOrders(newOrders);
        setActiveOrderIndex(newOrders.length - 1);
      } else {
        handleClearOrder();
      }

      // STEP 7: SHOW POPUP (only after everything is saved and verified)
      const itemsForPrint = itemsToBill.map(item => ({
        name: String(item.product.name || ''),
        quantity: Number(item.quantity || 0),
        price: Number((item.product.price * item.quantity).toFixed(2))
      }));
      
      setOrderPlacedInfo({
        invoiceNumber: dailyInvoiceNumber,
        totalAmount: Number(total_amount.toFixed(2)),
        items: [...itemsForPrint]
      });
      console.log(`[BILLING] Order placed modal shown for invoice #${dailyInvoiceNumber}. Next invoice should be ${dailyInvoiceNumber + 1}`);

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
        image_url: updatedProduct.imageUrl || null // Explicitly set to null if empty
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
          ? { ...data, imageUrl: data.image_url || '' } 
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
            ? { ...refreshedProducts, imageUrl: refreshedProducts.image_url || '' } 
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

  // Show loading screen only while actively loading (not if loading failed)
  if (loading) {
    return (
        <div className="h-screen w-screen flex flex-col items-center justify-center bg-gray-100">
            <div className="text-3xl font-bold text-purple-800">Tea Time POS</div>
            <div className="mt-4 text-gray-600">Connecting to database...</div>
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
      {orderPlacedInfo && (
        <OrderPlacedModal
          isOpen={!!orderPlacedInfo}
          onClose={() => setOrderPlacedInfo(null)}
          onPrint={async () => {
            console.log('=== PRINT DEBUG START ===');
            console.log('Printing invoice #', orderPlacedInfo.invoiceNumber);
            console.log('OrderPlacedInfo:', JSON.parse(JSON.stringify(orderPlacedInfo))); // Deep copy for logging
            
            // ALWAYS use items directly from orderPlacedInfo - create a fresh copy
            let itemsToPrint: Array<{ name: string; quantity: number; price: number }> = [];
            
            if (orderPlacedInfo.items && Array.isArray(orderPlacedInfo.items) && orderPlacedInfo.items.length > 0) {
              // Create a fresh copy of items to avoid any mutation issues
              itemsToPrint = orderPlacedInfo.items.map(item => ({
                name: String(item.name || ''),
                quantity: Number(item.quantity || 0),
                price: Number(item.price || 0)
              }));
              
              // Validate items belong to this invoice by checking count matches
              console.log('Using items from orderPlacedInfo');
              console.log('Items count from orderPlacedInfo:', itemsToPrint.length);
            } else {
              // Fallback: Try to find items from billedItems if not in orderPlacedInfo
              console.warn('No items in orderPlacedInfo, trying billedItems filter...');
              const invoiceItems = billedItems.filter(item => 
                item.invoiceNumber === orderPlacedInfo.invoiceNumber
              );
              console.log('Found invoice items from billedItems:', invoiceItems);
              console.log('Invoice items count from billedItems:', invoiceItems.length);
              
              if (invoiceItems.length > 0) {
                itemsToPrint = invoiceItems.map(item => ({
                  name: String(item.productName || ''),
                  quantity: Number(item.quantity || 0),
                  price: Number(item.price || 0)
                }));
              }
            }
            
            // Final validation - ensure we have items and they match the invoice
            console.log('=== ITEM VALIDATION ===');
            console.log('Invoice Number:', orderPlacedInfo.invoiceNumber);
            console.log('Final items to print:', itemsToPrint);
            console.log('Final items count:', itemsToPrint.length);
            
            // Verify items array is clean and doesn't contain duplicates
            const itemNames = itemsToPrint.map(i => i.name);
            const uniqueNames = new Set(itemNames);
            if (itemNames.length !== uniqueNames.size) {
              console.warn('WARNING: Duplicate items detected!', itemNames);
              // Remove duplicates, keeping first occurrence
              const seen = new Set<string>();
              itemsToPrint = itemsToPrint.filter(item => {
                if (seen.has(item.name)) {
                  return false;
                }
                seen.add(item.name);
                return true;
              });
              console.log('After deduplication:', itemsToPrint);
            }
            
            if (itemsToPrint.length > 0) {
              try {
                // Get date from current billing date or first billed item
                const firstBilledItem = billedItems.find(item => item.invoiceNumber === orderPlacedInfo.invoiceNumber);
                const timestamp = firstBilledItem?.timestamp || Date.now();
                
                const dateStr = new Date(timestamp).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric'
                });
                const timeStr = new Date(timestamp).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                });

                const printData: PrintData = {
                  invoiceNumber: orderPlacedInfo.invoiceNumber,
                  date: dateStr,
                  time: timeStr,
                  items: itemsToPrint,
                  totalAmount: orderPlacedInfo.totalAmount
                };

                console.log('=== PRINT DATA ===');
                console.log('Print data invoice #:', printData.invoiceNumber);
                console.log('Print data items count:', printData.items.length);
                console.log('Print data items:', printData.items);
                console.log('Print data total:', printData.totalAmount);
                console.log('=== CHECKING FOR SAVED PRINTER ===');

                // Check if printer is saved in settings
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

                  if (hasSavedPrinter) {
                    console.log('Found saved printer, printing directly...');
                    await printReceipt(printData, true);
                  } else {
                    console.log('No saved printer found, showing selection modal...');
                    // Show printer selection modal
                    setPendingPrintData(printData);
                    setIsPrinterSelectionModalOpen(true);
                    return; // Don't close modal yet, wait for printer selection
                  }
                } catch (error: any) {
                  console.warn('Error checking printer settings:', error);
                  // If settings check fails, check if error is about no printer, then show modal
                  if (error.code === 'PGRST116' || !error.code) {
                    // No settings found, show printer selection modal
                    setPendingPrintData(printData);
                    setIsPrinterSelectionModalOpen(true);
                    return;
                  }
                  // Otherwise, try printing (will throw error if no printer)
                  await printReceipt(printData, true);
                }
                
                console.log('=== PRINT COMPLETE ===');
              } catch (error: any) {
                console.error('=== PRINT ERROR ===', error);
                alert(error.message || 'Failed to print. Please try again.');
              }
            } else {
              console.error('=== NO ITEMS TO PRINT ===');
              console.error('No items found for invoice #', orderPlacedInfo.invoiceNumber);
              console.error('BilledItems length:', billedItems.length);
              console.error('BilledItems sample:', billedItems.slice(0, 3));
              alert('No items found for this invoice. Please try again.');
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