import Papa from 'papaparse'
import { ParsedCSV, ColumnMapping, ColumnMatch } from '../types/inventory'

// Keywords that map to each field
const FIELD_KEYWORDS: Record<keyof ColumnMapping, string[]> = {
  location: ['location', 'loc', 'bin', 'warehouse', 'area', 'zone', 'shelf', 'rack', 'position', 'storage'],
  partNumber: ['part', 'part number', 'partnumber', 'part_number', 'sku', 'pn', 'p/n', 'item number', 'itemnumber', 'item_number', 'product number', 'productnumber', 'model', 'code'],
  itemType: ['item type', 'itemtype', 'item_type', 'type', 'category', 'item', 'description', 'desc', 'product', 'name', 'product type', 'producttype', 'class', 'classification'],
}

/**
 * Calculate similarity score between two strings using Levenshtein distance
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = str1.toLowerCase().trim()
  const s2 = str2.toLowerCase().trim()

  // Exact match
  if (s1 === s2) return 1

  // Contains match
  if (s1.includes(s2) || s2.includes(s1)) return 0.8

  // Levenshtein distance
  const matrix: number[][] = []

  for (let i = 0; i <= s1.length; i++) {
    matrix[i] = [i]
  }

  for (let j = 0; j <= s2.length; j++) {
    matrix[0][j] = j
  }

  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        )
      }
    }
  }

  const maxLen = Math.max(s1.length, s2.length)
  return 1 - matrix[s1.length][s2.length] / maxLen
}

/**
 * Find the best matching field for a header
 */
function findBestMatch(header: string, field: keyof ColumnMapping): number {
  const keywords = FIELD_KEYWORDS[field]
  let bestScore = 0

  for (const keyword of keywords) {
    const score = calculateSimilarity(header, keyword)
    if (score > bestScore) {
      bestScore = score
    }
  }

  return bestScore
}

/**
 * Auto-detect column mappings from CSV headers
 */
export function autoDetectColumns(headers: string[]): ColumnMapping {
  const fields: (keyof ColumnMapping)[] = ['location', 'partNumber', 'itemType']
  const matches: ColumnMatch[] = []

  // Calculate scores for all header-field combinations
  for (const header of headers) {
    for (const field of fields) {
      const score = findBestMatch(header, field)
      matches.push({ field, header, score })
    }
  }

  // Sort by score descending
  matches.sort((a, b) => b.score - a.score)

  // Assign best matches, avoiding duplicates
  const result: ColumnMapping = {
    location: headers[0] || '',
    partNumber: headers[1] || '',
    itemType: headers[2] || '',
  }

  const usedHeaders = new Set<string>()
  const usedFields = new Set<keyof ColumnMapping>()

  for (const match of matches) {
    if (!usedHeaders.has(match.header) && !usedFields.has(match.field) && match.score > 0.3) {
      result[match.field] = match.header
      usedHeaders.add(match.header)
      usedFields.add(match.field)
    }
  }

  // Fill any unassigned fields with remaining headers
  const remainingHeaders = headers.filter(h => !usedHeaders.has(h))
  let remainingIndex = 0

  for (const field of fields) {
    if (!usedFields.has(field) && remainingIndex < remainingHeaders.length) {
      result[field] = remainingHeaders[remainingIndex]
      remainingIndex++
    }
  }

  return result
}

/**
 * Parse a CSV file and return headers and data
 */
export function parseCSV(file: File): Promise<ParsedCSV> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const headers = results.meta.fields || []
        const data = results.data as Record<string, string>[]
        resolve({ headers, data })
      },
      error: (error) => {
        reject(error)
      },
    })
  })
}

/**
 * Export inventory items to CSV string
 */
export function exportToCSV(items: { location: string; partNumber: string; itemType: string }[]): string {
  const csvData = items.map(item => ({
    Location: item.location,
    'Part Number': item.partNumber,
    'Item Type': item.itemType,
  }))

  return Papa.unparse(csvData)
}

/**
 * Trigger download of CSV file
 */
export function downloadCSV(csvString: string, filename: string = 'inventory.csv'): void {
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  const url = URL.createObjectURL(blob)

  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.visibility = 'hidden'

  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
}
