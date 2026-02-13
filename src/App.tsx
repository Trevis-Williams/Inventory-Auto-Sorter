import { useState, useMemo } from 'react'
import { ColumnMapper } from './components/ColumnMapper'
import { InventoryGrid } from './components/InventoryGrid'
import { TabNavigation, TabId } from './components/TabNavigation'
import { Dashboard } from './components/Dashboard'
import { ReorganizationTab } from './components/ReorganizationTab'
import { useInventory } from './hooks/useInventory'
import { ParsedCSV, ColumnMapping } from './types/inventory'
import { analyzeInventory } from './lib/sequenceAnalyzer'
import { filterValidLocations } from './lib/locationParser'

function App() {
  const [parsedCSV, setParsedCSV] = useState<ParsedCSV | null>(null)
  const [showMapper, setShowMapper] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('dashboard')
  const [importNotification, setImportNotification] = useState<{
    valid: number
    invalid: number
    examples: string[]
  } | null>(null)
  const { items, addItems, addItem, updateItem, deleteItems, clearAll } = useInventory()

  // Analyze inventory for out-of-order detection
  // Order is learned from the data itself (median part numbers per shelf)
  const analysis = useMemo(() => {
    return analyzeInventory(items)
  }, [items])

  const handleFileUploaded = (csv: ParsedCSV) => {
    setParsedCSV(csv)
    setShowMapper(true)
  }

  const handleMappingConfirmed = async (mapping: ColumnMapping) => {
    if (!parsedCSV) return

    const allItems = parsedCSV.data.map(row => ({
      location: String(row[mapping.location] || ''),
      partNumber: String(row[mapping.partNumber] || ''),
      itemType: String(row[mapping.itemType] || ''),
    }))

    // Filter out items with invalid locations (e.g., PCI5-1H15F)
    // Only keep items with valid shelf locations (ending in SECTION-NUMBER-LEVEL like A-01-A)
    const { valid, invalid, stats } = filterValidLocations(allItems)

    // Clear existing inventory before adding new items (CSV is source of truth)
    await clearAll()

    // Add only valid items to inventory
    addItems(valid)

    // Show notification about filtered items
    if (stats.invalidCount > 0) {
      const examples = invalid.slice(0, 3).map(i => i.location)
      setImportNotification({
        valid: stats.validCount,
        invalid: stats.invalidCount,
        examples,
      })
      // Auto-dismiss after 10 seconds
      setTimeout(() => setImportNotification(null), 10000)
    }

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

  const handleNavigateToInventory = () => {
    setActiveTab('inventory')
  }

  // Show column mapper modal
  if (showMapper && parsedCSV) {
    return (
      <div className="min-h-screen bg-gray-100">
        <header className="bg-white shadow-sm">
          <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
            <h1 className="text-xl font-bold text-gray-900">Shelf Organizer</h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <ColumnMapper
            headers={parsedCSV.headers}
            sampleData={parsedCSV.data.slice(0, 3)}
            onConfirm={handleMappingConfirmed}
            onCancel={handleCancelMapping}
          />
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Import Notification */}
      {importNotification && (
        <div className="fixed top-4 right-4 z-50 max-w-md bg-white rounded-lg shadow-lg border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="flex-1">
              <h4 className="font-medium text-gray-900">Import Complete</h4>
              <p className="text-sm text-gray-600 mt-1">
                <span className="text-green-600 font-medium">{importNotification.valid}</span> items imported
              </p>
              {importNotification.invalid > 0 && (
                <div className="mt-2">
                  <p className="text-sm text-amber-600">
                    <span className="font-medium">{importNotification.invalid}</span> items skipped (invalid location format)
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Examples: {importNotification.examples.join(', ')}
                  </p>
                  <p className="text-xs text-gray-400 mt-1">
                    Valid format: ends with SECTION-NUMBER-LEVEL (e.g., A-01-A)
                  </p>
                </div>
              )}
            </div>
            <button
              onClick={() => setImportNotification(null)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Shelf Organizer</h1>
              <p className="text-sm text-gray-500">Keep your shelves in order</p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div className="text-gray-600">
                <span className="font-medium text-gray-900">{analysis.totalItems}</span> items
              </div>
              <div className="text-gray-600">
                <span className="font-medium text-gray-900">{analysis.groups.length}</span> locations
              </div>
              <div className={analysis.totalOutOfOrder > 0 ? 'text-amber-600' : 'text-green-600'}>
                <span className="font-medium">{analysis.totalOutOfOrder}</span> {analysis.totalOutOfOrder === 1 ? 'problem' : 'problems'}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <TabNavigation
        activeTab={activeTab}
        onTabChange={setActiveTab}
        problemCount={analysis.totalOutOfOrder}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto">
        {activeTab === 'dashboard' && (
          <Dashboard
            outOfOrderItems={analysis.enhancedOutOfOrderItems}
            learnedOrder={analysis.learnedOrder}
            items={items}
            onScrollToItem={handleScrollToItem}
            onFileUploaded={handleFileUploaded}
            onAddItem={addItem}
            onUpdateItem={updateItem}
            onNavigateToInventory={handleNavigateToInventory}
            onNavigateToReorganize={() => setActiveTab('reorganize')}
          />
        )}

        {activeTab === 'reorganize' && (
          <ReorganizationTab items={items} />
        )}

        {activeTab === 'inventory' && (
          <div className="p-6">
            {/* Toolbar */}
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => addItem({ location: '', partNumber: '', itemType: '' })}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Add Item
                </button>
                <button
                  onClick={clearAll}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  Clear All
                </button>
              </div>
              <div className="text-sm text-gray-500">
                {analysis.totalItems} items in {analysis.groups.length} locations
              </div>
            </div>

            {/* Inventory Grid */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <InventoryGrid
                items={items}
                analysis={analysis}
                onUpdateItem={updateItem}
                onDeleteItems={deleteItems}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App
