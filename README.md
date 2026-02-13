# Inventory Auto-Sorter

A browser-based warehouse shelf organizer that imports inventory data, **learns** the correct ordering of items across shelves using statistical analysis, **detects misplaced items**, and **generates step-by-step reorganization plans** to fix them -- all without a server.

**Live Demo:** [https://trevis-williams.github.io/Inventory-Auto-Sorter/](https://trevis-williams.github.io/Inventory-Auto-Sorter/)

## Features

- **CSV Import with Auto-Detection** -- Drag-and-drop CSV files. Columns for location, part number, and item type are automatically detected via fuzzy matching.
- **Pattern Learning** -- Analyzes part number distributions per shelf (medians, standard deviations, z-scores) to build a statistical model of where items belong. Confidence improves as more data is imported.
- **Misplacement Detection** -- Flags items that are likely on the wrong shelf, ranked by priority (high / medium / low) based on how far they deviate from the learned pattern.
- **Placement Suggestions** -- Enter a part number (manually or via barcode scanner) and get ranked suggestions for the best shelf location with confidence percentages and reasoning.
- **Reorganization Planner** -- Generates move-by-move plans to correct all misplaced items, grouped by source shelf for efficiency. Tracks completion with checkboxes and can be exported as CSV, text, or printed.
- **Spreadsheet View** -- Full AG Grid-powered inventory grid with inline editing, filtering, sorting, add/delete rows, and CSV export.
- **Local Storage** -- All data persists in your browser via IndexedDB (Dexie.js). No account or backend needed.

## How It Works

1. **Upload** a CSV containing your inventory (location codes, part numbers, item types).
2. **Map columns** -- review the auto-detected mappings and adjust if needed.
3. **Dashboard** -- view learning confidence, misplaced items by priority, and quick actions.
4. **Inventory tab** -- browse and edit all items in a spreadsheet interface.
5. **Reorganize tab** -- generate, track, and export a reorganization plan to get your shelves in order.

## Getting Started

### Prerequisites

- Node.js 18+

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

The built files will be in the `dist` folder.

## Tech Stack

- **React 18** + **TypeScript** -- Type-safe component-driven UI
- **Vite** -- Fast dev server and production bundler
- **AG Grid Community** -- Spreadsheet-grade data grid
- **Papa Parse** -- Robust CSV parsing
- **Dexie.js** -- IndexedDB wrapper for offline-first local storage
- **Tailwind CSS** -- Utility-first styling
- **html5-qrcode** -- Barcode / QR code scanning via camera
- **GitHub Pages** -- Static hosting via GitHub Actions

## Deployment

This project is configured to deploy automatically to GitHub Pages on every push to the `main` (or `master`) branch via the workflow in `.github/workflows/deploy.yml`.

To enable GitHub Pages for your fork:

1. Go to **Settings > Pages** in your GitHub repository.
2. Under **Build and deployment > Source**, select **GitHub Actions**.
3. Push to `main` and the site will be live at `https://<your-username>.github.io/Inventory-Auto-Sorter/`.

## License

MIT
