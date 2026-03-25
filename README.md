# Zotero Agent — Research Library Prototype

Frontend-only prototype that mimics a Zotero-like research library UI for validating a future AI research reading tool.

## Tech Stack

- React 18 + Vite
- TypeScript
- Tailwind CSS
- No backend, database, or auth

## Run

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## Build

```bash
npm run build
npm run preview
```

## Features

- **Library view**: Dark Zotero-style shell with sidebar (libraries/collections), paper table, right toolbar, tag panel, and a draggable "Spicy" button (bottom-right by default).
- **Spicy mode**: Click the floating button to open a bottom panel (placeholder chat + module cards). Click again to close. Button is draggable; position is kept for the session.
- **Reader view**: Double-click a paper to open. Left: **real PDF rendering (pdf.js)** with scrolling, per-page text extraction, quote→page matching, and approximate highlight overlays. Use **Open PDF…** to load a local file, or put files under `public/pdfs/` to match each paper’s `pdfPath` (e.g. `/pdfs/paper-1.pdf`). Right: insight cards; click/hover still drive scroll + highlight using matched quote text when possible, otherwise fallback to the card’s page number.

## Mock Data

- 10 preloaded papers in `src/data/mockPapers.ts`.
- Each has `id`, `title`, `creator`, `date`, `publication`, `collection`, `tags`, `pdfPath`, and `insights` (citation-linked interpretations).

## Component Structure

- `AppShell` — layout and global state
- `TopMenuBar`, `TabBar`, `SidebarCollections`, `PaperTable`, `RightToolbar`, `TagPanel`
- `FloatingSpicyButton`, `BottomSpicyPanel`
- `ReaderLayout`, `PdfViewer`, `ReaderRightPanel`, `InsightPanel`, `InsightCard`
