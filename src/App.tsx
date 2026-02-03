import { useState, useMemo } from 'react'
import { FileUpload } from './components/FileUpload'
import { ColumnMapper } from './components/ColumnMapper'
import { InventoryGrid } from './components/InventoryGrid'
import { Toolbar } from './components/Toolbar'
import { OutOfOrderSummary } from './components/OutOfOrderSummary'
import { PlacementFinder } from './components/PlacementFinder'
import { useInventory } from './hooks/useInventory'
import { ParsedCSV, ColumnMapping } from './types/inventory'
import { analyzeInventory } from './lib/sequenceAnalyzer'

function App() {
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null)
  const [showMapper, setShowMapper] = useState(false)
  const { items, addItems, addItem, updateItem, deleteItems, clearAll } = useInventory()

  // Analyze inventory for out-of-order summary
  const analysis = useMemo(() => {
    return analyzeInventory(items)
  }, [items])

  const handleFileUploaded = (csv: ParsedCSV) => {
    setParsedCSV(csv)
    setShowMapper(true)
  }

  const handleMappingConfirmed = (mapping: ColumnMapping) => {
    if (!parsedCSV) return

    const newItems = parsedCSV.data.map(row => ({
      location: String(row[mapping.location] || ''),
      fbpn: String(row[mapping.fbpn] || ''),
      itemType: String(row[mapping.itemType] || ''),
    }))

    addItems(newItems)
    setParsedCSV(null)
    setShowMapper(false)
  }

  const handleCancelMapping = () => {
    setParsedCSV(null)
    setShowMapper(false)
  }

  const handleScrollToItem = (id: string) => {
    // Scroll to the item in the grid
    const element = document.querySelector(`[data-item-id="${id}"]`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold text-gray-900">Inventory Tracker</h1>
          <p className="text-sm text-gray-500 mt-1">
            Organized by location with FBPN sequence detection
          </p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {showMapper && parsedCSV ? (
          <ColumnMapper
            headers={parsedCSV.headers}
            sampleData={parsedCSV.data.slice(0, 3)}
            onConfirm={handleMappingConfirmed}
            onCancel={handleCancelMapping}
          />
        ) : (
          <>
            <div className="mb-6">
              <FileUpload onFileUploaded={handleFileUploaded} />
            </div>

            {/* Placement Finder - find where new parts should go */}
            <PlacementFinder
              items={items}
              onAddItem={addItem}
            />

            <Toolbar
              onAddRow={() => addItem({ location: '', fbpn: '', itemType: '' })}
              onDeleteSelected={deleteItems}
              onClearAll={clearAll}
              items={items}
            />

            {/* Out of Order Summary - shows at top when there are issues */}
            <OutOfOrderSummary
              outOfOrderItems={analysis.enhancedOutOfOrderItems}
              learnedOrder={analysis.learnedOrder}
              onScrollToItem={handleScrollToItem}
            />

            <div className="bg-white rounded-lg shadow">
              <InventoryGrid
                items={items}
                onUpdateItem={updateItem}
                onDeleteItems={deleteItems}
              />
            </div>
          </>
        )}
      </main>
    </div>
  )
}

export default App
