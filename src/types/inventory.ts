export interface InventoryItem {
  id: string
  location: string
  partNumber: string
  itemType: string
  createdAt: Date
  updatedAt: Date
}

export interface NewInventoryItem {
  location: string
  partNumber: string
  itemType: string
}

export interface ParsedCSV {
  headers: string[]
  data: Record<string, string>[]
}

export interface ColumnMapping {
  location: string
  partNumber: string
  itemType: string
}

export interface ColumnMatch {
  field: keyof ColumnMapping
  header: string
  score: number
}

// Parsed part number structure (e.g., "24-000328" -> prefix: "24", number: 328)
export interface ParsedPartNumber {
  original: string
  prefix: string
  number: number
  isValid: boolean
}

// Sequence analysis for a single item
export interface SequenceAnalysis {
  id: string
  partNumber: string
  location: string
  itemType: string
  isOutOfOrder: boolean
  expectedBefore: string | null  // Part number that should come before in global sequence
  expectedAfter: string | null   // Part number that should come after in global sequence
  actualBefore: string | null    // Actual part number before at this location
  actualAfter: string | null     // Actual part number after at this location
}

// Grouped inventory by location
export interface LocationGroup {
  location: string
  items: InventoryItem[]
  itemCount: number
  outOfOrderCount: number
}

// Full analysis result
export interface InventoryAnalysis {
  groups: LocationGroup[]
  outOfOrderItems: SequenceAnalysis[]
  totalItems: number
  totalOutOfOrder: number
}

// Location count for a specific prefix
export interface LocationCount {
  location: string
  count: number
  percentage: number
}

// Map of part number prefix to location counts
export interface PrefixLocationMap {
  [prefix: string]: LocationCount[]
}

// Placement suggestion result
export interface PlacementSuggestion {
  partNumber: string
  isValid: boolean
  suggestedLocation: string | null
  confidence: number  // 0-100 percentage
  totalSimilarItems: number
  beforePartNumber: string | null  // Part number that should come before
  afterPartNumber: string | null   // Part number that should come after
  alternativeLocations: LocationCount[]  // Other possible locations
  existsInInventory: boolean  // Whether this part number already exists
  existingLocation: string | null  // Location if it already exists
}

// Statistics for a single location (learned from data)
export interface LocationStats {
  location: string
  itemCount: number
  partNumberValues: number[]  // Numeric values of part numbers for calculations
  medianPartNumber: number    // Median part number value (for ordering)
  meanPartNumber: number      // Mean part number value
  stdDev: number        // Standard deviation of part number values
  minPartNumber: number       // Lowest part number at this location
  maxPartNumber: number       // Highest part number at this location
  learnedRank: number   // Rank in the learned shelf order (1 = first shelf)
}

// Learned shelf order from pattern analysis
export interface LearnedShelfOrder {
  locations: LocationStats[]  // Locations sorted by learned order
  locationRankMap: Map<string, number>  // Quick lookup: location -> rank
  totalItems: number
  learningConfidence: number  // 0-100: how confident we are in the learned pattern
}

// Enhanced sequence analysis with confidence
export interface EnhancedSequenceAnalysis extends SequenceAnalysis {
  confidence: number           // 0-100: how confident we are this is out of order
  deviationFromMedian: number  // How far the part number is from location's median
  expectedLocationRank: number // Where this part number should be based on its value
  actualLocationRank: number   // Where this part number actually is
  suggestion: string           // Human-readable suggestion
}

// Enhanced inventory analysis with learning info
export interface EnhancedInventoryAnalysis extends InventoryAnalysis {
  learnedOrder: LearnedShelfOrder
  enhancedOutOfOrderItems: EnhancedSequenceAnalysis[]
}

// ============================================
// Reorganization Plan Types
// ============================================

// Misplacement analysis for a single item
export interface MisplacementAnalysis {
  item: InventoryItem
  isMisplaced: boolean
  priority: 'high' | 'medium' | 'low'
  confidence: number
  currentShelfUnit: string
  currentRank: number
  suggestedShelfUnit: string | null
  suggestedRank: number
  suggestedLocation: string
  rankDifference: number
  neighbors: {
    before: { partNumber: string; location: string } | null
    after: { partNumber: string; location: string } | null
  }
  explanation: string
}

// A single move instruction in a reorganization plan
export interface MoveInstruction {
  id: string
  partNumber: string
  fromLocation: string
  toLocation: string
  priority: 'high' | 'medium' | 'low'
  sequence: number
  completed: boolean
}

// Complete reorganization plan
export interface ReorganizationPlan {
  id: string
  name: string
  createdAt: Date
  moves: MoveInstruction[]
  summary: {
    totalMoves: number
    shelvesAffected: number
    estimatedMinutes: number
    highPriority: number
    mediumPriority: number
    lowPriority: number
  }
  completedMoves: number
  warnings: string[]
}

// Shelf statistics for learning
export interface ShelfStats {
  shelfUnit: string
  medianPartNumber: number
  partNumberRange: { min: number; max: number }
  itemCount: number
  rank: number
  confidence: number
}
