import '../../server/env.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { requestSelectionInterpretation } from '../../server/openai.js'
import {
  applyCors,
  executeAiRoute,
  handleCorsPreflightIfNeeded,
} from '../../server/vercelHttp.js'

export const config = {
  api: { bodyParser: { sizeLimit: '2mb' } },
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (handleCorsPreflightIfNeeded(req, res)) return
  applyCors(req, res)
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const quote = (req.body as { quote?: unknown })?.quote
  if (typeof quote !== 'string') {
    res.status(400).json({ error: 'quote (string) required' })
    return
  }
  await executeAiRoute(req, res, () => requestSelectionInterpretation(quote.trim()))
}
