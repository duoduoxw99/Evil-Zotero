/**
 * OpenAI calls — server-only. Key from process.env.OPENAI_API_KEY.
 * Prompts mirror the former client-side provider for identical behavior.
 */

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

function getModel(): string {
  return process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini'
}

function getApiKey(): string {
  const key = process.env.OPENAI_API_KEY?.trim()
  if (!key) throw new Error('Missing OPENAI_API_KEY in server environment')
  return key
}

function extractJson(content: string): string {
  const trimmed = content.trim()
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) return trimmed

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced?.[1]) return fenced[1].trim()

  const start = trimmed.indexOf('{')
  const end = trimmed.lastIndexOf('}')
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1)
  return trimmed
}

async function chatJson(
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
): Promise<string> {
  const apiKey = getApiKey()
  const model = getModel()
  const response = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
    }),
  })

  if (!response.ok) {
    const errText = await response.text().catch(() => '')
    throw new Error(`OpenAI request failed: ${response.status}${errText ? ` ${errText.slice(0, 200)}` : ''}`)
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }
  const content = data.choices?.[0]?.message?.content
  if (!content) throw new Error('Empty model response')
  return content
}

export async function requestOpenAiAnalysis(paperText: string): Promise<Record<string, unknown>> {
  const systemPrompt = 'You are an academic reading assistant.'
  const userPrompt = `Analyze the provided paper text and generate four insight objects.

For each insight produce two interpretations:
- ANGEL MODE: rational, conservative, evidence-first, academically neutral
- DEVIL MODE: reveal subtle hidden tension, infer what the author is strategically pushing against, sharp but evidence-based, avoid exaggeration

Required insights:
1. Main Claim
2. Responds To
3. Quiet Pushback
4. Research Move

Rules:
- quote exact source sentence only
- no invented citations
- no paraphrase in quote
- keep both interpretations concise
- confidence must be exactly one of: high / medium / speculative

Return strict JSON only with this exact schema:
{
  "mainClaim": { "angelText": "", "devilText": "", "quote": "", "page": "", "confidence": "" },
  "respondsTo": { "angelText": "", "devilText": "", "quote": "", "page": "", "confidence": "" },
  "quietPushback": { "angelText": "", "devilText": "", "quote": "", "page": "", "confidence": "" },
  "researchMove": { "angelText": "", "devilText": "", "quote": "", "page": "", "confidence": "" }
}

Paper text:
${paperText}`

  const content = await chatJson(systemPrompt, userPrompt, 0.2)
  try {
    return JSON.parse(extractJson(content)) as Record<string, unknown>
  } catch {
    throw new Error('Failed to parse JSON response')
  }
}

export interface GlobalPaperInsightResult {
  summary: string
  angelText: string
  devilText: string
  confidence: string
}

export async function requestGlobalPaperInsight(paperText: string): Promise<GlobalPaperInsightResult> {
  const userPrompt = `You are an academic reading assistant.

Read the following paper text and produce:
1) summary: a concise overview of the whole paper (2–4 sentences, neutral, evidence-grounded).
2) angelText: rational, conservative, evidence-first interpretation of the paper's overall contribution (2–3 sentences).
3) devilText: reveal hidden assumptions, strategic positioning, or tensions across the paper — sharp but grounded in the text (2–3 sentences).
4) confidence: exactly one of: high / medium / speculative

Return strict JSON only:
{ "summary": "", "angelText": "", "devilText": "", "confidence": "" }

Paper text:
${paperText}`

  const content = await chatJson(
    'You are an academic reading assistant.',
    userPrompt,
    0.25,
  )

  try {
    const parsed = JSON.parse(extractJson(content)) as Partial<GlobalPaperInsightResult>
    const confidence = String(parsed.confidence ?? '').toLowerCase()
    const okConf = ['high', 'medium', 'speculative'].includes(confidence) ? confidence : 'medium'
    return {
      summary: String(parsed.summary ?? '—').trim() || '—',
      angelText: String(parsed.angelText ?? '—').trim() || '—',
      devilText: String(parsed.devilText ?? '—').trim() || '—',
      confidence: okConf,
    }
  } catch {
    throw new Error('Failed to parse JSON response')
  }
}

export interface SelectionInterpretationResult {
  label: string
  angelText: string
  devilText: string
  confidence: string
}

export async function requestSelectionInterpretation(quote: string): Promise<SelectionInterpretationResult> {
  const userPrompt = `You are an academic reading assistant.

The user selected this exact passage from a PDF (do not invent or alter the quote elsewhere):
"""
${quote}
"""

Produce:
- angelText: rational, conservative, evidence-first, academically neutral (1–2 sentences).
- devilText: subtle tension / strategic positioning; sharp but evidence-based; avoid exaggeration (1–2 sentences).
- confidence: exactly one of: high / medium / speculative
- label: very short title (max 8 words) for this selection.

Return strict JSON only:
{ "label": "", "angelText": "", "devilText": "", "confidence": "" }`

  const content = await chatJson(
    'You are an academic reading assistant.',
    userPrompt,
    0.3,
  )

  try {
    const parsed = JSON.parse(extractJson(content)) as Partial<SelectionInterpretationResult>
    const confidence = String(parsed.confidence ?? '').toLowerCase()
    const okConf = ['high', 'medium', 'speculative'].includes(confidence) ? confidence : 'medium'
    return {
      label: String(parsed.label ?? 'Selection'),
      angelText: String(parsed.angelText ?? '—'),
      devilText: String(parsed.devilText ?? '—'),
      confidence: okConf,
    }
  } catch {
    throw new Error('Failed to parse JSON response')
  }
}
