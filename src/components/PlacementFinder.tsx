import { useState, useCallback } from 'react'
import { InventoryItem, NewInventoryItem } from '../types/inventory'
import { suggestPlacement, PlacementSuggestion } from '../lib/placementSuggester'

interface PlacementFinderProps {
  items: InventoryItem[]
  onAddItem?: (item: NewInventoryItem) => Promise<string> | void
}

function ConfidenceIndicator({ confidence }: { confidence: number }) {
  let color = 'text-gray-400'
  let label = 'Low'
  let bgColor = 'bg-gray-100'
  
  if (confidence >= 80) {
    color = 'text-green-600'
    label = 'High'
    bgColor = 'bg-green-100'
  } else if (confidence >= 50) {
    color = 'text-yellow-600'
    label = 'Medium'
    bgColor = 'bg-yellow-100'
  }
  
  return (
    <div className={`inline-flex items-center gap-2 px-2 py-1 rounded-full ${bgColor}`}>
      <svg className={`w-4 h-4 ${color}`} fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <span className={`text-sm font-medium ${color}`}>{confidence}% {label}</span>
    </div>
  )
}

export function PlacementFinder({ items, onAddItem }: PlacementFinderProps) {
  const [searchValue, setSearchValue] = useState('')
  const [suggestion, setSuggestion] = useState<PlacementSuggestion | null>(null)

  // Handle search input change
  const handleSearch = useCallback((value: string) => {
    setSearchValue(value)

    if (value.trim().length >= 3) {
      const result = suggestPlacement(value.trim(), items)
      setSuggestion(result)
    } else {
      setSuggestion(null)
    }
  }, [items])

  // Handle adding the item to inventory
  const handleAddToInventory = () => {
    if (!suggestion || !suggestion.primarySuggestion || !onAddItem) return

    onAddItem({
      location: suggestion.primarySuggestion.location,
      partNumber: suggestion.partNumber,
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
          placeholder="Enter part number (e.g., 24-000350)"
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
                <span className="font-medium">This part number already exists in inventory</span>
              </div>
              <p className="mt-1 text-sm text-blue-700">
                Current location: <span className="font-mono font-medium">{suggestion.existingLocation}</span>
              </p>
            </div>
          )}

          {/* Invalid part number */}
          {!suggestion.isValid && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center gap-2 text-red-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Invalid part number format</span>
              </div>
              <p className="mt-1 text-sm text-red-700">
                Expected format: XX-XXXXXX (e.g., 24-000328)
              </p>
            </div>
          )}

          {/* Valid suggestion with location */}
          {suggestion.isValid && suggestion.primarySuggestion && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <h3 className="text-lg font-semibold text-green-800">
                      Suggested Placement
                    </h3>
                    <ConfidenceIndicator confidence={suggestion.primarySuggestion.confidence} />
                  </div>

                  {/* Primary Location */}
                  <div className="mb-4 p-3 bg-white rounded-lg border border-green-200">
                    <span className="text-sm text-gray-600">Place at:</span>
                    <p className="text-xl font-mono font-bold text-green-900">
                      {suggestion.primarySuggestion.location}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      Shelf: {suggestion.primarySuggestion.shelfUnit} | Level: {suggestion.primarySuggestion.level}
                    </p>
                  </div>

                  {/* Reasoning */}
                  {suggestion.primarySuggestion.reasoning.length > 0 && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-700">Why here:</span>
                      <ul className="mt-1 space-y-1">
                        {suggestion.primarySuggestion.reasoning.map((reason, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            {reason}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Neighboring part numbers */}
                  {(suggestion.neighbors.before || suggestion.neighbors.after) && (
                    <div className="mb-4">
                      <span className="text-sm font-medium text-gray-700">Position in sequence:</span>
                      <div className="mt-2 flex items-center gap-2 flex-wrap">
                        {suggestion.neighbors.before ? (
                          <div className="px-3 py-1.5 bg-gray-100 rounded-lg">
                            <span className="text-xs text-gray-500 block">After</span>
                            <span className="font-mono font-medium text-gray-900">{suggestion.neighbors.before.partNumber}</span>
                            <span className="text-xs text-gray-500 ml-1">({suggestion.neighbors.before.location})</span>
                          </div>
                        ) : (
                          <div className="px-3 py-1.5 bg-gray-100 rounded-lg text-gray-400">
                            <span className="text-xs block">Start</span>
                            <span className="font-mono">(first)</span>
                          </div>
                        )}
                        
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        
                        <div className="px-3 py-1.5 bg-green-200 rounded-lg border-2 border-green-400">
                          <span className="text-xs text-green-700 block">New</span>
                          <span className="font-mono font-bold text-green-900">{suggestion.partNumber}</span>
                        </div>
                        
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                        </svg>
                        
                        {suggestion.neighbors.after ? (
                          <div className="px-3 py-1.5 bg-gray-100 rounded-lg">
                            <span className="text-xs text-gray-500 block">Before</span>
                            <span className="font-mono font-medium text-gray-900">{suggestion.neighbors.after.partNumber}</span>
                            <span className="text-xs text-gray-500 ml-1">({suggestion.neighbors.after.location})</span>
                          </div>
                        ) : (
                          <div className="px-3 py-1.5 bg-gray-100 rounded-lg text-gray-400">
                            <span className="text-xs block">End</span>
                            <span className="font-mono">(last)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Alternative locations */}
                  {suggestion.alternatives.length > 0 && (
                    <div>
                      <span className="text-sm font-medium text-gray-700">Alternatives:</span>
                      <div className="mt-2 space-y-2">
                        {suggestion.alternatives.map((alt, i) => (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-medium text-gray-700">{alt.location}</span>
                              <span className="text-sm text-gray-500">{alt.reason}</span>
                            </div>
                            <span className={`text-sm ${
                              alt.confidence >= 50 ? 'text-green-600' : 'text-gray-500'
                            }`}>
                              {alt.confidence}%
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Add to inventory button */}
                {onAddItem && !suggestion.existsInInventory && (
                  <button
                    onClick={handleAddToInventory}
                    className="ml-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center gap-2 flex-shrink-0"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Valid part number but no location data */}
          {suggestion.isValid && !suggestion.primarySuggestion && !suggestion.existsInInventory && (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-800">
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Not enough data to suggest placement</span>
              </div>
              <p className="mt-1 text-sm text-yellow-700">
                Upload more inventory data to enable intelligent placement suggestions.
                The system needs existing items to learn shelf patterns.
              </p>
              
              {/* Show alternatives if available */}
              {suggestion.alternatives.length > 0 && (
                <div className="mt-4">
                  <span className="text-sm font-medium text-yellow-800">Possible locations based on limited data:</span>
                  <div className="mt-2 space-y-2">
                    {suggestion.alternatives.map((alt, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-2 bg-yellow-100 rounded-lg"
                      >
                        <span className="font-mono font-medium text-yellow-800">{alt.location}</span>
                        <span className="text-sm text-yellow-600">{alt.confidence}% confidence</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Help text when empty */}
      {!suggestion && items.length > 0 && (
        <p className="mt-2 text-sm text-gray-500">
          Enter a new part number to see where it should be placed based on your existing inventory.
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
