import { useState } from 'react'
import { EnhancedSequenceAnalysis, LearnedShelfOrder } from '../types/inventory'

interface OutOfOrderSummaryProps {
  outOfOrderItems: EnhancedSequenceAnalysis[]
  learnedOrder: LearnedShelfOrder
  onScrollToItem?: (id: string) => void
}

function ConfidenceBadge({ confidence }: { confidence: number }) {
  let bgColor = 'bg-gray-100 text-gray-700'
  let label = 'Low'
  
  if (confidence >= 80) {
    bgColor = 'bg-red-100 text-red-700'
    label = 'High'
  } else if (confidence >= 50) {
    bgColor = 'bg-amber-100 text-amber-700'
    label = 'Medium'
  } else {
    bgColor = 'bg-yellow-100 text-yellow-700'
    label = 'Low'
  }
  
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${bgColor}`}>
      {label} ({confidence}%)
    </span>
  )
}

export function OutOfOrderSummary({ outOfOrderItems, learnedOrder, onScrollToItem }: OutOfOrderSummaryProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  if (outOfOrderItems.length === 0) {
    return (
      <div className="mb-6 border border-green-200 rounded-lg bg-green-50 p-4">
        <div className="flex items-center gap-3">
          <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span className="font-medium text-green-800">All items appear to be in order</span>
        </div>
        <p className="mt-2 text-sm text-green-700">
          Shelf order learned from {learnedOrder.totalItems} items across {learnedOrder.locations.length} locations.
          Pattern confidence: {learnedOrder.learningConfidence}%
        </p>
      </div>
    )
  }

  return (
    <div className="mb-6 border border-amber-200 rounded-lg bg-amber-50 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-amber-100 hover:bg-amber-200 transition-colors"
      >
        <div className="flex items-center gap-3">
          <svg
            className={`w-4 h-4 text-amber-600 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-semibold text-amber-800">
            {outOfOrderItems.length} item{outOfOrderItems.length !== 1 ? 's' : ''} may be out of place
          </span>
        </div>
        <span className="text-sm text-amber-600">
          {isExpanded ? 'Click to collapse' : 'Click to expand'}
        </span>
      </button>

      {/* Learning Info */}
      <div className="px-4 py-2 bg-blue-50 border-b border-blue-100">
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
          </svg>
          <span>
            <strong>Learned pattern</strong> from {learnedOrder.totalItems} items across {learnedOrder.locations.length} shelves.
            Confidence: {learnedOrder.learningConfidence}%
          </span>
        </div>
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-4">
          <p className="text-sm text-amber-700 mb-4">
            Items are flagged based on statistical analysis. Higher confidence means the item is more likely misplaced.
          </p>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-amber-200">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                    Confidence
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                    FBPN
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                    Current Location
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-amber-700 uppercase tracking-wider">
                    Suggestion
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-amber-100">
                {outOfOrderItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-amber-100 cursor-pointer transition-colors"
                    onClick={() => onScrollToItem?.(item.id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <ConfidenceBadge confidence={item.confidence} />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="font-mono font-medium text-amber-900">{item.fbpn}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-gray-700">{item.location}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{item.suggestion}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
