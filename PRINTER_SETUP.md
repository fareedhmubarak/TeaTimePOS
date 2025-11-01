# Shreyans Mobile Printer Setup Guide

## Printer Specifications
- **Model**: Shreyans Mobile Printer (58mm Thermal Printer)
- **Interface**: USB + Bluetooth 4.0
- **Power**: 5V == 1A
- **Paper Width**: 58mm
- **Protocol**: ESC/POS (Standard thermal printer protocol)

## Print Settings Configured
The application has been configured with the following print settings optimized for 58mm thermal printers:

- **Paper Size**: 58mm width, auto height
- **Margins**: 2mm top/bottom, 3mm left/right
- **Font Sizes**:
  - Header: 14px
  - Subheader: 9px
  - Invoice Info: 8px
  - Item Names: 9px
  - Quantity: 8px
  - Total: 14px
  - Footer: 8px

## Direct Printing (No Print Dialog) - RECOMMENDED

The app now supports **direct printing** to your Shreyans mobile printer without showing a print dialog. This is the fastest and most seamless printing experience.

### How It Works
1. The app uses **Web Serial API** to communicate directly with your printer
2. ESC/POS commands are sent directly to the printer
3. **No print dialog appears** - printing happens instantly
4. Works with USB or Bluetooth Serial connection

### Requirements
- **Browser**: Chrome, Edge, or Opera (Web Serial API support)
- **Connection**: USB or Bluetooth Serial connection to printer
- **HTTPS**: The app must be served over HTTPS (or localhost for development)

### Setup Instructions

#### USB Connection (Recommended for Direct Printing)
1. **Connect Printer via USB**
   - Plug your Shreyans mobile printer into your computer via USB cable
   - Ensure the printer is powered on (5V/1A power supply)

2. **First Time Printing**
   - Click "Print" button in the app (from Order Placed modal or Invoice view)
   - Browser will show a device selection dialog
   - **Select your Shreyans mobile printer** from the list
   - Click "Connect"
   - The receipt will print directly without any print dialog!

3. **Subsequent Prints**
   - Simply click "Print" button
   - Printer selection dialog may appear (or browser may remember your choice)
   - Receipt prints immediately

#### Bluetooth Connection (For Direct Printing)
1. **Pair Printer via Bluetooth**
   - Enable Bluetooth on your device
   - Put printer in pairing mode (refer to printer manual)
   - Pair the printer (default PIN usually `0000` or `1234`)
   - Note the Bluetooth COM port name (Windows) or device path (Mac/Linux)

2. **Printing via Bluetooth**
   - Click "Print" button
   - In the device selection dialog, look for your printer's Bluetooth serial port
   - Select it and click "Connect"
   - Receipt prints directly

### Browser Printing (Fallback Method)
If Web Serial API is not available or you prefer browser printing:
- The app will automatically fall back to browser print dialog
- Select your printer from the browser's print dialog
- Configure print settings as needed (see Browser Print Setup below)

## Browser Print Setup (Fallback Method)

### Chrome/Edge Silent Printing (Advanced)
If you want to configure Chrome for automatic silent printing (no dialog):

1. **Create Chrome Shortcut**
   - Right-click Chrome shortcut → Properties
   - Append to "Target": ` --kiosk --kiosk-printing`
   - Example: `"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk --kiosk-printing`
   - This enables automatic printing without dialog

2. **Print Dialog Settings** (if dialog appears)
   - **Printer**: Select your Shreyans mobile printer
   - **Pages**: All
   - **Layout**: Portrait
   - **Paper Size**: Custom (58mm width) or use the browser's thermal printer preset
   - **Margins**: None/Minimal (already handled in CSS)
   - **Scale**: 100%
   - **More Settings**: 
     - Uncheck "Headers and footers"
     - Background graphics: Optional (thermal printers don't need this)

### Firefox Silent Printing
1. Type `about:config` in address bar
2. Search for `print.always_print_silent`
3. Set to `true`
4. This enables silent printing without dialog

## Testing Direct Printing

### Test Print with Direct Printing
1. **Place an order** or view an existing invoice
2. **Click "Print" button**
3. **Select your Shreyans printer** from the device selection dialog (first time only)
4. **Receipt prints immediately** - no print dialog!
5. Verify:
   - Content fits within 58mm width
   - All text is readable
   - Layout is properly aligned
   - Paper is cut correctly at the end

### Troubleshooting Direct Printing

#### "Web Serial API is not supported" Error
- **Solution**: Use Chrome, Edge, or Opera browser
- Firefox and Safari don't support Web Serial API
- Use browser printing fallback instead

#### Printer Not Showing in Device Selection
- **USB**: Check cable connection, try different USB port
- **Windows**: Check Device Manager for COM port
- **Mac**: Check System Information → USB or Bluetooth
- Ensure printer is powered on and ready

#### Print Commands Not Working
- Verify printer supports ESC/POS protocol (Shreyans printers do)
- Try different baud rate (currently set to 9600)
- Check printer manual for correct settings
- Restart printer and try again

#### Text Alignment Issues
- Paper may not be loaded correctly - reload paper
- Check if paper is 58mm width
- Verify printer's internal settings (DPI, character width)
- Paper feed may need adjustment

### Adjustments
If the print doesn't align correctly:
- Check printer settings in Windows/OS Settings
- Ensure printer driver is properly installed (if using browser printing)
- Verify paper is loaded correctly (58mm thermal paper)
- For direct printing, ESC/POS commands are optimized - alignment should be automatic

## Troubleshooting

### Printer Not Detected
- **USB**: Check cable connection, try different USB port
- **Bluetooth**: Ensure printer is powered on and in pairing mode
- Restart your device and printer

### Print Not Aligned
- Check printer driver settings
- Verify paper width is exactly 58mm
- Check if printer has alignment settings in its driver

### Text Too Small/Large
- The CSS is optimized for 58mm printers
- If adjustments needed, contact support or modify print styles in:
  - `App.tsx` (OrderPlacedModal print)
  - `components/OrderPanel.tsx` (Invoice view print)

### Print Preview Looks Different
- The print preview may show slightly different layout
- Actual print should match the optimized 58mm format
- Test print to verify actual output

## Printer Driver

### For Direct Printing (Web Serial API)
- **No driver needed!** Web Serial API communicates directly with the printer
- This is one of the advantages of direct printing

### For Browser Printing (Fallback)
- Check Shreyans printer website for driver downloads
- Generic ESC/POS drivers work for most thermal printers
- Windows should auto-detect USB printers
- For Bluetooth, ensure printer is paired and visible as a serial device

## Paper Loading
1. Ensure you're using 58mm thermal paper
2. Load paper correctly (usually roll-fed)
3. Cut any excess paper before first print
4. Adjust paper alignment if needed through printer settings

## Network Sharing (Optional)
If using multiple devices:
1. Share the printer on your main device
2. Connect other devices to the shared printer
3. Ensure all devices use the same print settings

## Power Requirements
- **5V / 1A**: Ensure adequate power supply
- USB connection may provide power if using USB-C or powered USB hub
- For standalone use, ensure proper 5V adapter is connected

---

## Quick Reference

### Direct Printing (Recommended)
- **Method**: Web Serial API (direct ESC/POS commands)
- **No Print Dialog**: Prints directly to printer
- **Browser**: Chrome, Edge, or Opera required
- **Connection**: USB (preferred) or Bluetooth Serial
- **Protocol**: ESC/POS
- **Baud Rate**: 9600 (standard for thermal printers)

### Print Specifications
- **Paper Width**: 58mm
- **Print Width**: 58mm (optimized for thermal printer)
- **Font Optimization**: ESC/POS commands optimized for Shreyans printer
- **Connection**: USB (preferred) or Bluetooth 4.0
- **Power**: 5V / 1A
- **Auto Cut**: Enabled (paper cuts automatically after printing)

### First Time Setup Checklist
- [ ] Connect printer via USB (or pair via Bluetooth)
- [ ] Power on printer
- [ ] Load 58mm thermal paper correctly
- [ ] Open app in Chrome/Edge/Opera browser
- [ ] Click "Print" button
- [ ] Select Shreyans printer from device list
- [ ] Verify receipt prints correctly

## Important Notes

1. **Direct Printing is Preferred**: No print dialog = faster workflow
2. **HTTPS Required**: Web Serial API requires HTTPS (or localhost)
3. **Browser Support**: Chrome/Edge/Opera only for direct printing
4. **Fallback Available**: If direct printing fails, browser print dialog will appear
5. **ESC/POS Protocol**: Shreyans mobile printers use standard ESC/POS commands - fully supported

For issues or questions, refer to your Shreyans printer manual or contact support.

