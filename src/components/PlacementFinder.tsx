import { useState, useMemo, useCallback } from 'react'
import { InventoryItem, PlacementSuggestion, NewInventoryItem } from '../types/inventory'
import { buildPrefixLocationMap, getPlacementSuggestion } from '../lib/locationLearner'

interface PlacementFinderProps {
  items: InventoryItem[]
  onAddItem?: (item: NewInventoryItem) => void
}

export function PlacementFinder({ items, onAddItem }: PlacementFinderProps) {
  const [searchValue, setSearchValue] = useState('')
  const [suggestion, setSuggestion] = useState<PlacementSuggestion | null>(null)

  // Build the prefix location map from current inventory
  const prefixMap = useMemo(() => {
    return buildPrefixLocationMap(items)
  }, [items])

  // Handle search input change
  const handleSearch = useCallback((value: string) => {
    setSearchValue(value)

    if (value.trim().length >= 3) {
      const result = getPlacementSuggestion(value.trim(), items, prefixMap)
      setSuggestion(result)
    } else {
      setSuggestion(null)
    }
  }, [items, prefixMap])

  // Handle adding the item to inventory
  const handleAddToInventory = () => {
    if (!suggestion || !suggestion.suggestedLocation || !onAddItem) return

    onAddItem({
      location: suggestion.suggestedLocation,
      fbpn: suggestion.fbpn,
      itemType: '', // User can fill this in later
    })

    // Clear the search
    setSearchValue('')
    setSuggestion(null)
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        Find Placement for New Part
      </h2>

      {/* Search Input */}
      <div className="relative">
        <input
          type="text"
          value={searchValue}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Enter FBPN (e.g., 24-000350)"
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-mono"
        />
        {searchValue && (
          <button
            onClick={() => { setSearchValue(''); setSuggestion(null) }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Results */}
      {suggestion && (
        <div className="mt-4">
          {/* Already exists warning */}
          {suggestion.existsInInventory && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2 text-blue-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">This FBPN already exists in inventory</span>
              </div>
              <p className="mt-1 text-sm text-blue-700">
                Current location: <span className="font-mono font-medium">{suggestion.existingLocation}</span>
              </p>
            </div>
          )}

          {/* Invalid FBPN */}
          {!suggestion.isValid && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Invalid FBPN format</span>
              </div>
              <p className="mt-1 text-sm text-red-700">
                Expected format: XX-XXXXXX (e.g., 24-000328)
              </p>
            </div>
          )}

          {/* Valid suggestion with location */}
          {suggestion.isValid && suggestion.suggestedLocation && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-green-800 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    Suggested Placement for {suggestion.fbpn}
                  </h3>

                  {/* Location */}
                  <div className="mt-3">
                    <span className="text-sm text-gray-600">Location:</span>
                    <p className="text-xl font-mono font-bold text-green-900">
                      {suggestion.suggestedLocation}
                    </p>
                    <p className="text-sm text-green-700">
                      Based on {suggestion.totalSimilarItems} similar parts ({suggestion.confidence}% confidence)
                    </p>
                  </div>

                  {/* Position */}
                  <div className="mt-4">
                    <span className="text-sm text-gray-600">Position:</span>
                    <div className="mt-1 flex items-center gap-2 text-lg">
                      <span className="font-mono text-gray-600">
                        {suggestion.beforeFBPN || '(start)'}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="font-mono font-bold text-green-800 px-2 py-1 bg-green-100 rounded">
                        {suggestion.fbpn}
                      </span>
                      <span className="text-gray-400">→</span>
                      <span className="font-mono text-gray-600">
                        {suggestion.afterFBPN || '(end)'}
                      </span>
                    </div>
                  </div>

                  {/* Alternative locations */}
                  {suggestion.alternativeLocations.length > 0 && (
                    <div className="mt-4">
                      <span className="text-sm text-gray-600">Other possible locations:</span>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {suggestion.alternativeLocations.slice(0, 3).map((alt) => (
                          <span
                            key={alt.location}
                            className="px-2 py-1 text-sm font-mono bg-gray-100 text-gray-700 rounded"
                          >
                            {alt.location} ({alt.count} items, {alt.percentage}%)
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Add to inventory button */}
                {onAddItem && !suggestion.existsInInventory && (
                  <button
                    onClick={handleAddToInventory}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add to Inventory
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Valid FBPN but no location data */}
          {suggestion.isValid && !suggestion.suggestedLocation && !suggestion.existsInInventory && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">No placement data available</span>
              </div>
              <p className="mt-1 text-sm text-yellow-700">
                No existing items with prefix "{suggestion.fbpn.split('-')[0]}" found in inventory.
                Add this item manually to start building the pattern.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Help text when empty */}
      {!suggestion && items.length > 0 && (
        <p className="mt-2 text-sm text-gray-500">
          Enter a new FBPN to see where it should be placed based on your existing inventory.
        </p>
      )}

      {/* No inventory data */}
      {items.length === 0 && (
        <p className="mt-2 text-sm text-gray-500">
          Upload inventory data first to enable placement suggestions.
        </p>
      )}
    </div>
  )
}
