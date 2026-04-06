/**
 * Vercel Serverless + CORS / AI 路由共享逻辑（Express 不引用本文件）。
 */

import type { VercelRequest, VercelResponse } from '@vercel/node'
import {
  ensureAiSession,
  quotaAllowsCall,
  quotaRemaining,
  recordSuccessfulAiCall,
} from './aiQuota.js'
import { hasOpenAiCredential } from './openai.js'

export function applyCors(req: VercelRequest, res: VercelResponse): void {
  const raw = process.env.AI_ALLOWED_ORIGINS?.trim()
  const reqOrigin =
    typeof req.headers.origin === 'string' ? req.headers.origin : undefined

  if (raw === '*') {
    res.setHeader('Access-Control-Allow-Origin', '*')
  } else if (raw) {
    const list = raw.split(',').map((s) => s.trim()).filter(Boolean)
    if (reqOrigin && list.includes(reqOrigin)) {
      res.setHeader('Access-Control-Allow-Origin', reqOrigin)
      res.setHeader('Access-Control-Allow-Credentials', 'true')
    }
  } else if (reqOrigin) {
    res.setHeader('Access-Control-Allow-Origin', reqOrigin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*')
  }

  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  res.setHeader('Access-Control-Max-Age', '86400')
}

/** @returns true 若已处理并应结束 */
export function handleCorsPreflightIfNeeded(
  req: VercelRequest,
  res: VercelResponse,
): boolean {
  if (req.method === 'OPTIONS') {
    applyCors(req, res)
    res.status(204).end()
    return true
  }
  return false
}

/** 在已完成 OPTIONS / CORS / 方法校验后调用：配额 + OpenAI + 写回 JSON */
export async function executeAiRoute(
  req: VercelRequest,
  res: VercelResponse,
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

  if (!hasOpenAiCredential()) {
    res.status(503).json({
      error:
        'AI 服务未配置：服务器缺少有效的 OPENAI_API_KEY。请在 Vercel 项目 Environment Variables 中设置。',
    })
    return
  }

  try {
    const result = await work()
    recordSuccessfulAiCall(sid)
    res.setHeader('X-AI-Quota-Remaining', String(quotaRemaining(sid)))
    res.status(200).json(result)
  } catch (e) {
    const message = e instanceof Error ? e.message : 'AI request failed'
    const safe =
      message === 'OPENAI_KEY_NOT_CONFIGURED'
        ? 'AI 服务暂时不可用：未读取到有效的 OPENAI_API_KEY。'
        : message
    res.status(502).json({ error: safe })
  }
}
