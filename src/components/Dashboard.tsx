import { useState } from 'react'
import { EnhancedSequenceAnalysis, LearnedShelfOrder, InventoryItem, ParsedCSV } from '../types/inventory'
import { FileUpload } from './FileUpload'
import { PlacementFinder } from './PlacementFinder'
import { BarcodeScanner } from './BarcodeScanner'

interface DashboardProps {
  outOfOrderItems: EnhancedSequenceAnalysis[]
  learnedOrder: LearnedShelfOrder
  items: InventoryItem[]
  onScrollToItem: (id: string) => void
  onFileUploaded: (csv: ParsedCSV) => void
  onAddItem: (item: { location: string; partNumber: string; itemType: string }) => Promise<string>
  onUpdateItem?: (id: string, updates: Partial<InventoryItem>) => void
  onNavigateToInventory: () => void
  onNavigateToReorganize?: () => void
}

function PriorityBadge({ priority }: { priority: 'high' | 'medium' | 'low' }) {
  const colors = {
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-yellow-100 text-yellow-700',
  }
  
  return (
    <span className={`px-2 py-0.5 text-xs font-medium rounded-full capitalize ${colors[priority]}`}>
      {priority}
    </span>
  )
}

export function Dashboard({
  outOfOrderItems,
  learnedOrder,
  items,
  onScrollToItem,
  onFileUploaded,
  onAddItem,
  onUpdateItem,
  onNavigateToInventory,
  onNavigateToReorganize,
}: DashboardProps) {
  const [showUpload, setShowUpload] = useState(false)
  const [showScanner, setShowScanner] = useState(false)

  // Group problems by priority based on rank difference
  const getPriority = (item: EnhancedSequenceAnalysis): 'high' | 'medium' | 'low' => {
    const rankDiff = Math.abs(item.expectedLocationRank - item.actualLocationRank)
    if (rankDiff >= 4) return 'high'
    if (rankDiff >= 2) return 'medium'
    return 'low'
  }

  const highPriority = outOfOrderItems.filter(i => getPriority(i) === 'high')
  const mediumPriority = outOfOrderItems.filter(i => getPriority(i) === 'medium')
  const lowPriority = outOfOrderItems.filter(i => getPriority(i) === 'low')

  const handleItemClick = (id: string) => {
    onScrollToItem(id)
    onNavigateToInventory()
  }

  return (
    <div className="p-6 space-y-6">
      {/* Learning Status Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-100">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Order Learning</h2>
                <p className="text-sm text-gray-500">
                  Analyzed {learnedOrder.totalItems} items across {learnedOrder.locations.length} shelves
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{learnedOrder.learningConfidence}%</div>
                <div className="text-xs text-gray-500">Confidence</div>
              </div>
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${
                learnedOrder.learningConfidence >= 80 ? 'bg-green-100 text-green-700' :
                learnedOrder.learningConfidence >= 50 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>
                {learnedOrder.learningConfidence >= 80 ? 'Good' :
                 learnedOrder.learningConfidence >= 50 ? 'Fair' : 'Low'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Problems Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${outOfOrderItems.length > 0 ? 'bg-amber-100' : 'bg-green-100'}`}>
                {outOfOrderItems.length > 0 ? (
                  <svg className="w-5 h-5 text-amber-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                )}
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {outOfOrderItems.length > 0 ? `${outOfOrderItems.length} Items May Be Misplaced` : 'All Items In Order'}
                </h2>
                <p className="text-sm text-gray-500">
                  Items on shelves that don't match the learned part number sequence
                </p>
              </div>
            </div>
            {outOfOrderItems.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="px-2 py-1 bg-red-50 text-red-700 rounded">{highPriority.length} High</span>
                  <span className="px-2 py-1 bg-amber-50 text-amber-700 rounded">{mediumPriority.length} Med</span>
                  <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded">{lowPriority.length} Low</span>
                </div>
                {onNavigateToReorganize && (
                  <button
                    onClick={onNavigateToReorganize}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                    Plan Fixes
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {outOfOrderItems.length > 0 && (
          <div className="max-h-96 overflow-y-auto">
            {/* High Priority Section */}
            {highPriority.length > 0 && (
              <div>
                <div className="px-6 py-2 bg-red-50 border-b border-red-100 sticky top-0 z-10">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-red-700">High Priority</span>
                    <span className="text-sm text-red-600">{highPriority.length} item{highPriority.length !== 1 ? 's' : ''} - Move 4+ shelves away</span>
                  </div>
                </div>
                <table className="min-w-full">
                  <tbody className="divide-y divide-gray-100">
                    {highPriority.slice(0, 5).map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => handleItemClick(item.id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-3 w-24">
                          <PriorityBadge priority="high" />
                        </td>
                        <td className="px-6 py-3 w-32">
                          <span className="font-mono font-medium text-gray-900">{item.partNumber}</span>
                        </td>
                        <td className="px-6 py-3 w-40 text-gray-600">{item.location}</td>
                        <td className="px-6 py-3 text-sm text-gray-500">{item.suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {highPriority.length > 5 && (
                  <div className="px-6 py-2 bg-red-50 text-center border-b border-red-100">
                    <button
                      onClick={onNavigateToInventory}
                      className="text-sm text-red-600 font-medium hover:underline"
                    >
                      +{highPriority.length - 5} more high priority items
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Medium Priority Section */}
            {mediumPriority.length > 0 && (
              <div>
                <div className="px-6 py-2 bg-amber-50 border-b border-amber-100 sticky top-0 z-10">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-amber-700">Medium Priority</span>
                    <span className="text-sm text-amber-600">{mediumPriority.length} item{mediumPriority.length !== 1 ? 's' : ''} - Move 2-3 shelves away</span>
                  </div>
                </div>
                <table className="min-w-full">
                  <tbody className="divide-y divide-gray-100">
                    {mediumPriority.slice(0, 3).map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => handleItemClick(item.id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-3 w-24">
                          <PriorityBadge priority="medium" />
                        </td>
                        <td className="px-6 py-3 w-32">
                          <span className="font-mono font-medium text-gray-900">{item.partNumber}</span>
                        </td>
                        <td className="px-6 py-3 w-40 text-gray-600">{item.location}</td>
                        <td className="px-6 py-3 text-sm text-gray-500">{item.suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {mediumPriority.length > 3 && (
                  <div className="px-6 py-2 bg-amber-50 text-center border-b border-amber-100">
                    <button
                      onClick={onNavigateToInventory}
                      className="text-sm text-amber-600 font-medium hover:underline"
                    >
                      +{mediumPriority.length - 3} more medium priority items
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Low Priority Section */}
            {lowPriority.length > 0 && (
              <div>
                <div className="px-6 py-2 bg-yellow-50 border-b border-yellow-100 sticky top-0 z-10">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-yellow-700">Low Priority</span>
                    <span className="text-sm text-yellow-600">{lowPriority.length} item{lowPriority.length !== 1 ? 's' : ''} - Adjacent shelf</span>
                  </div>
                </div>
                <table className="min-w-full">
                  <tbody className="divide-y divide-gray-100">
                    {lowPriority.slice(0, 2).map((item) => (
                      <tr
                        key={item.id}
                        onClick={() => handleItemClick(item.id)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-6 py-3 w-24">
                          <PriorityBadge priority="low" />
                        </td>
                        <td className="px-6 py-3 w-32">
                          <span className="font-mono font-medium text-gray-900">{item.partNumber}</span>
                        </td>
                        <td className="px-6 py-3 w-40 text-gray-600">{item.location}</td>
                        <td className="px-6 py-3 text-sm text-gray-500">{item.suggestion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {lowPriority.length > 2 && (
                  <div className="px-6 py-2 bg-yellow-50 text-center">
                    <button
                      onClick={onNavigateToInventory}
                      className="text-sm text-yellow-600 font-medium hover:underline"
                    >
                      +{lowPriority.length - 2} more low priority items
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-100">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              <p className="text-sm text-gray-500">Common tasks</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Barcode Scanner */}
            <button
              onClick={() => setShowScanner(true)}
              className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 transition-colors text-left"
            >
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              <div>
                <p className="font-medium text-blue-900">Scan Barcode</p>
                <p className="text-sm text-blue-600">Quick lookup</p>
              </div>
            </button>

            {/* Upload CSV */}
            {showUpload ? (
              <div className="col-span-1 md:col-span-2 space-y-3">
                <FileUpload onFileUploaded={(csv) => {
                  onFileUploaded(csv)
                  setShowUpload(false)
                }} />
                <button
                  onClick={() => setShowUpload(false)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowUpload(true)}
                className="flex items-center gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <div>
                  <p className="font-medium text-gray-900">Upload CSV</p>
                  <p className="text-sm text-gray-500">Import inventory</p>
                </div>
              </button>
            )}
          </div>

          {/* Placement Finder */}
          <div className="mt-4">
            <PlacementFinder
              items={items}
              onAddItem={onAddItem}
            />
          </div>
        </div>
      </div>

      {/* Barcode Scanner Modal */}
      {showScanner && (
        <BarcodeScanner
          items={items}
          onAddItem={onAddItem}
          onUpdateItem={onUpdateItem}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
