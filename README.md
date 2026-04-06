# Zotero Agent

> An experimental interface for reading academic papers with AI.

## Read like an angel — or like a devil.

Most tools help you *understand* a paper.  
Zotero Agent helps you *interpret* it.

Every paper says something.  
Some papers also *mean* something.

Zotero Agent lets you read both.

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

## Architecture

- **Frontend** (React + Vite): calls same-origin `/api/*` only. No OpenAI keys in the browser or in the client bundle.
- **Backend** (`server/`): small Express API that holds `OPENAI_API_KEY` in environment variables and proxies requests to OpenAI.

Safe to push the repo to GitHub: copy `.env.example` → `.env`, add your key locally, and never commit `.env`.

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

## Build & preview

```bash
npm run build
npm run start:api
```

In a second terminal:

```bash
npm run preview
```

`vite preview` proxies `/api` to `127.0.0.1:8787` (same as dev). Keep the API running.

## Deploying publicly

### Vercel (推荐)

- 连接 GitHub 仓库后 **Import** 项目；Vercel 识别 `vercel.json`（Vite + `api/` Serverless）。
- 在 **Settings → Environment Variables** 配置 `OPENAI_API_KEY`（及可选的 `OPENAI_BASE_URL`、`OPENAI_PROJECT`、`HTTPS_PROXY` 等，与 `.env.example` 一致）。
- **不要**为生产前端设置 `VITE_API_BASE_URL`：保持同源，浏览器请求 `/api/...` 由 Vercel Functions 处理，避免 API 404。
- 部署后自检：`GET https://<your-app>.vercel.app/api/health` → `{"ok":true}`；`GET .../api/health/openai` 检测上游密钥（脱敏错误）。
- 本地模拟生产：`npx vercel dev`（`package.json` 中 `npm run dev:vercel`）。

### 其他静态托管 + 自建 API

- **Frontend**: 若 API 与站点不同域，构建时使用 `VITE_API_BASE_URL=https://your-api.example.com`。
- **Backend**: 自行运行 `server/index.ts`（Node + `tsx`），设置 `OPENAI_API_KEY`，并用 `AI_ALLOWED_ORIGINS` 限制 CORS。

生产环境建议在 `/api/ai/*` 前增加鉴权与更强的限流。

## Features

- **Library view**: Dark Zotero-style shell with sidebar, paper table, tags, draggable “Spicy” button.
- **Reader view**: PDF via pdf.js, text selection → insight cards, global analysis, local persistence for saved cards.
- **Open PDF…** or place files under `public/pdfs/` to match each paper’s `pdfPath`.

## Component structure

- `AppShell`, `ReaderLayout`, `PdfViewer`, `ReaderRightPanel`, `InsightPanel`, etc.
- AI: `src/services/*` → `src/provider/openaiProvider.ts` (HTTP to `/api`) → `server/openai.ts` (OpenAI)。Vercel 上由 `api/**` Serverless 调用同一套 `server/openai.ts`。
