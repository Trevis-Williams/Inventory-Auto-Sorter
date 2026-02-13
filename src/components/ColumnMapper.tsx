import { useState, useMemo } from 'react'
import { ColumnMapping } from '../types/inventory'
import { autoDetectColumns } from '../lib/csvParser'

interface ColumnMapperProps {
  headers: string[]
  sampleData: Record<string, string>[]
  onConfirm: (mapping: ColumnMapping) => void
  onCancel: () => void
}

export function ColumnMapper({ headers, sampleData, onConfirm, onCancel }: ColumnMapperProps) {
  const suggestedMapping = useMemo(() => autoDetectColumns(headers), [headers])

  const [mapping, setMapping] = useState<ColumnMapping>(suggestedMapping)

  const handleChange = (field: keyof ColumnMapping, value: string) => {
    setMapping(prev => ({ ...prev, [field]: value }))
  }

  const isValid = mapping.location && mapping.partNumber && mapping.itemType

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Map CSV Columns</h2>
      <p className="text-sm text-gray-600 mb-6">
        We've detected your CSV columns. Please verify or adjust the mapping below.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location Column
          </label>
          <select
            value={mapping.location}
            onChange={(e) => handleChange('location', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a column</option>
            {headers.map(header => (
              <option key={header} value={header}>{header}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Part Number Column
          </label>
          <select
            value={mapping.partNumber}
            onChange={(e) => handleChange('partNumber', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a column</option>
            {headers.map(header => (
              <option key={header} value={header}>{header}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Item Type Column
          </label>
          <select
            value={mapping.itemType}
            onChange={(e) => handleChange('itemType', e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select a column</option>
            {headers.map(header => (
              <option key={header} value={header}>{header}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Preview Table */}
      <div className="mb-6">
        <h3 className="text-sm font-medium text-gray-700 mb-2">Preview (first 3 rows)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-md">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Part Number</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item Type</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sampleData.map((row, index) => (
                <tr key={index}>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {mapping.location ? row[mapping.location] || '-' : '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {mapping.partNumber ? row[mapping.partNumber] || '-' : '-'}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900">
                    {mapping.itemType ? row[mapping.itemType] || '-' : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          onClick={() => onConfirm(mapping)}
          disabled={!isValid}
          className={`
            px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500
            ${isValid
              ? 'bg-blue-600 hover:bg-blue-700'
              : 'bg-gray-400 cursor-not-allowed'
            }
          `}
        >
          Import Data
        </button>
      </div>
    </div>
  )
}
