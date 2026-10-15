// Abort the client request and release its timer. A remote provider may still
// finish work already accepted; callers must not automatically retry timeouts.
export async function requestWithTimeout(run, timeoutMs) {
  const controller = new AbortController();
  let timer;
  try {
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => { reject(new Error('AI_TIMEOUT')); controller.abort(); }, timeoutMs);
    });
    return await Promise.race([run(controller.signal), timeout]);
  } catch (error) {
    if (controller.signal.aborted) throw new Error('AI_TIMEOUT');
    throw error;
  } finally { clearTimeout(timer); }
}
