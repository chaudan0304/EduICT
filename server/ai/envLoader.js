import fs from 'node:fs';
import path from 'node:path';

let lastMtimeMs = 0;

export function loadEnv(force = false) {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) return;

  try {
    const stats = fs.statSync(envPath);
    if (!force && stats.mtimeMs === lastMtimeMs) {
      return;
    }
    lastMtimeMs = stats.mtimeMs;

    const content = fs.readFileSync(envPath, 'utf-8');
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        process.env[key] = val;
      }
    }
    console.log('[AI EnvLoader] Đã nạp cấu hình mới nhất từ .env (Mtime:', new Date(stats.mtimeMs).toLocaleTimeString(), ')');
  } catch (e) {
    console.warn('[AI EnvLoader] Không thể nạp .env:', e.message);
  }
}

export function getGeminiConfig() {
  loadEnv();
  const apiKey = (process.env.GEMINI_API_KEY || '').trim();
  const model = (process.env.GEMINI_MODEL || 'gemini-3.6-flash').trim();
  const enabledStr = (process.env.GEMINI_ENABLED || 'true').toLowerCase().trim();
  const enabled = enabledStr !== 'false' && enabledStr !== '0';
  const configured = Boolean(apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE' && apiKey.length > 5);

  return {
    apiKey,
    model,
    enabled,
    configured
  };
}
