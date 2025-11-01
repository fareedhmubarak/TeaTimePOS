/**
 * ESC/POS Printer Utility for Direct Printing
 * Supports Shreyans Mobile Printer and other ESC/POS compatible thermal printers
 */

export interface PrintData {
  invoiceNumber: number;
  date: string;
  time: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  totalAmount: number;
}

// ESC/POS Command Constants
const ESC = '\x1B';
const GS = '\x1D';
const INIT = ESC + '@';
const LF = '\x0A';
const ESC_d = ESC + 'd';

/**
 * Converts text to ESC/POS encoded format
 */
function encode(str: string): Uint8Array {
  const encoder = new TextEncoder();
  return encoder.encode(str);
}

/**
 * ESC/POS Commands
 */
const commands = {
  init: () => encode(INIT),
  lineFeed: (n: number = 1) => encode(ESC_d + String.fromCharCode(n)),
  setAlign: (align: 'left' | 'center' | 'right') => {
    const alignCodes = { left: '\x00', center: '\x01', right: '\x02' };
    return encode(ESC + 'a' + alignCodes[align]);
  },
  setTextSize: (width: number = 1, height: number = 1) => {
    const size = ((width - 1) << 4) | (height - 1);
    return encode(GS + '!' + String.fromCharCode(size));
  },
  setBold: (enabled: boolean) => encode(ESC + 'E' + String.fromCharCode(enabled ? 1 : 0)),
  setUnderline: (enabled: boolean) => encode(ESC + '-' + String.fromCharCode(enabled ? 1 : 0)),
  cut: () => encode(GS + 'V' + '\x41' + '\x03'),
  openCashDrawer: () => encode(ESC + 'p' + '\x00' + '\x19' + '\xFF'),
};

/**
 * Formats text for 58mm thermal printer (max ~32 characters per line)
 */
function formatText(text: string, maxWidth: number = 32): string {
  return text.length > maxWidth ? text.substring(0, maxWidth - 3) + '...' : text;
}

/**
 * Creates ESC/POS command sequence for receipt printing
 */
export function generateReceiptCommands(data: PrintData): Uint8Array {
  const chunks: Uint8Array[] = [];
  
  // Initialize printer
  chunks.push(commands.init());
  
  // Header - Centered, Bold, Large
  chunks.push(commands.setTextSize(2, 2));
  chunks.push(commands.setAlign('center'));
  chunks.push(commands.setBold(true));
  chunks.push(encode('Tea Time\n'));
  chunks.push(commands.setTextSize(1, 1));
  chunks.push(encode('Point of Sale\n'));
  
  // Invoice Info - Left aligned
  chunks.push(commands.setAlign('left'));
  chunks.push(commands.setBold(false));
  chunks.push(commands.setTextSize(1, 1));
  chunks.push(encode('--------------------------------\n'));
  chunks.push(commands.setBold(true));
  chunks.push(encode(`Invoice #: ${data.invoiceNumber}\n`));
  chunks.push(commands.setBold(false));
  chunks.push(encode(`Date: ${data.date} ${data.time}\n`));
  chunks.push(encode('--------------------------------\n'));
  
  // Items - Left aligned, compact format
  chunks.push(commands.setAlign('left'));
  
  console.log('Generating receipt for items:', data.items);
  console.log('Items count:', data.items.length);
  
  data.items.forEach((item, index) => {
    console.log(`Processing item ${index + 1}:`, item);
    const itemName = formatText(item.name, 20);
    const qty = `x${item.quantity}`;
    // Use "Rs" instead of ₹ symbol to avoid encoding issues
    const price = `Rs ${item.price.toFixed(2)}`;
    
    // Single line format: Item Name (Qty) ... Price
    chunks.push(encode(itemName));
    chunks.push(encode(' '));
    chunks.push(encode(qty));
    
    // Calculate spacing to align price to right
    const lineLength = itemName.length + 1 + qty.length;
    const totalLineLength = 32; // Max chars for 58mm printer
    const spacing = Math.max(1, totalLineLength - lineLength - price.length);
    chunks.push(encode(' '.repeat(spacing)));
    
    // Price on same line, right aligned
    chunks.push(commands.setBold(true));
    chunks.push(encode(price));
    chunks.push(commands.setBold(false));
    chunks.push(encode('\n'));
  });
  
  console.log('All items processed. Total items:', data.items.length);
  
  chunks.push(encode('--------------------------------\n'));
  
  // Total - Right aligned, Bold, Large
  chunks.push(commands.setAlign('right'));
  chunks.push(commands.setTextSize(1, 1));
  chunks.push(commands.setBold(true));
  chunks.push(encode('Total Amount\n'));
  chunks.push(commands.setTextSize(2, 1));
  // Use "Rs" instead of ₹ symbol
  chunks.push(encode(`Rs ${data.totalAmount.toFixed(2)}\n`));
  chunks.push(commands.setTextSize(1, 1));
  chunks.push(commands.setBold(false));
  
  // Footer - reduced spacing
  chunks.push(commands.setAlign('center'));
  chunks.push(encode('--------------------------------\n'));
  chunks.push(encode('Thank you for your visit!\n'));
  
  // Cut paper
  chunks.push(commands.cut());
  
  // Combine all chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }
  
  return result;
}

/**
 * Prints directly to serial printer using Web Serial API
 */
export async function printToSerialPrinter(data: PrintData): Promise<void> {
  if (!('serial' in navigator)) {
    throw new Error('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.');
  }
  
  let port: SerialPort | null = null;
  
  try {
    // Request serial port access
    port = await (navigator as any).serial.requestPort();
    
    // Open the port with 9600 baud rate (common for thermal printers)
    await port.open({ baudRate: 9600 });
    
    // Get writable stream
    const writer = port.writable?.getWriter();
    if (!writer) {
      throw new Error('Could not get writer for serial port');
    }
    
    // Generate ESC/POS commands
    const commands = generateReceiptCommands(data);
    
    // Write commands to printer
    await writer.write(commands);
    
    // Release writer lock
    writer.releaseLock();
    
    // Close port
    await port.close();
    
    console.log('Print job sent successfully');
  } catch (error: any) {
    if (port) {
      try {
        await port.close();
      } catch (e) {
        console.error('Error closing port:', e);
      }
    }
    
    if (error.name === 'NotFoundError') {
      throw new Error('No printer selected. Please select your Shreyans printer from the device list.');
    } else if (error.name === 'SecurityError') {
      throw new Error('Permission denied. Please allow access to the serial port.');
    } else {
      throw new Error(`Print error: ${error.message || 'Unknown error'}`);
    }
  }
}

/**
 * Fallback: Silent print using browser print API (requires browser configuration)
 * This is used when Web Serial API is not available or user prefers browser printing
 */
export function printViaBrowser(data: PrintData, onComplete?: () => void): void {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow pop-ups to print receipts');
    return;
  }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Invoice #${data.invoiceNumber}</title>
        <style>
          @page { size: 58mm auto; margin: 0; padding: 0; }
          @media print {
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { margin: 0; padding: 2mm 3mm; width: 58mm; font-size: 10px; }
            html, body { height: auto; overflow: visible; }
          }
          body { font-family: Arial, sans-serif; width: 58mm; margin: 0; padding: 2mm 3mm; color: #000; font-size: 10px; }
          .header { text-align: center; border-bottom: 1px solid #000; padding-bottom: 2mm; margin-bottom: 2mm; }
          .header h1 { margin: 0; font-size: 14px; font-weight: bold; line-height: 1.1; }
          .header p { margin: 1px 0 0 0; font-size: 9px; line-height: 1.1; }
          .invoice-info { margin-bottom: 2mm; font-size: 8px; line-height: 1.3; }
          .invoice-info div { display: flex; justify-content: space-between; margin-bottom: 1px; }
          .items { border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 2mm 0; margin: 2mm 0; }
          .item { display: flex; justify-content: space-between; margin-bottom: 2mm; font-size: 9px; line-height: 1.2; word-wrap: break-word; }
          .item-name { flex: 1; margin-right: 2mm; }
          .item-qty { margin: 0 1mm; white-space: nowrap; font-size: 8px; }
          .item-price { text-align: right; min-width: 18mm; white-space: nowrap; }
          .total { margin-top: 2mm; text-align: right; }
          .total-label { font-size: 10px; font-weight: bold; margin-bottom: 1px; }
          .total-amount { font-size: 14px; font-weight: bold; }
          .footer { margin-top: 2mm; text-align: center; font-size: 8px; border-top: 1px dashed #000; padding-top: 2mm; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="header"><h1>Tea Time</h1><p>Point of Sale</p></div>
        <div class="invoice-info">
          <div><span>Invoice #:</span><span>${data.invoiceNumber}</span></div>
          <div><span>Date:</span><span>${data.date} ${data.time}</span></div>
        </div>
        <div class="items">
          ${data.items.map(item => `
            <div class="item">
              <span class="item-name">${item.name}</span>
              <span class="item-qty">Qty: ${item.quantity}</span>
              <span class="item-price">₹${item.price.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        <div class="total">
          <div class="total-label">Total Amount</div>
          <div class="total-amount">₹${data.totalAmount.toFixed(2)}</div>
        </div>
        <div class="footer"><p>Thank you for your visit!</p></div>
      </body>
    </html>
  `);
  
  printWindow.document.close();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
    if (onComplete) onComplete();
  }, 250);
}

/**
 * Smart print function that tries direct printing first, falls back to browser printing
 */
export async function printReceipt(data: PrintData, preferDirect: boolean = true): Promise<void> {
  if (preferDirect && 'serial' in navigator) {
    try {
      await printToSerialPrinter(data);
      return;
    } catch (error: any) {
      console.warn('Direct printing failed, falling back to browser print:', error.message);
      // Fall through to browser printing
    }
  }
  
  // Fallback to browser printing
  printViaBrowser(data);
}

