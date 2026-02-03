import { useState } from 'react'
import { InventoryItem } from '../types/inventory'
import { exportToCSV, downloadCSV } from '../lib/csvParser'

interface ToolbarProps {
  onAddRow: () => void
  onDeleteSelected: (ids: string[]) => Promise<void>
  onClearAll: () => Promise<void>
  items: InventoryItem[]
}

export function Toolbar({ onAddRow, onDeleteSelected, onClearAll, items }: ToolbarProps) {
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleExport = () => {
    if (items.length === 0) {
      alert('No data to export')
      return
    }

    const csvString = exportToCSV(items)
    const timestamp = new Date().toISOString().slice(0, 10)
    downloadCSV(csvString, `inventory-${timestamp}.csv`)
  }

  const handleDeleteSelected = () => {
    const selectedIds = (window as unknown as { __inventorySelectedIds?: string[] }).__inventorySelectedIds || []
    if (selectedIds.length === 0) {
      alert('No rows selected. Click on rows to select them first.')
      return
    }
    if (confirm(`Delete ${selectedIds.length} selected row(s)?`)) {
      onDeleteSelected(selectedIds)
    }
  }

  const handleClearAll = async () => {
    await onClearAll()
    setShowClearConfirm(false)
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <button
        onClick={onAddRow}
        className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
        Add Row
      </button>

      <button
        onClick={handleDeleteSelected}
        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
        Delete Selected
      </button>

      <button
        onClick={handleExport}
        className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      >
        <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Export CSV
      </button>

      <div className="relative">
        {showClearConfirm ? (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            <span className="text-sm text-red-700">Clear all data?</span>
            <button
              onClick={handleClearAll}
              className="text-sm font-medium text-red-600 hover:text-red-800"
            >
              Yes
            </button>
            <button
              onClick={() => setShowClearConfirm(false)}
              className="text-sm font-medium text-gray-600 hover:text-gray-800"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="inline-flex items-center px-3 py-2 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            Clear All
          </button>
        )}
      </div>

      <div className="ml-auto text-sm text-gray-500">
        {items.length} item{items.length !== 1 ? 's' : ''} in inventory
      </div>
    </div>
  )
}
