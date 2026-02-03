import { useState, useCallback } from 'react'
import { parseCSV, autoDetectColumns } from '../lib/csvParser'
import { ParsedCSV } from '../types/inventory'

interface FileUploadProps {
  onFileUploaded: (csv: ParsedCSV & { suggestedMapping: ReturnType<typeof autoDetectColumns> }) => void
}

export function FileUpload({ onFileUploaded }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.csv')) {
      setError('Please upload a CSV file')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const parsed = await parseCSV(file)
      if (parsed.headers.length === 0) {
        setError('CSV file appears to be empty or invalid')
        return
      }
      const suggestedMapping = autoDetectColumns(parsed.headers)
      onFileUploaded({ ...parsed, suggestedMapping })
    } catch (err) {
      setError('Failed to parse CSV file')
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }, [onFileUploaded])

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file) {
      handleFile(file)
    }
  }, [handleFile])

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      handleFile(file)
    }
    // Reset input value so same file can be selected again
    e.target.value = ''
  }, [handleFile])

  return (
    <div
      className={`
        border-2 border-dashed rounded-lg p-8 text-center transition-colors
        ${isDragging
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-300 hover:border-gray-400'
        }
        ${isLoading ? 'opacity-50 pointer-events-none' : ''}
      `}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      {isLoading ? (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
          <p className="text-gray-600">Processing file...</p>
        </div>
      ) : (
        <>
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            stroke="currentColor"
            fill="none"
            viewBox="0 0 48 48"
            aria-hidden="true"
          >
            <path
              d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <div className="mt-4">
            <label className="cursor-pointer">
              <span className="text-blue-600 hover:text-blue-500 font-medium">
                Upload a CSV file
              </span>
              <input
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleFileInput}
              />
            </label>
            <span className="text-gray-500"> or drag and drop</span>
          </div>
          <p className="mt-2 text-sm text-gray-500">
            CSV files with inventory data (Location, FBPN, Item Type)
          </p>
        </>
      )}

      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}
