# Zotero Agent

> An experimental interface for reading academic papers with AI.

## Read like an angel — or like a devil.

Most tools help you *understand* a paper.  
Zotero Agent helps you *interpret* it.

Every paper says something.  
Some papers also *mean* something.

Zotero Agent lets you read both.

![Screenshot](./assets/screenshot.png)
---

## 🧠 How it works

By selecting passages directly from a PDF, you can generate insights that reveal:

- what the author claims  
- and what they might be quietly pushing against  

Switch between:

😇 Angel — "what can be safely defended"  
😈 Devil — "what can be intelligently inferred"

Because good reading isn’t just about clarity —  
it’s about perspective.

## Demo

This repository contains a web-based prototype of a **"virtual Zotero" interface**.

### Try it:

1. Open the app  
2. Double-click the first paper in the library  
3. Select any text in the PDF  
4. Generate insights in the right-side agent panel  

### Current capabilities:

- selection-driven insights  
- Angel / Devil reading modes  
- linked highlights and cards  

---

## Roadmap

This is an early prototype.

Next steps:
- Zotero plugin integration
- persistent research workspace
- improved PDF interaction and annotation
- multi-paper reasoning

The goal is to turn this into a real research tool — not just a demo.


## Tech Stack

- React 18 + Vite + TypeScript + Tailwind
- Express + `tsx` for the API
- pdf.js for in-browser PDF rendering

## Run locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create `.env` in the project root (see `.env.example`):

   ```bash
   cp .env.example .env
   ```

   Set `OPENAI_API_KEY` to your key.

3. Start **API + web** together:

   ```bash
   npm run dev
   ```

   - App: http://localhost:5173  
   - API: http://localhost:8787 (Vite proxies `/api` to this port)

4. Optional: frontend only (AI features will error until the API is running):

   ```bash
   npm run dev:client-only
   ```


