import './env.js'
import cors from 'cors'
import express from 'express'
import {
  ensureAiSession,
  quotaAllowsCall,
  quotaRemaining,
  recordSuccessfulAiCall,
} from './aiQuota.js'
import {
  checkOpenAiKeyHealth,
  hasOpenAiCredential,
  logOpenAiStartupDiagnostics,
  requestGlobalPaperInsight,
  requestOpenAiAnalysis,
  requestSelectionInterpretation,
} from './openai.js'

const PORT = Number.parseInt(process.env.PORT || '8787', 10)

console.log('has key:', !!process.env.OPENAI_API_KEY)
console.log('base url:', process.env.OPENAI_BASE_URL || 'default')

logOpenAiStartupDiagnostics()

if (!hasOpenAiCredential()) {
  console.warn(
    '[zotero-agent-api] OPENAI_API_KEY is not set or empty after trim; /api/ai/* will return 503 until configured.',
  )
}

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
app.set('trust proxy', 1)
app.use(
  cors({
    origin: parseAllowedOrigins(),
    credentials: true,
  }),
)
app.use(express.json({ limit: '2mb' }))

function assertOpenAiConfigured(res: express.Response): boolean {
  if (!hasOpenAiCredential()) {
    res.status(503).json({
      error:
        'AI 服务未配置：服务器缺少有效的 OPENAI_API_KEY（去掉引号与 Bearer 前缀后仍为空）。请在项目根目录配置 .env / .env.local 并重启。',
    })
    return false
  }
  return true
}

async function runAiJsonRoute(
  req: express.Request,
  res: express.Response,
  work: () => Promise<object>,
): Promise<void> {
  const sid = ensureAiSession(req, res)
  if (!quotaAllowsCall(sid)) {
    res.status(429).json({
      error: '您在本浏览器中的 AI 调用次数已达上限（每用户最多 10 次）。',
      quotaExceeded: true,
      remaining: 0,
    })
    return
  }
  if (!assertOpenAiConfigured(res)) return
  try {
    const result = await work()
    recordSuccessfulAiCall(sid)
    res.setHeader('X-AI-Quota-Remaining', String(quotaRemaining(sid)))
    res.json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'AI request failed'
    // 勿用 message.includes('OPENAI_API_KEY')：401 等用户提示里也会包含该字样，会被误替换为笼统文案。
    const safe =
      message === 'OPENAI_KEY_NOT_CONFIGURED'
        ? 'AI 服务暂时不可用：未读取到有效的 OPENAI_API_KEY，请检查项目根目录 .env / .env.local 并重启 dev。'
        : message
    res.status(502).json({ error: safe })
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

/** 用当前 OPENAI_API_KEY 探测上游（先 /v1/me，否则 /v1/models）；返回脱敏错误信息 */
app.get('/api/health/openai', async (_req, res) => {
  const result = await checkOpenAiKeyHealth()
  res.status(result.ok ? 200 : 503).json(result)
})

app.post('/api/ai/paper-insights', async (req, res) => {
  const paperText = req.body?.paperText
  if (typeof paperText !== 'string') {
    res.status(400).json({ error: 'paperText (string) required' })
    return
  }
  await runAiJsonRoute(req, res, () => requestOpenAiAnalysis(paperText))
})

app.post('/api/ai/global-insight', async (req, res) => {
  const paperText = req.body?.paperText
  if (typeof paperText !== 'string') {
    res.status(400).json({ error: 'paperText (string) required' })
    return
  }
  await runAiJsonRoute(req, res, () => requestGlobalPaperInsight(paperText))
})

app.post('/api/ai/selection', async (req, res) => {
  const quote = req.body?.quote
  if (typeof quote !== 'string') {
    res.status(400).json({ error: 'quote (string) required' })
    return
  }
  await runAiJsonRoute(req, res, () => requestSelectionInterpretation(quote.trim()))
})

app.listen(PORT, () => {
  console.log(`[zotero-agent-api] listening on http://localhost:${PORT}`)
})
