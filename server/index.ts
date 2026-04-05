import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import {
  requestGlobalPaperInsight,
  requestOpenAiAnalysis,
  requestSelectionInterpretation,
} from './openai.js'

const PORT = Number.parseInt(process.env.PORT || '8787', 10)

function parseAllowedOrigins(): string[] | true {
  const raw = process.env.AI_ALLOWED_ORIGINS?.trim()
  if (!raw) {
    return [
      'http://localhost:5173',
      'http://127.0.0.1:5173',
      'http://localhost:4173',
      'http://127.0.0.1:4173',
    ]
  }
  if (raw === '*') return true
  return raw.split(',').map((s) => s.trim()).filter(Boolean)
}

const app = express()
app.use(
  cors({
    origin: parseAllowedOrigins(),
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.post('/api/ai/paper-insights', async (req, res) => {
  try {
    const paperText = req.body?.paperText
    if (typeof paperText !== 'string') {
      res.status(400).json({ error: 'paperText (string) required' })
      return
    }
    const result = await requestOpenAiAnalysis(paperText)
    res.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'AI request failed'
    res.status(502).json({ error: message })
  }
})

app.post('/api/ai/global-insight', async (req, res) => {
  try {
    const paperText = req.body?.paperText
    if (typeof paperText !== 'string') {
      res.status(400).json({ error: 'paperText (string) required' })
      return
    }
    const result = await requestGlobalPaperInsight(paperText)
    res.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'AI request failed'
    res.status(502).json({ error: message })
  }
})

app.post('/api/ai/selection', async (req, res) => {
  try {
    const quote = req.body?.quote
    if (typeof quote !== 'string') {
      res.status(400).json({ error: 'quote (string) required' })
      return
    }
    const result = await requestSelectionInterpretation(quote.trim())
    res.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'AI request failed'
    res.status(502).json({ error: message })
  }
})

app.listen(PORT, () => {
  console.log(`[zotero-agent-api] listening on http://localhost:${PORT}`)
})
