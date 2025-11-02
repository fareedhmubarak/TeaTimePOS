import React, { useState, useEffect, useRef } from 'react';
import { PrinterSettings, BluetoothPrinter } from '../types.ts';
import { supabase } from '../supabaseClient.ts';
import { ArrowLeftIcon, BluetoothIcon, RefreshIcon, WifiIcon, UsbIcon } from './Icons.tsx';

interface PrinterSettingsPageProps {
  onBack?: () => void;
}

const PrinterSettingsPage: React.FC<PrinterSettingsPageProps> = ({ onBack }) => {
  const [settings, setSettings] = useState<PrinterSettings>({
    saveButton: false,
    saveAndPrintMode: true,
    connectionType: 'Bluetooth',
    paperSize: '58mm',
    selectedBluetoothPrinter: null,
    shopName: 'Tea Time Kuppam',
    contactNumber: '',
    fssaiNo: '',
    gst: '',
    footer: '',
    shopAddress: 'Palace Road Kuppam',
    bankDetails: '',
    footerNote: '',
    printOptions: {
      merchantCopy: false,
      productWiseToken: false,
      showPaidText: false,
      showGstAbstract: false,
      showMrpColumn: false,
      disableEstimateLabel: false,
      showFullPriceIncGst: false,
      showTaxInvoiceLabel: false,
      dontShowBalanceInCreditBill: false,
      showDescriptionInKot: false,
    },
    printLogo: false,
    printQr: false,
  });

  const [bluetoothPrinters, setBluetoothPrinters] = useState<BluetoothPrinter[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const autoConnectAttempted = useRef(false);

  // Load settings from Supabase on mount AND whenever component becomes visible
  useEffect(() => {
    console.log('🔄 PrinterSettingsPage mounted/visible - loading settings...');
    loadSettings();
  }, []);

  // Listen for tab activation event from AdminDashboard
  useEffect(() => {
    const handleTabActivated = () => {
      console.log('📋 Printer tab activated - reloading settings...');
      loadSettings();
    };
    
    window.addEventListener('printerTabActivated', handleTabActivated);
    
    return () => {
      window.removeEventListener('printerTabActivated', handleTabActivated);
    };
  }, []); // Empty deps - loadSettings is stable

  // Reload settings when component becomes visible (handles tab switching)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('👁️ Window became visible - reloading settings...');
        loadSettings();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', () => {
      console.log('👁️ Window focused - reloading settings...');
      loadSettings();
    });
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Auto-connect to saved printer when settings are loaded
  useEffect(() => {
    if (settings.connectionType === 'Bluetooth' && settings.selectedBluetoothPrinter && !autoConnectAttempted.current) {
      autoConnectAttempted.current = true;
      autoConnectPrinter();
    }
  }, [settings.connectionType, settings.selectedBluetoothPrinter]);

  const loadSettings = async () => {
    try {
      console.log('📥 Loading printer settings from Supabase...');
      
      // First, try to get the most recent row by updated_at (more reliable than created_at)
      const { data, error } = await supabase
        .from('printer_settings')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(); // Use maybeSingle instead of single to handle no rows gracefully

      console.log('📥 Query result:', { 
        data: data ? { id: data.id, hasPrinter: !!data.selected_bluetooth_printer } : null, 
        error: error?.message, 
        errorCode: error?.code 
      });

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        console.error('❌ Error loading printer settings:', error);
        return;
      }

      if (data) {
        console.log('✅ Settings loaded from database. Row ID:', data.id, 'Has printer:', !!data.selected_bluetooth_printer);
        
        // Parse JSONB fields correctly
        let selectedBluetoothPrinter = null;
        if (data.selected_bluetooth_printer) {
          try {
            // If it's already an object, use it directly, otherwise parse
            selectedBluetoothPrinter = typeof data.selected_bluetooth_printer === 'string' 
              ? JSON.parse(data.selected_bluetooth_printer)
              : data.selected_bluetooth_printer;
            console.log('✅ Parsed Bluetooth printer:', selectedBluetoothPrinter);
          } catch (e) {
            console.error('❌ Error parsing selected_bluetooth_printer:', e);
          }
        } else {
          console.log('ℹ️ No Bluetooth printer saved yet');
        }

        let printOptions = {};
        if (data.print_options) {
          try {
            printOptions = typeof data.print_options === 'string'
              ? JSON.parse(data.print_options)
              : data.print_options;
          } catch (e) {
            console.error('❌ Error parsing print_options:', e);
          }
        }

        const loadedSettings: PrinterSettings = {
          saveButton: data.save_button || false,
          saveAndPrintMode: data.save_and_print_mode ?? true,
          connectionType: data.connection_type || 'Bluetooth',
          paperSize: data.paper_size || '58mm',
          selectedBluetoothPrinter,
          shopName: data.shop_name || 'Tea Time Kuppam',
          contactNumber: data.contact_number || '',
          fssaiNo: data.fssai_no || '',
          gst: data.gst || '',
          footer: data.footer || '',
          shopAddress: data.shop_address || 'Palace Road Kuppam',
          bankDetails: data.bank_details || '',
          footerNote: data.footer_note || '',
          printOptions: printOptions || {
            merchantCopy: false,
            productWiseToken: false,
            showPaidText: false,
            showGstAbstract: false,
            showMrpColumn: false,
            disableEstimateLabel: false,
            showFullPriceIncGst: false,
            showTaxInvoiceLabel: false,
            dontShowBalanceInCreditBill: false,
            showDescriptionInKot: false,
          },
          printLogo: data.print_logo || false,
          printQr: data.print_qr || false,
        };
        
        console.log('✅ Settings object created:', {
          hasPrinter: !!loadedSettings.selectedBluetoothPrinter,
          printerName: loadedSettings.selectedBluetoothPrinter?.name,
          connectionType: loadedSettings.connectionType
        });
        
        setSettings(loadedSettings);
        console.log('✅ Settings applied to UI state');
      } else {
        console.log('ℹ️ No settings found in database - using defaults');
      }
    } catch (error) {
      console.error('❌ Error loading printer settings:', error);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setMessage(null);
    
    try {
      console.log('💾 Saving printer settings to Supabase...', settings);
      
      // First, check if there's an existing row (use updated_at for more reliable ordering)
      const { data: existingData } = await supabase
        .from('printer_settings')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const settingsToSave = {
        save_button: settings.saveButton,
        save_and_print_mode: settings.saveAndPrintMode,
        connection_type: settings.connectionType,
        paper_size: settings.paperSize,
        selected_bluetooth_printer: settings.selectedBluetoothPrinter || null, // Store as JSONB directly
        shop_name: settings.shopName,
        contact_number: settings.contactNumber,
        fssai_no: settings.fssaiNo,
        gst: settings.gst,
        footer: settings.footer,
        shop_address: settings.shopAddress,
        bank_details: settings.bankDetails,
        footer_note: settings.footerNote,
        print_options: settings.printOptions,
        print_logo: settings.printLogo,
        print_qr: settings.printQr,
        updated_at: new Date().toISOString(),
      };

      let error;
      if (existingData?.id) {
        console.log('🔄 Updating existing settings row (ID:', existingData.id, ')');
        // Update existing row
        const { error: updateError } = await supabase
          .from('printer_settings')
          .update(settingsToSave)
          .eq('id', existingData.id);
        error = updateError;
      } else {
        console.log('➕ Creating new settings row');
        // Create new row
        const { error: insertError } = await supabase
          .from('printer_settings')
          .insert(settingsToSave);
        error = insertError;
      }

      if (error) {
        console.error('❌ Error saving settings:', error);
        throw error;
      }

      console.log('✅ Settings saved successfully!');
      setMessage({ type: 'success', text: 'Settings saved successfully!' });
      setTimeout(() => setMessage(null), 3000);
      
      // Reload settings to ensure sync
      await loadSettings();
    } catch (error: any) {
      console.error('❌ Error saving printer settings:', error);
      setMessage({ type: 'error', text: `Failed to save settings: ${error.message}` });
    } finally {
      setIsSaving(false);
    }
  };

  // Cache the scanned device so we can reuse it when selecting
  let scannedDeviceCache: BluetoothDevice | null = null;

  const scanBluetoothPrinters = async () => {
    if (!navigator.bluetooth) {
      setMessage({ type: 'error', text: 'Bluetooth is not supported on this device. Please use Chrome/Edge on Android or desktop.' });
      return;
    }

    setIsScanning(true);
    setBluetoothPrinters([]);
    setMessage(null);

    try {
      // Request Bluetooth device - use acceptAllDevices to let user select
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb', // Generic printer service
          '0000ff00-0000-1000-8000-00805f9b34fb', // Common thermal printer
          '0000ff10-0000-1000-8000-00805f9b34fb', // Alternative thermal printer
        ],
      });

      // Cache the device object for reuse
      scannedDeviceCache = device;

      const printer: BluetoothPrinter = {
        id: device.id,
        name: device.name || 'Unknown Printer',
        address: device.id,
      };

      setBluetoothPrinters([printer]);
      setMessage({ type: 'success', text: `Found printer: ${printer.name}` });
    } catch (error: any) {
      if (error.name === 'NotFoundError' || error.name === 'DOMException') {
        setMessage({ type: 'error', text: 'No Bluetooth printer selected. Make sure your printer is powered on and select it from the device list.' });
      } else if (error.name === 'SecurityError') {
        setMessage({ type: 'error', text: 'Please allow Bluetooth access permissions.' });
      } else if (error.name === 'InvalidStateError') {
        setMessage({ type: 'error', text: 'Bluetooth is already in use. Please close other connections.' });
      } else {
        setMessage({ type: 'error', text: `Scan failed: ${error.message}` });
      }
    } finally {
      setIsScanning(false);
    }
  };

  const autoConnectPrinter = async () => {
    if (!settings.selectedBluetoothPrinter || !navigator.bluetooth) {
      return;
    }

    try {
      // Try to connect to saved printer
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ id: settings.selectedBluetoothPrinter.id }],
      });

      if (device) {
        setMessage({ type: 'success', text: `Connected to ${device.name}` });
      }
    } catch (error: any) {
      console.log('Auto-connect failed (printer may be off):', error.message);
      // Silent fail - printer might be off
    }
  };

  const selectPrinter = async (printer: BluetoothPrinter) => {
    console.log('🖨️ Selecting printer:', printer);
    setSettings({ ...settings, selectedBluetoothPrinter: printer });
    setMessage({ type: 'success', text: `Selected: ${printer.name}` });
    
    // Auto-save the printer selection immediately
    try {
      console.log('💾 Auto-saving printer selection...');
      
      // First, try to get the most recent row by updated_at (more reliable)
      const { data: existingData, error: checkError } = await supabase
        .from('printer_settings')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log('🔍 Existing data check:', { existingData, error: checkError?.message });

      if (checkError && checkError.code !== 'PGRST116') {
        console.error('❌ Error checking existing settings:', checkError);
        throw checkError;
      }

      const updateData = {
        selected_bluetooth_printer: printer, // Store as JSONB directly
        connection_type: 'Bluetooth',
        updated_at: new Date().toISOString(),
      };

      let saveError;
      let savedRowId: number | null = null;
      
      if (existingData?.id) {
        console.log('🔄 Updating existing printer settings (ID:', existingData.id, ')');
        const { data: updateResult, error } = await supabase
          .from('printer_settings')
          .update(updateData)
          .eq('id', existingData.id)
          .select('id')
          .single();
        saveError = error;
        if (updateResult) {
          savedRowId = updateResult.id;
          console.log('✅ Updated row ID:', savedRowId);
        }
      } else {
        console.log('➕ Creating new printer settings row');
        const { data: insertedData, error } = await supabase
          .from('printer_settings')
          .insert({
            ...updateData,
            save_and_print_mode: true,
            paper_size: '58mm',
          })
          .select('id')
          .single();
        saveError = error;
        if (insertedData) {
          savedRowId = insertedData.id;
          console.log('✅ Inserted row with ID:', savedRowId);
        }
      }

      if (saveError) {
        console.error('❌ Error saving printer:', saveError);
        throw saveError;
      }

      console.log('✅ Printer saved successfully! Row ID:', savedRowId);
      
      // IMPORTANT: Connect to the device to add it to browser's paired devices list
      // This allows silent reconnection in POS screen without showing dialog
      if (navigator.bluetooth && printer.id) {
        try {
          console.log('🔌 Connecting to printer to add to paired devices list...');
          let device: BluetoothDevice;
          
          // First, try to use cached device from scanning (no dialog needed)
          if (scannedDeviceCache && scannedDeviceCache.id === printer.id) {
            console.log('✅ Using cached device from scanning (no dialog)');
            device = scannedDeviceCache;
          } else {
            // Try to find in previously paired devices (no dialog)
            try {
              const pairedDevices = await navigator.bluetooth.getDevices();
              const foundDevice = pairedDevices.find(d => d.id === printer.id || d.name === printer.name);
              if (foundDevice) {
                console.log('✅ Found printer in paired devices (no dialog)');
                device = foundDevice;
              } else {
                // Need to request device (will show dialog)
                console.log('📱 Requesting device via dialog...');
                try {
                  device = await navigator.bluetooth.requestDevice({
                    filters: [{ id: printer.id }],
                  });
                } catch (e) {
                  // If ID filter fails, try name-based filter
                  device = await navigator.bluetooth.requestDevice({
                    filters: [{ name: printer.name }],
                    optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb'],
                  });
                }
              }
            } catch (e) {
              // Fallback: request device (will show dialog)
              device = await navigator.bluetooth.requestDevice({
                filters: [{ name: printer.name }],
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb'],
              });
            }
          }
          
          // Connect to the device (this adds it to getDevices() list)
          if (device.gatt) {
            try {
              await device.gatt.connect();
              console.log('✅ Printer connected and added to paired devices list');
              // Disconnect immediately - we just needed to pair it
              if (device.gatt.connected) {
                device.gatt.disconnect();
              }
            } catch (connectError: any) {
              console.warn('⚠️ Could not connect to printer (may be off):', connectError.message);
              // Don't throw - printer might be off, but we still saved the settings
            }
          }
        } catch (pairError: any) {
          console.warn('⚠️ Could not pair printer (will need to select again on first print):', pairError.message);
          // Don't throw - this is not critical, just means user will need to select once more
        }
      }
      
      // Verify the save by querying the specific row we just saved
      if (savedRowId) {
        const { data: verifyData, error: verifyError } = await supabase
          .from('printer_settings')
          .select('selected_bluetooth_printer, updated_at')
          .eq('id', savedRowId)
          .single();
        
        if (verifyError) {
          console.warn('⚠️ Could not verify save:', verifyError);
        } else if (verifyData) {
          console.log('✅ Verified saved printer:', verifyData.selected_bluetooth_printer);
        } else {
          console.warn('⚠️ Verification query returned no data');
        }
      }
      
      setMessage({ type: 'success', text: `Printer "${printer.name}" selected and saved! You can now print without selecting again.` });
      
      // Wait a bit longer for database consistency, then reload settings
      await new Promise(resolve => setTimeout(resolve, 1000));
      console.log('🔄 Reloading settings after save...');
      await loadSettings();
    } catch (error: any) {
      console.error('❌ Error auto-saving printer:', error);
      setMessage({ type: 'error', text: `Failed to save printer: ${error.message || 'Unknown error'}. Please click "Save Settings" manually.` });
    }
    
    setTimeout(() => setMessage(null), 3000);
  };

  // ESC/POS commands helper - simplified for better compatibility
  const createEscPosCommands = (text: string): Uint8Array => {
    const encoder = new TextEncoder();
    const commands: number[] = [];
    
    // Initialize printer (reset to default state)
    commands.push(0x1B, 0x40); // ESC @ - Initialize printer
    
    const lines = text.trim().split('\n');
    let isFirstLine = true;
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (!trimmedLine) {
        commands.push(0x0A); // Empty line feed
        continue;
      }
      
      // For first non-empty line (shop name), center and enlarge
      if (isFirstLine && trimmedLine && !trimmedLine.includes('===')) {
        commands.push(0x1B, 0x61, 0x01); // ESC a 1 - Center align
        commands.push(0x1D, 0x21, 0x11); // GS ! 17 - Double width and height
        const lineBytes = encoder.encode(trimmedLine);
        commands.push(...Array.from(lineBytes));
        commands.push(0x0A); // Line feed
        commands.push(0x1B, 0x61, 0x00); // ESC a 0 - Left align
        commands.push(0x1D, 0x21, 0x00); // GS ! 0 - Normal size
        isFirstLine = false;
      } else if (trimmedLine.includes('===')) {
        // Separator line - center align
        commands.push(0x1B, 0x61, 0x01); // ESC a 1 - Center align
        const lineBytes = encoder.encode(trimmedLine);
        commands.push(...Array.from(lineBytes));
        commands.push(0x0A); // Line feed
        commands.push(0x1B, 0x61, 0x00); // ESC a 0 - Left align
        isFirstLine = false;
      } else {
        // Regular lines - left align, normal size
        commands.push(0x1B, 0x61, 0x00); // ESC a 0 - Left align
        commands.push(0x1D, 0x21, 0x00); // GS ! 0 - Normal size
        const lineBytes = encoder.encode(trimmedLine);
        commands.push(...Array.from(lineBytes));
        commands.push(0x0A); // Line feed
        isFirstLine = false;
      }
    }
    
    // Add extra line feeds before cutting
    commands.push(0x0A, 0x0A); // Two line feeds
    
    // Cut paper (partial cut)
    commands.push(0x1D, 0x56, 0x41, 0x03); // GS V A 3 - Partial cut
    
    return new Uint8Array(commands);
  };

  const testPrint = async () => {
    setIsPrinting(true);
    setMessage(null);

    try {
      // Create test receipt content
      const testContent = `
================================
${settings.shopName || 'Shop Name'}
${settings.shopAddress || 'Shop Address'}
Tel: ${settings.contactNumber || 'N/A'}
${settings.gst ? `GST: ${settings.gst}` : ''}
================================
TEST PRINT
Date: ${new Date().toLocaleString()}
================================
Item 1             100.00
Item 2             200.00
--------------------------------
Total              300.00
================================
${settings.footer || 'Thank you!'}
${settings.footerNote || ''}
================================
`;

      // For Bluetooth printing, send ESC/POS commands directly
      if (settings.connectionType === 'Bluetooth') {
        if (!settings.selectedBluetoothPrinter) {
          throw new Error('Please select a Bluetooth printer first. Click "Refresh Printers" to scan for available printers.');
        }

        if (!navigator.bluetooth) {
          throw new Error('Bluetooth not supported. Please use Chrome/Edge on Android or desktop.');
        }

        // Try to connect using the saved device ID or name
        let device: BluetoothDevice;
        
        try {
          // First try with the saved device ID if it's a valid format
          if (settings.selectedBluetoothPrinter.id && settings.selectedBluetoothPrinter.id.length > 0) {
            try {
              device = await navigator.bluetooth.requestDevice({
                filters: [{ id: settings.selectedBluetoothPrinter.id }],
              });
            } catch (e) {
              // If ID filter fails, try name-based filter
              device = await navigator.bluetooth.requestDevice({
                filters: [{ name: settings.selectedBluetoothPrinter.name }],
                optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb'],
              });
            }
          } else {
            // Use name-based filter
            device = await navigator.bluetooth.requestDevice({
              filters: [{ name: settings.selectedBluetoothPrinter.name }],
              optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb'],
            });
          }
        } catch (e) {
          // If both fail, try accepting all devices (user will select)
          device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', '0000ff00-0000-1000-8000-00805f9b34fb'],
          });
        }

        const server = await device.gatt?.connect();
        
        if (!server) {
          throw new Error('Could not connect to printer. Make sure printer is powered on.');
        }
        
        // Try to discover services automatically first
        const services = await server.getPrimaryServices();
        let service: BluetoothRemoteGATTService | null = null;
        let characteristic: BluetoothRemoteGATTCharacteristic | null = null;
        
        // Common thermal printer service UUIDs
        const knownServiceUUIDs = [
          '000018f0-0000-1000-8000-00805f9b34fb', // Generic printer service
          '0000ff00-0000-1000-8000-00805f9b34fb', // Common thermal printer
          '0000ff10-0000-1000-8000-00805f9b34fb', // Alternative thermal printer
        ];
        
        // Try known UUIDs first
        for (const uuid of knownServiceUUIDs) {
          try {
            service = await server.getPrimaryService(uuid);
            if (service) break;
          } catch (e) {
            continue;
          }
        }
        
        // If not found, try to find any service that might work
        if (!service && services.length > 0) {
          // Try first available service (often works for thermal printers)
          service = services[0];
        }
        
        if (!service) {
          throw new Error('Could not find printer service. Make sure printer is connected and supports Bluetooth.');
        }
        
        // Try to find write characteristic
        const characteristics = await service.getCharacteristics();
        const charUUIDs = [
          '00002af0-0000-1000-8000-00805f9b34fb',
          '0000ff02-0000-1000-8000-00805f9b34fb',
          '0000ff01-0000-1000-8000-00805f9b34fb',
        ];
        
        // Try known UUIDs first
        for (const uuid of charUUIDs) {
          try {
            characteristic = await service.getCharacteristic(uuid);
            if (characteristic && characteristic.properties.write) {
              break;
            }
          } catch (e) {
            continue;
          }
        }
        
        // If not found, try any characteristic with write property
        if (!characteristic || !characteristic.properties.write) {
          for (const char of characteristics) {
            if (char.properties.write) {
              characteristic = char;
              break;
            }
          }
        }
        
        if (!characteristic || !characteristic.properties.write) {
          throw new Error('Could not find writable characteristic. Printer may not support direct printing.');
        }

        // Create ESC/POS commands
        const escPosData = createEscPosCommands(testContent);
        
        // Send data in chunks (many printers have max packet size of 20 bytes)
        const chunkSize = 20;
        console.log(`Sending ${escPosData.length} bytes to printer in chunks of ${chunkSize}`);
        
        // Try writeValueWithoutResponse first (faster, no confirmation needed)
        // Fall back to writeValue if withoutResponse is not supported
        const useWithoutResponse = characteristic.properties.writeWithoutResponse;
        
        for (let i = 0; i < escPosData.length; i += chunkSize) {
          const chunk = escPosData.slice(i, i + chunkSize);
          try {
            if (useWithoutResponse) {
              await characteristic.writeValueWithoutResponse(chunk);
            } else {
              await characteristic.writeValue(chunk);
            }
            console.log(`Sent chunk ${Math.floor(i / chunkSize) + 1}/${Math.ceil(escPosData.length / chunkSize)}, bytes: ${chunk.length}`);
            
            // Small delay between chunks to avoid overwhelming the printer
            if (i + chunkSize < escPosData.length) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          } catch (e) {
            console.error(`Error sending chunk ${Math.floor(i / chunkSize) + 1}:`, e);
            throw e;
          }
        }
        
        console.log('All data sent successfully');
        
        // Wait a bit for printer to process, then disconnect
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (device.gatt?.connected) {
          device.gatt.disconnect();
          console.log('Disconnected from printer');
        }

        setMessage({ type: 'success', text: 'Test print sent directly to printer!' });
      } else if (settings.connectionType === 'Lan') {
        // For LAN printers, try to send ESC/POS via HTTP POST
        // Note: This requires the printer to have a web interface or IPP support
        setMessage({ type: 'error', text: 'LAN printing requires printer IP configuration. Please configure printer IP address in settings.' });
      } else {
        // For USB, we can't directly print from browser without extension
        setMessage({ type: 'error', text: 'USB printing is not supported directly from browser. Please use Bluetooth connection or configure a network printer for direct printing.' });
      }
    } catch (error: any) {
      console.error('Print error:', error);
      setMessage({ type: 'error', text: `Print failed: ${error.message || 'Unknown error'}` });
    } finally {
      setIsPrinting(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleInputChange = (field: keyof PrinterSettings, value: any) => {
    setSettings({ ...settings, [field]: value });
  };

  const handlePrintOptionChange = (option: keyof PrinterSettings['printOptions'], value: boolean) => {
    setSettings({
      ...settings,
      printOptions: { ...settings.printOptions, [option]: value },
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8" data-printer-settings>
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        {onBack && (
          <button
            onClick={onBack}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-6 h-6" />
          </button>
        )}
        <div>
          <h1 className="text-3xl font-bold text-gray-800">Printer</h1>
          <p className="text-sm text-gray-500 mt-1">Printer v12.9.1</p>
        </div>
        <div className="ml-auto text-sm text-gray-600 bg-yellow-50 px-3 py-1 rounded">
          Note: Settings will work only, when internet is connected
        </div>
      </div>

      {/* Message */}
      {message && (
        <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message.text}
        </div>
      )}

      {/* Save Button Toggle */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-lg font-semibold text-gray-700">Save button</label>
            <p className="text-sm text-gray-500 mt-1">If enabled, allows to save bill without print.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.saveButton}
              onChange={(e) => handleInputChange('saveButton', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>

      {/* Save & Print Mode Toggle */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="flex items-center justify-between">
          <div>
            <label className="text-lg font-semibold text-gray-700">Save & Print Mode</label>
            <p className="text-sm text-gray-500 mt-1">Save & Print your billing receipt every time.</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={settings.saveAndPrintMode}
              onChange={(e) => handleInputChange('saveAndPrintMode', e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
          </label>
        </div>
      </div>

      {/* Paper Size */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-2">Paper Size</h2>
        <p className="text-sm text-gray-500 mb-4">Select thermal printer paper size.</p>
        <p className="text-sm text-gray-600 mb-4">Now 58mm (2inch) 80mm (3inch)</p>

        <div className="space-y-4">
          {/* USB */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <UsbIcon className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">USB</span>
            </div>
            <div className="flex gap-4 ml-7">
              {['58mm', '72mm', '80mm'].map((size) => (
                <label key={`usb-${size}`} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="usb-paper-size"
                    value={size}
                    checked={settings.connectionType === 'USB' && settings.paperSize === size}
                    onChange={() => {
                      handleInputChange('connectionType', 'USB');
                      handleInputChange('paperSize', size);
                    }}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm">{size}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Bluetooth */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <BluetoothIcon className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Bluetooth</span>
            </div>
            <div className="flex gap-4 ml-7">
              {['58mm', '72mm', '80mm'].map((size) => (
                <label key={`bt-${size}`} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="bluetooth-paper-size"
                    value={size}
                    checked={settings.connectionType === 'Bluetooth' && settings.paperSize === size}
                    onChange={() => {
                      handleInputChange('connectionType', 'Bluetooth');
                      handleInputChange('paperSize', size);
                    }}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm">{size}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Lan/Wireless */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <WifiIcon className="w-5 h-5 text-gray-600" />
              <span className="font-medium text-gray-700">Lan/wireless</span>
            </div>
            <div className="flex gap-4 ml-7">
              {['58mm', '72mm', '80mm'].map((size) => (
                <label key={`lan-${size}`} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="lan-paper-size"
                    value={size}
                    checked={settings.connectionType === 'Lan' && settings.paperSize === size}
                    onChange={() => {
                      handleInputChange('connectionType', 'Lan');
                      handleInputChange('paperSize', size);
                    }}
                    className="w-4 h-4 text-purple-600"
                  />
                  <span className="text-sm">{size}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Bluetooth Printers List */}
      {settings.connectionType === 'Bluetooth' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-700">Bluetooth Printers List</h2>
            <button
              onClick={scanBluetoothPrinters}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <RefreshIcon className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
              Refresh Printers
            </button>
          </div>

          {/* Show saved printer if exists, even if not in scanned list */}
          {settings.selectedBluetoothPrinter && !bluetoothPrinters.find(p => p.id === settings.selectedBluetoothPrinter?.id) && (
            <div className="flex items-center justify-between p-4 border-2 border-green-500 rounded-lg mb-2 bg-green-50">
              <div className="flex items-center gap-3">
                <BluetoothIcon className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-700">{settings.selectedBluetoothPrinter.name}</p>
                  <p className="text-sm text-gray-500">{settings.selectedBluetoothPrinter.address}</p>
                  <p className="text-xs text-green-600 mt-1">✓ Saved Printer</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => testPrint()}
                  disabled={isPrinting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Test Print
                </button>
                <button
                  className="px-4 py-2 bg-green-600 text-white rounded-lg"
                >
                  Selected
                </button>
              </div>
            </div>
          )}

          {bluetoothPrinters.length === 0 && !isScanning && !settings.selectedBluetoothPrinter && (
            <p className="text-gray-500 text-sm">No printers found. Click "Refresh Printers" to scan.</p>
          )}

          {bluetoothPrinters.map((printer) => (
            <div key={printer.id} className="flex items-center justify-between p-4 border rounded-lg mb-2">
              <div className="flex items-center gap-3">
                <BluetoothIcon className="w-5 h-5 text-gray-600" />
                <div>
                  <p className="font-medium text-gray-700">{printer.name}</p>
                  <p className="text-sm text-gray-500">{printer.address}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => testPrint()}
                  disabled={isPrinting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  Test Print
                </button>
                <button
                  onClick={() => selectPrinter(printer)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    settings.selectedBluetoothPrinter?.id === printer.id
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  {settings.selectedBluetoothPrinter?.id === printer.id ? 'Selected' : 'Select'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Print Information */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Add print Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop name</label>
            <input
              type="text"
              value={settings.shopName}
              onChange={(e) => handleInputChange('shopName', e.target.value)}
              className="w-full p-2 border rounded-md bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Contact Number</label>
            <input
              type="text"
              value={settings.contactNumber}
              onChange={(e) => handleInputChange('contactNumber', e.target.value)}
              className="w-full p-2 border rounded-md bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">FSSAI No.</label>
            <input
              type="text"
              value={settings.fssaiNo}
              onChange={(e) => handleInputChange('fssaiNo', e.target.value)}
              className="w-full p-2 border rounded-md bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GST</label>
            <input
              type="text"
              value={settings.gst}
              onChange={(e) => handleInputChange('gst', e.target.value)}
              className="w-full p-2 border rounded-md bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Footer</label>
            <input
              type="text"
              value={settings.footer}
              onChange={(e) => handleInputChange('footer', e.target.value)}
              className="w-full p-2 border rounded-md bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Shop address</label>
            <input
              type="text"
              value={settings.shopAddress}
              onChange={(e) => handleInputChange('shopAddress', e.target.value)}
              className="w-full p-2 border rounded-md bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bank Details</label>
            <input
              type="text"
              value={settings.bankDetails}
              onChange={(e) => handleInputChange('bankDetails', e.target.value)}
              className="w-full p-2 border rounded-md bg-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Footer note</label>
            <input
              type="text"
              value={settings.footerNote}
              onChange={(e) => handleInputChange('footerNote', e.target.value)}
              className="w-full p-2 border rounded-md bg-white"
            />
          </div>
        </div>
      </div>

      {/* Print Options */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Print Options</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: 'merchantCopy', label: 'Merchant copy' },
            { key: 'productWiseToken', label: 'Product wise token' },
            { key: 'showPaidText', label: 'Show paid text' },
            { key: 'showGstAbstract', label: 'Show GST abstract section' },
            { key: 'showMrpColumn', label: 'Show MRP column' },
            { key: 'disableEstimateLabel', label: 'Disable Estimate label' },
            { key: 'showFullPriceIncGst', label: 'Show Full Price (Inc gst)' },
            { key: 'showTaxInvoiceLabel', label: 'Show Tax invoice label in receipt' },
            { key: 'dontShowBalanceInCreditBill', label: "Don't show balance in credit bil" },
            { key: 'showDescriptionInKot', label: 'Show description in KOT' },
          ].map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.printOptions[key as keyof PrinterSettings['printOptions']]}
                onChange={(e) => handlePrintOptionChange(key as keyof PrinterSettings['printOptions'], e.target.checked)}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm text-gray-700">{label}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Print Logo & QR */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-xl font-semibold text-gray-700 mb-4">Print Logo & QR Information</h2>
        <div className="space-y-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.printLogo}
              onChange={(e) => handleInputChange('printLogo', e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <span className="text-sm text-gray-700">Print Logo</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={settings.printQr}
              onChange={(e) => handleInputChange('printQr', e.target.checked)}
              className="w-4 h-4 text-purple-600 rounded"
            />
            <span className="text-sm text-gray-700">Print QR</span>
          </label>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end gap-4">
        <button
          onClick={saveSettings}
          disabled={isSaving}
          className="px-6 py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
};

export default PrinterSettingsPage;

