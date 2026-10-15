import { useCallback, useEffect, useRef, useState } from 'react';

// Only the latest resource/request may publish a result into an open modal.
export default function useAiAnalysis(isOpen, resourceId, analyze, fallbackMessage) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);
  const requestRef = useRef(null);

  const handleRunAnalysis = useCallback(async () => {
    if (!resourceId) return;
    requestRef.current?.abort();
    const controller = new AbortController();
    requestRef.current = controller;
    setLoading(true);
    setAnalysis(null);
    setError(null);
    setIsCached(false);
    try {
      const result = await analyze(resourceId, { signal: controller.signal });
      if (!controller.signal.aborted) {
        setAnalysis(result.data);
        setIsCached(Boolean(result.isCached));
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        const messages = {
          AI_NOT_CONFIGURED: 'Chưa cấu hình AI. Hãy mở Thiết lập AI để kết nối Gemini.',
          AI_RATE_LIMIT: 'Gemini đang quá tải hoặc đạt giới hạn lượt gọi. Vui lòng thử lại sau.',
          AI_TIMEOUT: 'AI phản hồi quá lâu. Vui lòng thử lại.',
        };
        setError(messages[err.errorCode] || err.message || fallbackMessage);
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [resourceId, analyze, fallbackMessage]);

  useEffect(() => {
    if (isOpen && resourceId) {
      void handleRunAnalysis();
    } else {
      setLoading(false);
      setAnalysis(null);
      setError(null);
      setIsCached(false);
    }
    return () => requestRef.current?.abort();
  }, [isOpen, resourceId, handleRunAnalysis]);

  return { loading, analysis, error, isCached, handleRunAnalysis };
}
