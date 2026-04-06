import '../../server/env.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { checkOpenAiKeyHealth } from '../../server/openai.js'
import {
  applyCors,
  handleCorsPreflightIfNeeded,
} from '../../server/vercelHttp.js'

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  if (handleCorsPreflightIfNeeded(req, res)) return
  applyCors(req, res)
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  const result = await checkOpenAiKeyHealth()
  res.status(result.ok ? 200 : 503).json(result)
}
