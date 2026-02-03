import { useMemo } from 'react'
import { InventoryItem, InventoryAnalysis } from '../types/inventory'
import { LocationGroup } from './LocationGroup'
import { analyzeInventory } from '../lib/sequenceAnalyzer'

interface InventoryGridProps {
  items: InventoryItem[]
  onUpdateItem: (id: string, updates: Partial<{ location: string; fbpn: string; itemType: string }>) => Promise<void>
  onDeleteItems: (ids: string[]) => Promise<void>
}

export function InventoryGrid({ items, onUpdateItem, onDeleteItems }: InventoryGridProps) {
  // Analyze inventory for grouping and out-of-order detection
  const analysis: InventoryAnalysis = useMemo(() => {
    return analyzeInventory(items)
  }, [items])

  const handleDeleteItem = (id: string) => {
    onDeleteItems([id])
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <svg
          className="w-16 h-16 mb-4 text-gray-300"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
        <p className="text-lg font-medium">No inventory items</p>
        <p className="text-sm">Upload a CSV file or add items manually to get started.</p>
      </div>
    )
  }

  return (
    <div className="p-4">
      {/* Summary stats */}
      <div className="mb-4 flex items-center gap-4 text-sm text-gray-600">
        <span>{analysis.totalItems} total items</span>
        <span className="text-gray-300">|</span>
        <span>{analysis.groups.length} locations</span>
        {analysis.totalOutOfOrder > 0 && (
          <>
            <span className="text-gray-300">|</span>
            <span className="text-amber-600 font-medium">
              {analysis.totalOutOfOrder} out of order
            </span>
          </>
        )}
      </div>

      {/* Location groups */}
      <div className="space-y-2">
        {analysis.groups.map((group) => {
          // Get out-of-order items for this location
          const locationOutOfOrder = analysis.outOfOrderItems.filter(
            (item) => item.location === group.location
          )

          return (
            <LocationGroup
              key={group.location}
              location={group.location}
              items={group.items}
              outOfOrderItems={locationOutOfOrder}
              onUpdateItem={onUpdateItem}
              onDeleteItem={handleDeleteItem}
            />
          )
        })}
      </div>
    </div>
  )
}

// Export the analysis function for use in App.tsx
export { analyzeInventory }
