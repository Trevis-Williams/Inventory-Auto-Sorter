export interface InventoryItem {
  id: string
  location: string
  fbpn: string
  itemType: string
  createdAt: Date
  updatedAt: Date
}

export interface NewInventoryItem {
  location: string
  fbpn: string
  itemType: string
}

export interface ParsedCSV {
  headers: string[]
  data: Record<string, string>[]
}

export interface ColumnMapping {
  location: string
  fbpn: string
  itemType: string
}

export interface ColumnMatch {
  field: keyof ColumnMapping
  header: string
  score: number
}

// Parsed FBPN structure (e.g., "24-000328" -> prefix: "24", number: 328)
export interface ParsedFBPN {
  original: string
  prefix: string
  number: number
  isValid: boolean
}

// Sequence analysis for a single item
export interface SequenceAnalysis {
  id: string
  fbpn: string
  location: string
  itemType: string
  isOutOfOrder: boolean
  expectedBefore: string | null  // FBPN that should come before in global sequence
  expectedAfter: string | null   // FBPN that should come after in global sequence
  actualBefore: string | null    // Actual FBPN before at this location
  actualAfter: string | null     // Actual FBPN after at this location
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

// Map of FBPN prefix to location counts
export interface PrefixLocationMap {
  [prefix: string]: LocationCount[]
}

// Placement suggestion result
export interface PlacementSuggestion {
  fbpn: string
  isValid: boolean
  suggestedLocation: string | null
  confidence: number  // 0-100 percentage
  totalSimilarItems: number
  beforeFBPN: string | null  // FBPN that should come before
  afterFBPN: string | null   // FBPN that should come after
  alternativeLocations: LocationCount[]  // Other possible locations
  existsInInventory: boolean  // Whether this FBPN already exists
  existingLocation: string | null  // Location if it already exists
}

// Statistics for a single location (learned from data)
export interface LocationStats {
  location: string
  itemCount: number
  fbpnValues: number[]  // Numeric values of FBPNs for calculations
  medianFBPN: number    // Median FBPN value (for ordering)
  meanFBPN: number      // Mean FBPN value
  stdDev: number        // Standard deviation of FBPN values
  minFBPN: number       // Lowest FBPN at this location
  maxFBPN: number       // Highest FBPN at this location
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
  deviationFromMedian: number  // How far the FBPN is from location's median
  expectedLocationRank: number // Where this FBPN should be based on its value
  actualLocationRank: number   // Where this FBPN actually is
  suggestion: string           // Human-readable suggestion
}

// Enhanced inventory analysis with learning info
export interface EnhancedInventoryAnalysis extends InventoryAnalysis {
  learnedOrder: LearnedShelfOrder
  enhancedOutOfOrderItems: EnhancedSequenceAnalysis[]
}
