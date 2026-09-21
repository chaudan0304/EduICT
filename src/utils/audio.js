// Web Audio API Sound Effects Synthesizer (100% offline, zero network dependencies)

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Bộ tổng hợp tiếng vịt kêu chân thực (Quack Synth)
function playSingleQuack(ctx, startTime, basePitch = 350, duration = 0.22, volume = 0.4) {
  const osc = ctx.createOscillator();
  const mod = ctx.createOscillator();
  const modGain = ctx.createGain();
  const gain = ctx.createGain();
  const filter1 = ctx.createBiquadFilter();
  const filter2 = ctx.createBiquadFilter();

  // FM vibrato tạo độ khàn tự nhiên của tiếng vịt kêu
  mod.type = 'sawtooth';
  mod.frequency.setValueAtTime(48, startTime);
  modGain.gain.setValueAtTime(40, startTime);

  osc.type = 'sawtooth';
  // Độ rớt cao độ đặc trưng của tiếng quạc
  osc.frequency.setValueAtTime(basePitch, startTime);
  osc.frequency.exponentialRampToValueAtTime(basePitch * 0.5, startTime + duration);

  mod.connect(modGain);
  modGain.connect(osc.frequency);

  // Bộ lọc formant âm mũi vịt (nasal resonance)
  filter1.type = 'bandpass';
  filter1.frequency.setValueAtTime(750, startTime);
  filter1.Q.setValueAtTime(3.8, startTime);

  filter2.type = 'peaking';
  filter2.frequency.setValueAtTime(1400, startTime);
  filter2.gain.setValueAtTime(8, startTime);

  gain.gain.setValueAtTime(0.001, startTime);
  gain.gain.linearRampToValueAtTime(volume, startTime + 0.03);
  gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

  osc.connect(filter1);
  filter1.connect(filter2);
  filter2.connect(gain);
  gain.connect(ctx.destination);

  mod.start(startTime);
  osc.start(startTime);
  mod.stop(startTime + duration + 0.03);
  osc.stop(startTime + duration + 0.03);
}

export const soundEffects = {
  // Tiếng vịt kêu cạp cạp (Quack đơn)
  playQuack: (pitch = 350) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      playSingleQuack(ctx, ctx.currentTime, pitch, 0.22, 0.4);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  },

  // Tiếng đàn vịt đồng thanh kêu rộn ràng khi bắt đầu cuộc đua (Flock Quack)
  playFlockQuack: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;
      // Đàn vịt kêu rộn rã khi xuất phát: "Cạp cạp! Quạc quạc! Quạc!"
      playSingleQuack(ctx, now, 380, 0.22, 0.55);
      playSingleQuack(ctx, now + 0.07, 310, 0.24, 0.5);
      playSingleQuack(ctx, now + 0.18, 430, 0.2, 0.52);
      playSingleQuack(ctx, now + 0.3, 340, 0.26, 0.55);
      playSingleQuack(ctx, now + 0.45, 400, 0.22, 0.5);
      playSingleQuack(ctx, now + 0.62, 350, 0.25, 0.52);
      playSingleQuack(ctx, now + 0.78, 380, 0.22, 0.48);
    } catch (e) {
      console.warn('Flock audio failed', e);
    }
  },

  // Tiếng bánh xe quay cạch cạch (Tick)
  playTick: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(850, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.04);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  },

  // Tiếng click chuyển slide nhẹ nhàng
  playClick: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(600, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.03);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.035);
    } catch (e) {
      console.warn('Audio playClick failed', e);
    }
  },

  // Tiếng tăng tốc vọt lên (Boost / Swoosh)
  playBoost: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      const now = ctx.currentTime;
      osc.frequency.setValueAtTime(250, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);

      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  },

  // Tiếng cộng sao / Ting ting (Star Ding)
  playStarDing: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.5]; // C - E - G - C

      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + i * 0.07);

        gain.gain.setValueAtTime(0.18, now + i * 0.07);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + i * 0.07);
        osc.stop(now + i * 0.07 + 0.3);
      });
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  },

  // Khúc nhạc chiến thắng / Fanfare
  playVictory: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const chord = [
        { f: 523.25, t: 0.0, d: 0.15 },
        { f: 659.25, t: 0.12, d: 0.15 },
        { f: 783.99, t: 0.24, d: 0.2 },
        { f: 1046.5, t: 0.45, d: 0.55 },
      ];

      chord.forEach(({ f, t, d }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + t);

        gain.gain.setValueAtTime(0.25, now + t);
        gain.gain.exponentialRampToValueAtTime(0.001, now + t + d);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + t);
        osc.stop(now + t + d + 0.05);
      });
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  },

  // Tiếng chuông hết giờ (Buzzer)
  playBuzzer: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, now);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.linearRampToValueAtTime(0.01, now + 0.5);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.55);
    } catch (e) {
      console.warn('Audio play failed', e);
    }
  },

  // Tiếng chuông báo hết tiết học trường học (School Bell Chime: Bính - Boong - Bính - Boong ngân vang)
  playSchoolBell: () => {
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Giai điệu chuông trường học quen thuộc (E4 - C4 - D4 - G3 / hoặc G4 - E4 - F4 - D4)
      const chimeNotes = [
        { freq: 659.25, time: 0.0, dur: 0.9 },   // E5
        { freq: 523.25, time: 0.7, dur: 0.9 },   // C5
        { freq: 587.33, time: 1.4, dur: 0.9 },   // D5
        { freq: 392.00, time: 2.1, dur: 1.8 }    // G4 (ngân dài)
      ];

      chimeNotes.forEach(({ freq, time, dur }) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + time);

        // Chuông ngân vang tự nhiên
        gain.gain.setValueAtTime(0.35, now + time);
        gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + time);
        osc.stop(now + time + dur);
      });
    } catch (e) {
      console.warn('School bell audio failed', e);
    }
  }
};
