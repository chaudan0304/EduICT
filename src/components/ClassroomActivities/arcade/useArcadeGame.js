import { useEffect, useRef, useState } from 'react';
import { useActivityState } from '../activityState';
import { createRound, normalizeConfig, validRound } from './arcadeState';
import { soundEffects } from '../../../utils/audio';
import DialogService from '../../../services/DialogService';

export default function useArcadeGame(kind, { storageKey, participants, soundEnabled, onBusyChange }) {
  const initial = { config: normalizeConfig(null, kind), round: null, history: [] };
  const [state, setState] = useActivityState(`${storageKey}:arcade-v2:${kind}`, initial, value => {
    const round = validRound(value?.round, kind) ? value.round : null;
    return { config: normalizeConfig(value?.config, kind), round,
      history: Array.isArray(value?.history) ? value.history.filter(item => validRound(item, kind) && item.id === round?.id).slice(-8) : [] };
  });
  const [motion, setMotion] = useState(null);
  const busy = useRef(false);
  const timers = useRef([]);
  useEffect(() => () => { timers.current.forEach(clearTimeout); onBusyChange(false); }, [onBusyChange]);
  const animate = (action, countdown = false) => {
    if (busy.current) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) { action(); return; }
    busy.current = true; onBusyChange(true); setMotion(countdown ? 3 : 'reveal');
    if (soundEnabled) soundEffects.playClick();
    if (countdown) [2, 1].forEach((number, i) => timers.current.push(setTimeout(() => {
      setMotion(number); if (soundEnabled) soundEffects.playTick();
    }, (i + 1) * 700)));
    timers.current.push(setTimeout(() => {
      action(); setMotion(null); busy.current = false; onBusyChange(false); timers.current = [];
      if (soundEnabled) soundEffects.playStarDing();
    }, countdown ? 2100 : 750));
  };
  const change = action => setState(previous => {
    if (!previous.round) return previous;
    const next = action(previous.round);
    if (next === previous.round) return previous;
    return { ...previous, round: next, history: [...previous.history, previous.round].slice(-8) };
  });
  const start = (extra = {}) => {
    const round = createRound(kind, state.config, participants, extra);
    animate(() => setState(previous => ({ ...previous, round, history: [] })), true);
  };
  const reset = async () => {
    if (busy.current) return;
    if (state.round && !state.round.finished && !await DialogService.confirmAsync('Bắt đầu ván mới? Điểm và tiến độ ván này sẽ được xóa. Sao đã xác nhận vẫn giữ.')) return;
    setState(previous => ({ ...previous, round: null, history: [] }));
  };
  const undo = () => {
    if (busy.current) return;
    setState(previous => previous.history.length ? { ...previous, round: previous.history.at(-1), history: previous.history.slice(0, -1) } : previous);
  };
  return { kind, ...state, motion, busy: motion !== null, isBusy: () => busy.current, change, animate, start, reset, undo,
    setConfig: config => setState(previous => ({ ...previous, config: normalizeConfig(config, kind) })) };
}
