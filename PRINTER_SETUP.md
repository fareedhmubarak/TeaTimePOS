# 58mm Thermal Printer Setup Guide

## Printer Specifications
- **Model**: 58mm Portable Thermal Printer
- **Interface**: USB + Bluetooth 4.0
- **Power**: 5V == 1A
- **Paper Width**: 58mm

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

## Connection Methods

### Option 1: USB Connection (Recommended)
1. Connect the printer to your computer/device via USB cable
2. Ensure the printer is powered on (5V/1A power supply)
3. Your operating system should detect the printer automatically
4. When printing from the app:
   - Click "Print" button in the Order Placed modal or Invoice view
   - Select your 58mm thermal printer from the print dialog
   - Choose "Save as PDF" if you need to test first, or print directly

### Option 2: Bluetooth Connection
1. Enable Bluetooth on your device
2. Pair the printer with your device:
   - Go to Bluetooth settings
   - Look for your thermal printer device
   - Pair it (default PIN is usually `0000` or `1234`)
3. Ensure the printer is set as the default printer for thermal receipts
4. Print from the app as described above

## Browser Print Setup

### Chrome/Edge
1. Open Chrome Settings → Printers
2. Ensure your thermal printer is listed
3. For USB: It should appear automatically
4. For Bluetooth: You may need to add it manually through Windows Settings → Devices → Printers

### Print Dialog Settings
When the print dialog appears:
1. **Printer**: Select your 58mm thermal printer
2. **Pages**: All
3. **Layout**: Portrait
4. **Paper Size**: Custom (58mm width) or use the browser's thermal printer preset
5. **Margins**: None/Minimal (already handled in CSS)
6. **Scale**: 100%
7. **More Settings**: 
   - Uncheck "Headers and footers"
   - Background graphics: Optional (thermal printers don't need this)

## Testing the Print Layout

### Test Print
1. Place an order or view an existing invoice
2. Click "Print" button
3. In the print preview, verify:
   - Content fits within 58mm width
   - All text is readable
   - Layout is properly aligned
4. Print a test copy

### Adjustments
If the print doesn't align correctly:
- Check printer settings in Windows/OS Settings
- Ensure printer driver is properly installed
- Verify paper is loaded correctly (58mm thermal paper)

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
For best results, ensure you have the correct driver installed:
- Check printer manufacturer's website for driver downloads
- Generic ESC/POS drivers work for most thermal printers
- Windows should auto-detect USB printers

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
- **Paper Width**: 58mm
- **Print Width**: 58mm (with 3mm side margins = 52mm content width)
- **Font Optimization**: Optimized for thermal printer readability
- **Connection**: USB (preferred) or Bluetooth 4.0
- **Power**: 5V / 1A

For issues or questions, refer to your printer's manual or contact support.

