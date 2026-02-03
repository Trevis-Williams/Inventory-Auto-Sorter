# Inventory Tracker

A web-based inventory tracking application that allows you to upload CSV files, automatically map columns, and manage your inventory in a spreadsheet-like interface.

## Features

- **CSV Upload with Auto-Detection**: Drag-and-drop or select CSV files. The app automatically detects columns for Location, FBPN (Part Number), and Item Type using fuzzy matching.
- **Column Mapping**: Preview and adjust column mappings before importing data.
- **Spreadsheet View**: Edit inventory directly in an Excel-like grid powered by AG Grid.
- **Numerical Sorting**: FBPN column is sorted numerically for easy part number ordering.
- **Inline Editing**: Click any cell to edit values.
- **Filtering & Sorting**: Filter and sort by any column.
- **Data Persistence**: All data is stored locally in your browser (IndexedDB) - no server required.
- **CSV Export**: Export your inventory back to CSV at any time.

## Getting Started

### Prerequisites

- Node.js 18+ installed

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### Build for Production

```bash
npm run build
```

The built files will be in the `dist` folder, ready to deploy to any static hosting service.

## Usage

1. **Upload a CSV**: Drag and drop a CSV file onto the upload area, or click to select a file.
2. **Map Columns**: Review the auto-detected column mappings. Adjust if needed using the dropdowns.
3. **Import**: Click "Import Data" to add the items to your inventory.
4. **Edit**: Click any cell in the grid to edit values. Changes are saved automatically.
5. **Add Rows**: Use the "Add Row" button to add new inventory items.
6. **Delete**: Select rows and click "Delete Selected", or use the Delete button on individual rows.
7. **Export**: Click "Export CSV" to download your inventory as a CSV file.

## Tech Stack

- **React 18** + **TypeScript** - Modern, type-safe frontend
- **Vite** - Fast development and build tooling
- **AG Grid Community** - Powerful spreadsheet functionality
- **Papa Parse** - Robust CSV parsing
- **Dexie.js** - IndexedDB wrapper for local storage
- **Tailwind CSS** - Utility-first styling

## Data Model

Each inventory item contains:
- `location` - Storage location (e.g., "A1", "Warehouse B")
- `fbpn` - Part number (sorted numerically)
- `itemType` - Item category or description

## License

MIT
