import React, { useState } from 'react';
import { BluetoothPrinter } from '../types.ts';
import { BluetoothIcon, RefreshIcon, XIcon } from './Icons.tsx';
import { supabase } from '../supabaseClient.ts';

interface PrinterSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (printer: BluetoothPrinter) => void;
}

const PrinterSelectionModal: React.FC<PrinterSelectionModalProps> = ({ 
  isOpen, 
  onClose, 
  onSelect 
}) => {
  const [bluetoothPrinters, setBluetoothPrinters] = useState<BluetoothPrinter[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const scanBluetoothPrinters = async () => {
    if (!navigator.bluetooth) {
      setMessage({ type: 'error', text: 'Bluetooth is not supported on this device. Please use Chrome/Edge on Android or desktop.' });
      return;
    }

    setIsScanning(true);
    setBluetoothPrinters([]);
    setMessage(null);

    try {
      const device = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: [
          '000018f0-0000-1000-8000-00805f9b34fb',
          '0000ff00-0000-1000-8000-00805f9b34fb',
          '0000ff10-0000-1000-8000-00805f9b34fb',
        ],
      });

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

  const handleSelectPrinter = async (printer: BluetoothPrinter) => {
    try {
      // Save printer to settings - ensure we update existing or create new
      const { data: existingData } = await supabase
        .from('printer_settings')
        .select('id')
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const printerData = {
        connection_type: 'Bluetooth',
        selected_bluetooth_printer: printer, // Store as JSONB directly (Supabase handles conversion)
        paper_size: '58mm',
        save_and_print_mode: true,
        updated_at: new Date().toISOString(),
      };

      if (existingData?.id) {
        const { error } = await supabase
          .from('printer_settings')
          .update(printerData)
          .eq('id', existingData.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('printer_settings')
          .insert(printerData);
        
        if (error) throw error;
      }

      setMessage({ type: 'success', text: `Printer "${printer.name}" selected and saved!` });
      setTimeout(() => {
        onSelect(printer);
        onClose();
      }, 500);
    } catch (error: any) {
      console.error('Error saving printer:', error);
      setMessage({ type: 'error', text: `Failed to save printer: ${error.message}` });
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 z-[10000] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-gray-800">Select Printer</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
            aria-label="Close"
            type="button"
          >
            <XIcon className="h-6 w-6" />
          </button>
        </div>
        
        <p className="text-gray-600 mb-4">No printer is currently selected. Please select a Bluetooth printer to continue.</p>

        {message && (
          <div className={`p-3 rounded-lg mb-4 ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message.text}
          </div>
        )}

        <div className="mb-4">
          <button
            onClick={scanBluetoothPrinters}
            disabled={isScanning}
            className="flex items-center gap-2 w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <RefreshIcon className={`w-5 h-5 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning...' : 'Scan for Bluetooth Printers'}
          </button>
        </div>

        {bluetoothPrinters.length === 0 && !isScanning && (
          <p className="text-gray-500 text-sm text-center mb-4">No printers found. Click "Scan for Bluetooth Printers" to search.</p>
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
            <button
              onClick={() => handleSelectPrinter(printer)}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              Select
            </button>
          </div>
        ))}

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PrinterSelectionModal;

