import fs from 'node:fs';
import * as pathService from '../services/pathService.js';

let lastMtimeMs = 0;

const LAUNCHER_CONTROLLED_KEYS = new Set([
  'EDUICT_DB_PATH',
  'EDUICT_DATA_DIR',
  'EDUICT_APP_ROOT',
  'EDUICT_RUNTIME',
  'EDUICT_HOST',
  'EDUICT_API_BASE_URL',
  'PORT',
]);

export function loadEnv(force = false) {
  const envPath = pathService.getEnvPath();
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
        // Biến hạ tầng do launcher (Desktop shell/test) điều khiển: .env KHÔNG được ghi đè.
        //  - Desktop runtime: bỏ qua hoàn toàn các khóa này trong .env.
        //  - Web runtime: chỉ dùng giá trị trong .env khi biến chưa được đặt sẵn (hành vi cũ khi chạy thường).
        if (LAUNCHER_CONTROLLED_KEYS.has(key) && (process.env.EDUICT_RUNTIME === 'desktop' || process.env[key])) continue;
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
  const model = (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim();
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
