import { useCallback, useEffect, useRef, useState } from 'react';

// Analyse live amplitude in memory. No recorder, upload or audio playback connection.
export default function useRoomMicrophone(sensitivity) {
  const [state, setState] = useState({ status: 'off', level: 0, error: '' });
  const capture = useRef(null); const sequence = useRef(0); const gain = useRef(sensitivity);
  useEffect(() => { gain.current = sensitivity; }, [sensitivity]);
  const dispose = useCallback(() => {
    sequence.current++;
    const resource = capture.current; capture.current = null;
    if (!resource) return;
    clearInterval(resource.timer);
    resource.stream.getTracks().forEach(track => { track.onended = null; track.stop(); });
    resource.source.disconnect(); resource.analyser.disconnect();
    void resource.context.close().catch(() => {});
  }, []);
  const stop = useCallback(() => { dispose(); setState({ status: 'off', level: 0, error: '' }); }, [dispose]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) stop(); };
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', stop);
    return () => { document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', stop); dispose(); };
  }, [dispose, stop]);
  const start = async () => {
    dispose();
    const token = sequence.current;
    setState({ status: 'asking', level: 0, error: '' });
    let stream = null; let context = null;
    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error('Micro cần HTTPS hoặc localhost và quyền truy cập. Bạn vẫn có thể dùng chế độ điều khiển thủ công.');
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) throw new Error('Máy này chưa hỗ trợ đo âm thanh. Hãy dùng điều khiển thủ công.');
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      if (token !== sequence.current || document.hidden) { stream.getTracks().forEach(track => track.stop()); return; }
      context = new Audio(); await context.resume();
      if (token !== sequence.current || document.hidden) { stream.getTracks().forEach(track => track.stop()); await context.close(); return; }
      const source = context.createMediaStreamSource(stream); const analyser = context.createAnalyser();
      analyser.fftSize = 1024; source.connect(analyser);
      const data = new Uint8Array(analyser.fftSize); let smooth = 0;
      const timer = setInterval(() => {
        if (token !== sequence.current) return;
        analyser.getByteTimeDomainData(data);
        let squares = 0; for (const byte of data) squares += ((byte - 128) / 128) ** 2;
        const level = Math.min(100, Math.sqrt(squares / data.length) * 450 * gain.current / 50);
        smooth = smooth * .65 + level * .35;
        setState({ status: 'on', level: Math.round(smooth), error: '' });
      }, 200);
      capture.current = { stream, context, source, analyser, timer };
      stream.getTracks().forEach(track => { track.onended = () => { dispose(); setState({ status: 'off', level: 0, error: 'Micro đã ngắt kết nối. Hãy kết nối lại hoặc dùng điều khiển thủ công.' }); }; });
      setState({ status: 'on', level: 0, error: '' });
    } catch (err) {
      stream?.getTracks().forEach(track => track.stop());
      if (context && context.state !== 'closed') void context.close().catch(() => {});
      if (token !== sequence.current) return;
      const message = err.name === 'NotAllowedError' ? 'Micro chưa được cấp quyền. Bạn có thể bật quyền rồi thử lại, hoặc dùng điều khiển thủ công.' : err.name === 'NotFoundError' ? 'Không tìm thấy micro. Bạn vẫn có thể điều khiển mức âm thanh bằng thanh kéo.' : err.message;
      setState({ status: 'off', level: 0, error: message || 'Chưa kết nối được micro.' });
    }
  };
  return { ...state, start, stop };
}
