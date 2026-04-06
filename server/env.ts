import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'
import {
  EnvHttpProxyAgent,
  setGlobalDispatcher,
  Socks5ProxyAgent,
} from 'undici'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '..')

/**
 * Load env from project root (not cwd). Both use override: true so values in repo
 * files win over pre-set shell/OS env — avoids stale OPENAI_API_KEY from Windows
 * 用户/系统环境变量盖住 .env 的更新。
 */
dotenv.config({ path: path.join(projectRoot, '.env'), override: true })
dotenv.config({ path: path.join(projectRoot, '.env.local'), override: true })

function parseConnectTimeoutMs(): number {
  const raw = process.env.OPENAI_CONNECT_TIMEOUT_MS?.trim()
  const n = raw ? Number.parseInt(raw, 10) : 60_000
  if (!Number.isFinite(n)) return 60_000
  return Math.min(300_000, Math.max(5_000, n))
}

function socksProxyUrl(): string | undefined {
  const s = process.env.SOCKS5_PROXY?.trim()
  if (s) return s
  const all = process.env.ALL_PROXY?.trim()
  if (all && /^socks5/i.test(all)) return all
  return undefined
}

const connectTimeout = parseConnectTimeoutMs()
const dispatcherOpts = {
  connectTimeout,
  headersTimeout: 300_000,
  bodyTimeout: 300_000,
}

const socks = socksProxyUrl()
if (socks) {
  setGlobalDispatcher(new Socks5ProxyAgent(socks, dispatcherOpts))
  console.log(
    `[zotero-agent-api] Outbound proxy: SOCKS5 (${connectTimeout}ms connect timeout).`,
  )
} else {
  setGlobalDispatcher(new EnvHttpProxyAgent(dispatcherOpts))
  if (process.env.HTTPS_PROXY?.trim() || process.env.HTTP_PROXY?.trim()) {
    console.log(
      `[zotero-agent-api] Outbound proxy: HTTPS_PROXY / HTTP_PROXY (${connectTimeout}ms connect timeout).`,
    )
  } else if (process.env.VERCEL !== '1') {
    console.warn(
      `[zotero-agent-api] No HTTPS_PROXY or SOCKS5_PROXY in .env — using direct connection. If you see "Connect Timeout" to api.openai.com, open Clash/V2Ray and set one of:\n` +
        `  HTTPS_PROXY=http://127.0.0.1:7890   (mixed/HTTP port — check your app)\n` +
        `  SOCKS5_PROXY=socks5://127.0.0.1:7891  (common Clash SOCKS port)\n` +
        `Then restart npm run dev.`,
    )
  }
}
