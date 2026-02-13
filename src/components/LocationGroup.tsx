import { useState } from 'react'
import { InventoryItem, SequenceAnalysis } from '../types/inventory'

interface LocationGroupProps {
  location: string
  items: InventoryItem[]
  outOfOrderItems: SequenceAnalysis[]
  onUpdateItem: (id: string, updates: Partial<{ location: string; partNumber: string; itemType: string }>) => Promise<void>
  onDeleteItem: (id: string) => void
}

export function LocationGroup({
  location,
  items,
  outOfOrderItems,
  onUpdateItem,
  onDeleteItem,
}: LocationGroupProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [editingCell, setEditingCell] = useState<{ id: string; field: string } | null>(null)
  const [editValue, setEditValue] = useState('')

  const outOfOrderIds = new Set(outOfOrderItems.map(item => item.id))
  const outOfOrderCount = items.filter(item => outOfOrderIds.has(item.id)).length

  const handleStartEdit = (id: string, field: string, value: string) => {
    setEditingCell({ id, field })
    setEditValue(value)
  }

  const handleSaveEdit = async () => {
    if (editingCell) {
      await onUpdateItem(editingCell.id, { [editingCell.field]: editValue })
      setEditingCell(null)
      setEditValue('')
    }
  }

  const handleCancelEdit = () => {
    setEditingCell(null)
    setEditValue('')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSaveEdit()
    } else if (e.key === 'Escape') {
      handleCancelEdit()
    }
  }

  const getOutOfOrderInfo = (itemId: string): SequenceAnalysis | undefined => {
    return outOfOrderItems.find(item => item.id === itemId)
  }

  return (
    <div className="border border-gray-200 rounded-lg mb-3 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <span className="font-medium text-gray-900">{location}</span>
          <span className="text-sm text-gray-500">({items.length} items)</span>
        </div>
        <div className="flex items-center gap-2">
          {outOfOrderCount > 0 && (
            <span className="px-2 py-1 text-xs font-medium text-amber-700 bg-amber-100 rounded-full">
              {outOfOrderCount} out of order
            </span>
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Part Number
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Type
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {items.map((item) => {
                const isOutOfOrder = outOfOrderIds.has(item.id)
                const outOfOrderInfo = isOutOfOrder ? getOutOfOrderInfo(item.id) : null

                return (
                  <tr
                    key={item.id}
                    data-item-id={item.id}
                    className={`hover:bg-gray-50 ${isOutOfOrder ? 'border-l-2 border-l-amber-400' : ''}`}
                  >
                    {/* Part Number Cell */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {editingCell?.id === item.id && editingCell?.field === 'partNumber' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={handleKeyDown}
                          className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => handleStartEdit(item.id, 'partNumber', item.partNumber)}
                          className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-gray-900 font-mono text-sm"
                        >
                          {item.partNumber}
                        </span>
                      )}
                    </td>

                    {/* Item Type Cell */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {editingCell?.id === item.id && editingCell?.field === 'itemType' ? (
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onBlur={handleSaveEdit}
                          onKeyDown={handleKeyDown}
                          className="w-full px-2 py-1 border border-blue-500 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                          autoFocus
                        />
                      ) : (
                        <span
                          onClick={() => handleStartEdit(item.id, 'itemType', item.itemType)}
                          className="cursor-pointer hover:bg-gray-100 px-1 py-0.5 rounded text-gray-700 text-sm"
                        >
                          {item.itemType || <span className="text-gray-400 italic">No description</span>}
                        </span>
                      )}
                    </td>

                    {/* Status Cell */}
                    <td className="px-4 py-2.5 whitespace-nowrap">
                      {isOutOfOrder && outOfOrderInfo ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-700 rounded text-xs">
                          <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                            <path
                              fillRule="evenodd"
                              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                              clipRule="evenodd"
                            />
                          </svg>
                          May be misplaced
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">OK</span>
                      )}
                    </td>

                    {/* Actions Cell */}
                    <td className="px-4 py-2.5 whitespace-nowrap text-right">
                      <button
                        onClick={() => onDeleteItem(item.id)}
                        className="text-gray-400 hover:text-red-600 text-sm transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
