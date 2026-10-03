'use strict';
// healthCheck — chờ backend sẵn sàng qua GET /api/health (endpoint Phase 10; KHÔNG tạo cơ chế thứ hai).

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function makeError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

async function probeOnce(url, fetchImpl, requestTimeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const res = await fetchImpl(url, { signal: controller.signal });
    if (!res.ok) return false;
    const body = await res.json();
    return body && body.ok === true && body.database === 'ok';
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Poll tới khi ok=true. Có timeout (không treo vô hạn). isAlive() cho phép bỏ cuộc sớm nếu tiến trình chết.
async function waitForHealth({
  baseUrl,
  timeoutMs = 30000,
  intervalMs = 150,
  requestTimeoutMs = 1500,
  isAlive = () => true,
  fetchImpl = globalThis.fetch,
}) {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/health`;
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!isAlive()) throw makeError('BACKEND_EXITED', 'Tiến trình backend đã thoát trước khi sẵn sàng.');
    if (await probeOnce(url, fetchImpl, requestTimeoutMs)) return true;
    await sleep(intervalMs);
  }
  throw makeError('BACKEND_START_TIMEOUT', `Backend không sẵn sàng sau ${timeoutMs}ms.`);
}

module.exports = { waitForHealth, makeError };
