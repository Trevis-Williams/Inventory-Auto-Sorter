import { useState, useMemo } from 'react'
import { InventoryItem, EnhancedInventoryAnalysis } from '../types/inventory'
import { LocationGroup } from './LocationGroup'

interface InventoryGridProps {
  items: InventoryItem[]
  analysis: EnhancedInventoryAnalysis
  onUpdateItem: (id: string, updates: Partial<{ location: string; partNumber: string; itemType: string }>) => Promise<void>
  onDeleteItems: (ids: string[]) => Promise<void>
}

export function InventoryGrid({ items, analysis, onUpdateItem, onDeleteItems }: InventoryGridProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [showProblemsOnly, setShowProblemsOnly] = useState(false)

  const handleDeleteItem = (id: string) => {
    onDeleteItems([id])
  }

  // Filter groups based on search and problems filter
  const filteredGroups = useMemo(() => {
    let groups = analysis.groups

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      groups = groups.map(group => {
        const filteredItems = group.items.filter(item =>
          item.partNumber.toLowerCase().includes(query) ||
          item.location.toLowerCase().includes(query) ||
          item.itemType.toLowerCase().includes(query)
        )
        return { ...group, items: filteredItems, itemCount: filteredItems.length }
      }).filter(group => group.items.length > 0)
    }

    // Filter to show only locations with problems
    if (showProblemsOnly) {
      const outOfOrderIds = new Set(analysis.outOfOrderItems.map(item => item.id))
      groups = groups.map(group => {
        const filteredItems = group.items.filter(item => outOfOrderIds.has(item.id))
        return { ...group, items: filteredItems, itemCount: filteredItems.length }
      }).filter(group => group.items.length > 0)
    }

    return groups
  }, [analysis.groups, analysis.outOfOrderItems, searchQuery, showProblemsOnly])

  const totalFiltered = filteredGroups.reduce((sum, g) => sum + g.items.length, 0)

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
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
    <div>
      {/* Search and Filter Bar */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-4">
          {/* Search Input */}
          <div className="flex-1 relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by part number, location, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Problems Only Toggle */}
          <button
            onClick={() => setShowProblemsOnly(!showProblemsOnly)}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors
              ${showProblemsOnly
                ? 'bg-amber-100 text-amber-700 border border-amber-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-transparent'
              }
            `}
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Problems Only
            {analysis.totalOutOfOrder > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded ${showProblemsOnly ? 'bg-amber-200' : 'bg-gray-200'}`}>
                {analysis.totalOutOfOrder}
              </span>
            )}
          </button>
        </div>

        {/* Results count */}
        {(searchQuery || showProblemsOnly) && (
          <div className="mt-2 text-sm text-gray-500">
            Showing {totalFiltered} of {items.length} items
            {searchQuery && ` matching "${searchQuery}"`}
            {showProblemsOnly && ' with problems'}
          </div>
        )}
      </div>

      {/* Location groups */}
      <div className="p-4 space-y-3">
        {filteredGroups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No items match your search criteria</p>
            <button
              onClick={() => {
                setSearchQuery('')
                setShowProblemsOnly(false)
              }}
              className="mt-2 text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear filters
            </button>
          </div>
        ) : (
          filteredGroups.map((group) => {
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
          })
        )}
      </div>
    </div>
  )
}
