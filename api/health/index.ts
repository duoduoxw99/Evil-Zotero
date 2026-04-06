import '../../server/env.js'
import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  applyCors,
  handleCorsPreflightIfNeeded,
} from '../../server/vercelHttp.js'

export default function handler(req: VercelRequest, res: VercelResponse): void {
  if (handleCorsPreflightIfNeeded(req, res)) return
  applyCors(req, res)
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' })
    return
  }
  res.status(200).json({ ok: true })
}
