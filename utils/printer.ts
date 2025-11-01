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
  cut: () => encode(GS + 'V' + '\x41' + '\x00'), // Full cut (65='\x41') with 0 feed lines (saves paper)
  cutWithFeed: (n: number = 0) => {
    // Full cut (65) with n feed lines (0 = no feed, saves paper)
    return encode(GS + 'V' + '\x41' + String.fromCharCode(n));
  },
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
  // Validate input data
  if (!data.items || data.items.length === 0) {
    throw new Error('No items to print. Cannot generate receipt.');
  }
  
  if (data.items.length > 50) {
    console.warn('Large number of items:', data.items.length);
  }
  
  console.log('=== GENERATING RECEIPT COMMANDS ===');
  console.log('Invoice #:', data.invoiceNumber);
  console.log('Items count:', data.items.length);
  console.log('All items:', data.items.map((item, idx) => `${idx + 1}. ${item.name} x${item.quantity}`));
  
  const chunks: Uint8Array[] = [];
  
  // Initialize printer
  chunks.push(commands.init());
  
  // Header - Centered, Bold, Large (compact)
  chunks.push(commands.setTextSize(2, 2));
  chunks.push(commands.setAlign('center'));
  chunks.push(commands.setBold(true));
  chunks.push(encode('Tea Time\n'));
  chunks.push(commands.setTextSize(1, 1));
  chunks.push(encode('Point of Sale\n'));
  
  // Invoice Info - Left aligned (compact, no extra spacing)
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
  
  // Footer - minimal spacing
  chunks.push(commands.setAlign('center'));
  chunks.push(encode('--------------------------------\n'));
  chunks.push(encode('Thank you for your visit!\n'));
  
  // Cut paper immediately after footer with NO feed (0 feed lines = no extra space)
  // This cuts right after the text, saving paper
  chunks.push(commands.cutWithFeed(0));
  
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

// Cache the serial port connection to avoid showing selection dialog every time
let cachedPort: SerialPort | null = null;
let isPortOpen = false;

/**
 * Gets or creates a serial port connection (reuses cached connection)
 */
async function getSerialPort(): Promise<SerialPort> {
  // If we have a cached open port, reuse it
  if (cachedPort && isPortOpen && cachedPort.readable && cachedPort.writable) {
    console.log('Reusing existing printer connection');
    return cachedPort;
  }
  
  // Otherwise, request a new port (shows selection dialog)
  console.log('Requesting new printer connection...');
  const port = await (navigator as any).serial.requestPort();
  
  // Open the port with 9600 baud rate (common for thermal printers)
  await port.open({ baudRate: 9600 });
  
  // Cache the port
  cachedPort = port;
  isPortOpen = true;
  
  // Listen for disconnect events
  port.addEventListener('disconnect', () => {
    console.log('Printer disconnected, clearing cache');
    cachedPort = null;
    isPortOpen = false;
  });
  
  return port;
}

/**
 * Prints directly to serial printer using Web Serial API
 */
export async function printToSerialPrinter(data: PrintData): Promise<void> {
  if (!('serial' in navigator)) {
    throw new Error('Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.');
  }
  
  console.log('=== PRINT TO SERIAL PRINTER ===');
  console.log('Invoice #:', data.invoiceNumber);
  console.log('Items to print:', data.items.length);
  console.log('Items:', data.items);
  
  let writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  let port: SerialPort | null = null;
  
  try {
    // Get or create serial port connection
    port = await getSerialPort();
    
    // Check if port is already open, if not, open it
    if (!port.readable || !port.writable) {
      console.log('Port not open, opening...');
      await port.open({ baudRate: 9600 });
      isPortOpen = true;
    }
    
    // Get writable stream
    writer = port.writable?.getWriter();
    if (!writer) {
      throw new Error('Could not get writer for serial port');
    }
    
    // Generate ESC/POS commands
    console.log('Generating ESC/POS commands...');
    const commands = generateReceiptCommands(data);
    console.log('Command buffer size:', commands.length, 'bytes');
    
    // Write commands to printer in smaller chunks for better reliability (especially on tablets)
    // Smaller chunks help prevent buffer overflow on slower connections
    const chunkSize = 256; // Reduced from 512 to 256 for better tablet compatibility
    let offset = 0;
    const totalChunks = Math.ceil(commands.length / chunkSize);
    
    console.log(`Writing ${commands.length} bytes in ${totalChunks} chunks of ${chunkSize} bytes`);
    
    while (offset < commands.length) {
      const chunk = commands.slice(offset, Math.min(offset + chunkSize, commands.length));
      console.log(`Writing chunk ${Math.floor(offset / chunkSize) + 1}/${totalChunks} (${chunk.length} bytes)`);
      
      try {
        await writer.write(chunk);
        offset += chunk.length;
        
        // Small delay between chunks for reliability (increased slightly for tablets)
        if (offset < commands.length) {
          await new Promise(resolve => setTimeout(resolve, 20)); // Increased from 10ms to 20ms
        }
      } catch (chunkError: any) {
        console.error(`Error writing chunk at offset ${offset}:`, chunkError);
        throw new Error(`Failed to write data chunk: ${chunkError.message}`);
      }
    }
    
    console.log('All chunks written, waiting for flush...');
    
    // Wait for all data to be flushed to printer
    await writer.ready;
    
    // Wait for write buffer to be fully sent
    await new Promise(resolve => setTimeout(resolve, 200)); // Increased delay for tablet reliability
    
    // Release writer lock (but keep port open for next print)
    writer.releaseLock();
    writer = null;
    
    console.log('Writer released, waiting for printer to process and cut...');
    
    // Additional delay to ensure printer fully processes and cuts the paper
    // Longer delay for tablets which may have slower processing
    await new Promise(resolve => setTimeout(resolve, 1500)); // Increased from 1000ms to 1500ms for reliability
    
    console.log('✅ Print job sent and completed successfully');
    console.log('⚠️ Keeping port open for next print (no selection dialog needed)');
    
    // DON'T close the port - keep it open for reuse
    // This way next print won't show selection dialog
    
  } catch (error: any) {
    // Clean up writer if still open
    if (writer) {
      try {
        writer.releaseLock();
      } catch (e) {
        console.error('Error releasing writer:', e);
      }
    }
    
    // If port error, clear cache and close
    if (port && (error.name === 'InvalidStateError' || error.name === 'NetworkError')) {
      console.log('Port error detected, clearing cache');
      try {
        if (isPortOpen) {
          await port.close();
        }
      } catch (e) {
        console.error('Error closing port:', e);
      }
      cachedPort = null;
      isPortOpen = false;
    }
    
    if (error.name === 'NotFoundError') {
      throw new Error('No printer selected. Please select your Shreyans printer from the device list.');
    } else if (error.name === 'SecurityError') {
      throw new Error('Permission denied. Please allow access to the serial port.');
    } else if (error.name === 'AbortError') {
      throw error; // User cancelled, don't wrap
    } else {
      console.error('Print error details:', error);
      throw new Error(`Print error: ${error.message || 'Unknown error'}`);
    }
  }
}

/**
 * Manually disconnect and clear cached printer connection
 * Call this if you want to allow selecting a different printer next time
 */
export async function disconnectPrinter(): Promise<void> {
  if (cachedPort && isPortOpen) {
    try {
      await cachedPort.close();
      console.log('Printer connection closed');
    } catch (e) {
      console.error('Error closing printer:', e);
    }
  }
  cachedPort = null;
  isPortOpen = false;
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
              <span class="item-price">Rs ${item.price.toFixed(2)}</span>
            </div>
          `).join('')}
        </div>
        <div class="total">
          <div class="total-label">Total Amount</div>
          <div class="total-amount">Rs ${data.totalAmount.toFixed(2)}</div>
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
 * Check if Web Serial API is supported and available
 */
function isWebSerialAPISupported(): boolean {
  // Check if Web Serial API exists
  const hasSerial = 'serial' in navigator;
  
  // Get browser information
  const userAgent = navigator.userAgent || '';
  const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
  const isEdge = /Edg/.test(userAgent);
  const isOpera = /OPR/.test(userAgent) || /Opera/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);
  const isAndroid = /Android/.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/.test(userAgent);
  const isMobile = /Mobile/.test(userAgent) || isAndroid || isIOS;
  
  console.log('=== WEB SERIAL API CHECK ===');
  console.log('Has serial in navigator:', hasSerial);
  console.log('User Agent:', userAgent);
  console.log('Browser detection:', {
    isChrome,
    isEdge,
    isOpera,
    isSafari,
    isFirefox,
    isAndroid,
    isIOS,
    isMobile
  });
  
  // Web Serial API requirements:
  // 1. Must be Chrome, Edge, or Opera
  // 2. Must have 'serial' in navigator
  // 3. Must be HTTPS or localhost
  // 4. Not available on iOS Safari
  // 5. Limited support on Android
  
  if (!hasSerial) {
    console.warn('❌ Web Serial API not found in navigator');
    if (isSafari || isIOS) {
      console.warn('Safari/iOS does not support Web Serial API. Please use Chrome, Edge, or Opera.');
    } else if (isFirefox) {
      console.warn('Firefox does not support Web Serial API. Please use Chrome, Edge, or Opera.');
    } else if (isMobile && isAndroid) {
      console.warn('Android Chrome may have limited Web Serial API support. Try desktop Chrome for best results.');
    } else if (!isChrome && !isEdge && !isOpera) {
      console.warn('Browser may not support Web Serial API. Chrome, Edge, or Opera required.');
    }
    return false;
  }
  
  // Additional checks
  const isSecureContext = window.isSecureContext || location.protocol === 'https:' || location.hostname === 'localhost';
  if (!isSecureContext) {
    console.warn('Web Serial API requires HTTPS or localhost. Current protocol:', location.protocol);
    return false;
  }
  
  console.log('✅ Web Serial API is available and should work!');
  return true;
}

/**
 * Smart print function that tries direct printing first, falls back to browser printing
 */
export async function printReceipt(data: PrintData, preferDirect: boolean = true): Promise<void> {
  console.log('=== PRINT RECEIPT START ===');
  console.log('Prefer direct:', preferDirect);
  
  // Check Web Serial API support
  const hasWebSerial = isWebSerialAPISupported();
  
  if (preferDirect && hasWebSerial) {
    try {
      console.log('Attempting direct printing via Web Serial API...');
      await printToSerialPrinter(data);
      console.log('Direct printing successful!');
      return;
    } catch (error: any) {
      console.error('Direct printing failed:', error);
      console.warn('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // If it's a user cancellation (AbortError), don't fall back automatically
      if (error.name === 'AbortError' || error.message?.includes('cancel')) {
        console.log('User cancelled printer selection');
        throw error; // Let the caller handle cancellation
      }
      
      console.warn('Falling back to browser print...');
      // Fall through to browser printing
    }
  } else {
      if (!preferDirect) {
        console.log('Direct printing disabled, using browser print');
      } else {
        console.warn('Web Serial API not available, using browser print');
        // Don't show alert - just log and use browser print silently
        // The browser print dialog will handle printer selection
      }
    }
  
  // Fallback to browser printing
  console.log('Using browser print fallback');
  printViaBrowser(data);
}

