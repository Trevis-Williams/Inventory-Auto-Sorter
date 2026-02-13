import { useState, useEffect } from 'react'
import { InventoryItem, ReorganizationPlan, MoveInstruction } from '../types/inventory'
import {
  generateReorgPlan,
  completeMoveInPlan,
  getMovesBySourceShelf,
  getPlanProgress,
  exportPlanAsCsv,
  exportPlanAsText,
} from '../lib/reorganizationPlanner'
import { saveReorgPlan, getAllReorgPlans, deleteReorgPlan } from '../lib/db'

interface ReorganizationTabProps {
  items: InventoryItem[]
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

export function ReorganizationTab({ items }: ReorganizationTabProps) {
  const [plans, setPlans] = useState<ReorganizationPlan[]>([])
  const [activePlan, setActivePlan] = useState<ReorganizationPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [filterPriority, setFilterPriority] = useState<'all' | 'high' | 'medium' | 'low'>('all')
  const [expandedShelves, setExpandedShelves] = useState<Set<string>>(new Set())

  // Load saved plans on mount
  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    setIsLoading(true)
    try {
      const savedPlans = await getAllReorgPlans()
      setPlans(savedPlans)
      if (savedPlans.length > 0 && !activePlan) {
        setActivePlan(savedPlans[0])
      }
    } catch (error) {
      console.error('Failed to load plans:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleGeneratePlan = async () => {
    setIsGenerating(true)
    try {
      const newPlan = generateReorgPlan(items)
      await saveReorgPlan(newPlan)
      setPlans(prev => [newPlan, ...prev])
      setActivePlan(newPlan)
    } catch (error) {
      console.error('Failed to generate plan:', error)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleDeletePlan = async (planId: string) => {
    try {
      await deleteReorgPlan(planId)
      setPlans(prev => prev.filter(p => p.id !== planId))
      if (activePlan?.id === planId) {
        const remaining = plans.filter(p => p.id !== planId)
        setActivePlan(remaining.length > 0 ? remaining[0] : null)
      }
    } catch (error) {
      console.error('Failed to delete plan:', error)
    }
  }

  const handleToggleMove = async (moveId: string) => {
    if (!activePlan) return
    
    const updatedPlan = completeMoveInPlan(activePlan, moveId)
    await saveReorgPlan(updatedPlan)
    setActivePlan(updatedPlan)
    setPlans(prev => prev.map(p => p.id === updatedPlan.id ? updatedPlan : p))
  }

  const handleExportCsv = () => {
    if (!activePlan) return
    
    const csv = exportPlanAsCsv(activePlan)
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reorganization-plan-${activePlan.id}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleExportText = () => {
    if (!activePlan) return
    
    const text = exportPlanAsText(activePlan)
    const blob = new Blob([text], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `reorganization-plan-${activePlan.id}.txt`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handlePrint = () => {
    if (!activePlan) return
    
    const text = exportPlanAsText(activePlan)
    const printWindow = window.open('', '_blank')
    if (printWindow) {
      printWindow.document.write(`<pre style="font-family: monospace; white-space: pre-wrap;">${text}</pre>`)
      printWindow.document.close()
      printWindow.print()
    }
  }

  const toggleShelfExpanded = (shelfUnit: string) => {
    setExpandedShelves(prev => {
      const newSet = new Set(prev)
      if (newSet.has(shelfUnit)) {
        newSet.delete(shelfUnit)
      } else {
        newSet.add(shelfUnit)
      }
      return newSet
    })
  }

  const expandAll = () => {
    if (!activePlan) return
    const allShelves = new Set<string>()
    for (const move of activePlan.moves) {
      const parts = move.fromLocation.split('-')
      allShelves.add(parts.slice(0, -1).join('-'))
    }
    setExpandedShelves(allShelves)
  }

  const collapseAll = () => {
    setExpandedShelves(new Set())
  }

  // Get filtered moves
  const getFilteredMoves = (moves: MoveInstruction[]): MoveInstruction[] => {
    if (filterPriority === 'all') return moves
    return moves.filter(m => m.priority === filterPriority)
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const progress = activePlan ? getPlanProgress(activePlan) : null
  const movesByShelf = activePlan ? getMovesBySourceShelf(activePlan) : new Map()

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reorganization Planner</h1>
          <p className="text-gray-500">Generate and track plans to fix misplaced items</p>
        </div>
        <button
          onClick={handleGeneratePlan}
          disabled={isGenerating || items.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Generating...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Generate New Plan
            </>
          )}
        </button>
      </div>

      {/* Plans List */}
      {plans.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
            <h2 className="font-semibold text-gray-700">Saved Plans</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {plans.map(plan => (
              <div
                key={plan.id}
                className={`px-6 py-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors ${
                  activePlan?.id === plan.id ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                }`}
                onClick={() => setActivePlan(plan)}
              >
                <div className="flex-1">
                  <div className="font-medium text-gray-900">{plan.name}</div>
                  <div className="text-sm text-gray-500">
                    {plan.summary.totalMoves} moves | {plan.completedMoves} completed | Created {new Date(plan.createdAt).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="text-lg font-semibold text-gray-900">
                      {Math.round((plan.completedMoves / plan.summary.totalMoves) * 100) || 0}%
                    </div>
                    <div className="text-xs text-gray-500">Complete</div>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeletePlan(plan.id)
                    }}
                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Plan Details */}
      {activePlan && progress && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          {/* Plan Header */}
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{activePlan.name}</h2>
                <p className="text-sm text-gray-500">
                  {progress.remaining} moves remaining | ~{activePlan.summary.estimatedMinutes} min total
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportCsv}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Export CSV
                </button>
                <button
                  onClick={handleExportText}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Export Text
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Print
                </button>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-4 mb-2">
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${progress.percentComplete}%` }}
                  />
                </div>
              </div>
              <span className="text-lg font-semibold text-gray-900">{progress.percentComplete}%</span>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <span className="text-gray-600">
                <span className="font-medium text-green-600">{progress.completed}</span> / {progress.total} completed
              </span>
              <span className="text-red-600">{progress.byPriority.high.total - progress.byPriority.high.completed} high priority left</span>
              <span className="text-amber-600">{progress.byPriority.medium.total - progress.byPriority.medium.completed} medium left</span>
              <span className="text-yellow-600">{progress.byPriority.low.total - progress.byPriority.low.completed} low left</span>
            </div>
          </div>

          {/* Warnings */}
          {activePlan.warnings.length > 0 && (
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-100">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <div className="text-sm text-amber-700">
                  {activePlan.warnings.map((warning, i) => (
                    <p key={i}>{warning}</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Filter & Controls */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">Filter:</span>
              {(['all', 'high', 'medium', 'low'] as const).map(priority => (
                <button
                  key={priority}
                  onClick={() => setFilterPriority(priority)}
                  className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                    filterPriority === priority
                      ? 'bg-gray-900 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {priority === 'all' ? 'All' : priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={expandAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Expand All
              </button>
              <span className="text-gray-300">|</span>
              <button
                onClick={collapseAll}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Collapse All
              </button>
            </div>
          </div>

          {/* Move List by Shelf */}
          <div className="max-h-[500px] overflow-y-auto">
            {[...movesByShelf.entries()].map(([shelfUnit, moves]) => {
              const filteredMoves = getFilteredMoves(moves)
              if (filteredMoves.length === 0) return null
              
              const completedCount = moves.filter(m => m.completed).length
              const isExpanded = expandedShelves.has(shelfUnit)

              return (
                <div key={shelfUnit} className="border-b border-gray-200">
                  <button
                    onClick={() => toggleShelfExpanded(shelfUnit)}
                    className="w-full px-6 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="font-medium text-gray-900">{shelfUnit}</span>
                      <span className="text-sm text-gray-500">
                        {filteredMoves.length} move{filteredMoves.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">
                        {completedCount}/{moves.length}
                      </span>
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-green-500"
                          style={{ width: `${(completedCount / moves.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="bg-gray-50 divide-y divide-gray-200">
                      {filteredMoves.map(move => (
                        <div
                          key={move.id}
                          className={`px-6 py-3 flex items-center gap-4 ${
                            move.completed ? 'opacity-50' : ''
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={move.completed}
                            onChange={() => handleToggleMove(move.id)}
                            className="w-5 h-5 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          />
                          <span className="text-sm text-gray-500">#{move.sequence}</span>
                          <PriorityBadge priority={move.priority} />
                          <span className="font-mono font-medium text-gray-900">{move.partNumber}</span>
                          <span className="text-gray-400">→</span>
                          <span className="text-gray-600">{move.toLocation}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {plans.length === 0 && !isLoading && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <svg className="mx-auto w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
          <h2 className="text-xl font-semibold text-gray-700 mb-2">No Reorganization Plans</h2>
          <p className="text-gray-500 mb-6">
            Generate a plan to get step-by-step instructions for fixing misplaced items.
          </p>
          <button
            onClick={handleGeneratePlan}
            disabled={items.length === 0}
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Generate Plan
          </button>
          {items.length === 0 && (
            <p className="text-sm text-gray-400 mt-4">Upload inventory data first</p>
          )}
        </div>
      )}
    </div>
  )
}
