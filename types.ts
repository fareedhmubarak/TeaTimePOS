export interface Category {
  id: number;
  name: string;
  displayOrder: number;
}

export interface Product {
  id: number;
  name: string;
  price: number;
  profit: number;
  category: string;
  imageUrl: string;
  displayOrder?: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: number;
  items: CartItem[];
}

export interface BilledItem {
  invoiceNumber: number; // Daily sequential invoice number (1, 2, 3...)
  invoiceDbId?: number; // Database ID for operations (used when loaded from DB)
  productName: string;
  quantity: number;
  price: number;
  profit: number;
  date: string;
  timestamp: number;
  status?: 'hold' | 'synced';
}

export interface Expense {
  id: number;
  description: string;
  amount: number;
  date: string;
}

export interface StockItem {
  id: string;
  name: string;
  quantity: number;
  cost: number;
}

export interface StockEntry {
  id: number;
  date: string; // YYYY-MM-DD
  primaryDescription: string;
  items: StockItem[];
  totalCost: number;
  billImageUrl?: string;
}

export interface ExpenseItem {
  id: number;
  name: string;
  category: 'Daily' | 'Monthly';
  allowSubItems?: boolean;
  subItems?: string[];
}

export interface AppSettings {
  monthlyRent: number;
  monthlySalary: number;
  milkRatePerLiter: number;
  dailyMilkUsageLiters: number;
}

export interface BluetoothPrinter {
  id: string;
  name: string;
  address: string; // MAC address
}

export interface PrinterSettings {
  id?: number;
  saveButton: boolean;
  saveAndPrintMode: boolean;
  connectionType: 'USB' | 'Bluetooth' | 'Lan';
  paperSize: '58mm' | '72mm' | '80mm';
  selectedBluetoothPrinter?: BluetoothPrinter | null;
  shopName: string;
  contactNumber: string;
  fssaiNo: string;
  gst: string;
  footer: string;
  shopAddress: string;
  bankDetails: string;
  footerNote: string;
  printOptions: {
    merchantCopy: boolean;
    productWiseToken: boolean;
    showPaidText: boolean;
    showGstAbstract: boolean;
    showMrpColumn: boolean;
    disableEstimateLabel: boolean;
    showFullPriceIncGst: boolean;
    showTaxInvoiceLabel: boolean;
    dontShowBalanceInCreditBill: boolean;
    showDescriptionInKot: boolean;
  };
  printLogo: boolean;
  printQr: boolean;
}