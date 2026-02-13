import { useState, useEffect, useRef, useCallback } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { InventoryItem, NewInventoryItem } from '../types/inventory'
import { suggestPlacement, PlacementSuggestion } from '../lib/placementSuggester'

interface BarcodeScannerProps {
  items: InventoryItem[]
  onAddItem?: (item: NewInventoryItem) => Promise<string> | void
  onUpdateItem?: (id: string, updates: Partial<InventoryItem>) => void
  onClose?: () => void
}

type ScanMode = 'lookup' | 'update-location'

interface ScanResult {
  partNumber: string
  existingItem: InventoryItem | null
  suggestion: PlacementSuggestion | null
}

export function BarcodeScanner({ items, onAddItem, onUpdateItem, onClose }: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false)
  const [scanMode, setScanMode] = useState<ScanMode>('lookup')
  const [scanResult, setScanResult] = useState<ScanResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [manualEntry, setManualEntry] = useState('')
  const [newLocation, setNewLocation] = useState('')
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Start scanning
  const startScanning = useCallback(async () => {
    if (!containerRef.current) return
    
    try {
      setError(null)
      
      // Create scanner instance
      const scanner = new Html5Qrcode('barcode-scanner-region', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      })
      
      scannerRef.current = scanner
      
      await scanner.start(
        { facingMode: 'environment' }, // Use back camera
        {
          fps: 10,
          qrbox: { width: 250, height: 150 },
        },
        (decodedText) => {
          // Successfully scanned
          handleBarcodeScan(decodedText)
          stopScanning()
        },
        () => {
          // QR code not found - ignore, keep scanning
        }
      )
      
      setIsScanning(true)
    } catch (err) {
      console.error('Error starting scanner:', err)
      setError('Could not access camera. Please check permissions or use manual entry.')
    }
  }, [])

  // Stop scanning
  const stopScanning = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop()
        scannerRef.current.clear()
      } catch (err) {
        console.error('Error stopping scanner:', err)
      }
      scannerRef.current = null
    }
    setIsScanning(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {})
      }
    }
  }, [])

  // Handle barcode scan result
  const handleBarcodeScan = (barcode: string) => {
    // Clean up the barcode - sometimes barcodes have extra characters
    const cleanedPartNumber = barcode.trim()
    
    // Find if item exists in inventory
    const existingItem = items.find(item => 
      item.partNumber.toLowerCase() === cleanedPartNumber.toLowerCase()
    )
    
    // Get placement suggestion
    const suggestion = suggestPlacement(cleanedPartNumber, items)
    
    setScanResult({
      partNumber: cleanedPartNumber,
      existingItem,
      suggestion,
    })
    
    setSuccessMessage(null)
  }

  // Handle manual part number entry
  const handleManualSubmit = () => {
    if (manualEntry.trim().length >= 3) {
      handleBarcodeScan(manualEntry.trim())
      setManualEntry('')
    }
  }

  // Add item to inventory at suggested location
  const handleAddToInventory = () => {
    if (!scanResult || !scanResult.suggestion?.primarySuggestion || !onAddItem) return
    
    onAddItem({
      location: scanResult.suggestion.primarySuggestion.location,
      partNumber: scanResult.partNumber,
      itemType: '',
    })
    
    setSuccessMessage(`Added ${scanResult.partNumber} at ${scanResult.suggestion.primarySuggestion.location}`)
    setScanResult(null)
  }

  // Update item location
  const handleUpdateLocation = () => {
    if (!scanResult?.existingItem || !newLocation.trim() || !onUpdateItem) return
    
    onUpdateItem(scanResult.existingItem.id, { location: newLocation.trim() })
    setSuccessMessage(`Updated ${scanResult.partNumber} location to ${newLocation.trim()}`)
    setScanResult(null)
    setNewLocation('')
  }

  // Mark as correctly placed (no action needed)
  const handleMarkCorrect = () => {
    if (!scanResult?.existingItem) return
    setSuccessMessage(`${scanResult.partNumber} is correctly placed at ${scanResult.existingItem.location}`)
    setScanResult(null)
  }

  // Clear and scan again
  const handleScanAgain = () => {
    setScanResult(null)
    setSuccessMessage(null)
    setError(null)
    startScanning()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Barcode Scanner
          </h2>
          <button
            onClick={() => { stopScanning(); onClose?.() }}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {/* Mode Selection */}
          <div className="mb-6">
            <div className="flex rounded-lg bg-gray-100 p-1">
              <button
                onClick={() => setScanMode('lookup')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  scanMode === 'lookup'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Find Item
              </button>
              <button
                onClick={() => setScanMode('update-location')}
                className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                  scanMode === 'update-location'
                    ? 'bg-white text-gray-900 shadow'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Update Location
              </button>
            </div>
            <p className="mt-2 text-sm text-gray-500 text-center">
              {scanMode === 'lookup' 
                ? 'Scan to find where an item is or should be'
                : 'Scan item then enter its new location'}
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{successMessage}</span>
              </div>
              <button
                onClick={handleScanAgain}
                className="mt-3 w-full py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
              >
                Scan Another
              </button>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            </div>
          )}

          {/* Scanner UI */}
          {!scanResult && !successMessage && (
            <>
              {/* Camera Scanner Area */}
              <div className="mb-6">
                <div 
                  id="barcode-scanner-region" 
                  ref={containerRef}
                  className={`w-full rounded-lg overflow-hidden ${isScanning ? 'bg-black' : 'bg-gray-100'}`}
                  style={{ minHeight: '250px' }}
                >
                  {!isScanning && (
                    <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                      <svg className="w-16 h-16 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <p className="text-sm">Camera preview will appear here</p>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 flex gap-3">
                  {!isScanning ? (
                    <button
                      onClick={startScanning}
                      className="flex-1 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Start Camera
                    </button>
                  ) : (
                    <button
                      onClick={stopScanning}
                      className="flex-1 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium flex items-center justify-center gap-2"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 10a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z" />
                      </svg>
                      Stop Camera
                    </button>
                  )}
                </div>
              </div>

              {/* Manual Entry */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Or enter part number manually</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={manualEntry}
                    onChange={(e) => setManualEntry(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
                    placeholder="Enter part number (e.g., 24-000350)"
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  />
                  <button
                    onClick={handleManualSubmit}
                    disabled={manualEntry.trim().length < 3}
                    className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Look Up
                  </button>
                </div>
              </div>
            </>
          )}

          {/* Scan Result */}
          {scanResult && !successMessage && (
            <div className="space-y-4">
              {/* Scanned part number */}
              <div className="p-4 bg-gray-100 rounded-lg">
                <span className="text-sm text-gray-600">Scanned Part Number:</span>
                <p className="text-2xl font-mono font-bold text-gray-900">{scanResult.partNumber}</p>
              </div>

              {/* Item Found in Inventory */}
              {scanResult.existingItem && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center gap-2 text-blue-800 mb-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Found in Inventory</span>
                  </div>
                  <div className="mb-3">
                    <span className="text-sm text-gray-600">Current Location:</span>
                    <p className="text-xl font-mono font-bold text-blue-900">{scanResult.existingItem.location}</p>
                    {scanResult.existingItem.itemType && (
                      <p className="text-sm text-gray-600 mt-1">{scanResult.existingItem.itemType}</p>
                    )}
                  </div>

                  {/* Suggestion if item might be misplaced */}
                  {scanResult.suggestion?.primarySuggestion && 
                   scanResult.suggestion.primarySuggestion.location !== scanResult.existingItem.location && (
                    <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <span className="text-sm text-amber-700">
                        Suggested location based on patterns:
                      </span>
                      <p className="font-mono font-medium text-amber-900">
                        {scanResult.suggestion.primarySuggestion.location}
                      </p>
                    </div>
                  )}

                  {/* Actions for existing item */}
                  {scanMode === 'update-location' ? (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="text-sm text-gray-600 block mb-1">New Location:</label>
                        <input
                          type="text"
                          value={newLocation}
                          onChange={(e) => setNewLocation(e.target.value)}
                          placeholder="Enter new location (e.g., PRN5-1H15-J-02-A)"
                          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleUpdateLocation}
                          disabled={!newLocation.trim()}
                          className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                        >
                          Update Location
                        </button>
                        <button
                          onClick={handleMarkCorrect}
                          className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                        >
                          Mark Correct
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={handleScanAgain}
                      className="mt-4 w-full py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium"
                    >
                      Scan Another
                    </button>
                  )}
                </div>
              )}

              {/* Item NOT in Inventory */}
              {!scanResult.existingItem && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center gap-2 text-amber-800 mb-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span className="font-medium">Not Found in Inventory</span>
                  </div>

                  {/* Show suggested placement */}
                  {scanResult.suggestion?.primarySuggestion ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-white rounded-lg border border-amber-200">
                        <span className="text-sm text-gray-600">Suggested Placement:</span>
                        <p className="text-xl font-mono font-bold text-green-900">
                          {scanResult.suggestion.primarySuggestion.location}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {scanResult.suggestion.primarySuggestion.confidence}% confidence
                        </p>
                      </div>

                      {/* Reasoning */}
                      {scanResult.suggestion.primarySuggestion.reasoning.length > 0 && (
                        <div className="text-sm text-gray-600">
                          <p className="font-medium mb-1">Why here:</p>
                          <ul className="list-disc list-inside space-y-1">
                            {scanResult.suggestion.primarySuggestion.reasoning.slice(0, 2).map((reason, i) => (
                              <li key={i}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <button
                        onClick={handleAddToInventory}
                        className="w-full py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        Add to Inventory at This Location
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-amber-700">
                      Not enough inventory data to suggest a placement.
                    </p>
                  )}
                </div>
              )}

              {/* Scan Again Button */}
              {!scanResult.existingItem && (
                <button
                  onClick={handleScanAgain}
                  className="w-full py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Scan Another
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
