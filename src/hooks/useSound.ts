import { useCallback, useEffect, useRef, useState } from 'react';

/** Procedural ambient sound: candle crackle loop + bell on verdict. Off by default. */
export function useSound() {
  const [on, setOn] = useState(false);
  const ctx = useRef<AudioContext | null>(null);
  const crackle = useRef<{ source: AudioBufferSourceNode; gain: GainNode } | null>(null);

  const getCtx = () => {
    if (!ctx.current) ctx.current = new AudioContext();
    if (ctx.current.state === 'suspended') ctx.current.resume();
    return ctx.current;
  };

  // Start/stop crackle loop
  useEffect(() => {
    if (!on) {
      if (crackle.current) {
        crackle.current.gain.gain.linearRampToValueAtTime(0, (ctx.current?.currentTime ?? 0) + 0.3);
        const src = crackle.current.source;
        setTimeout(() => { try { src.stop(); } catch {} }, 400);
        crackle.current = null;
      }
      return;
    }
    const ac = getCtx();
    // Generate crackle: short bursts of filtered noise
    const rate = ac.sampleRate;
    const dur = 4; // loop length in seconds
    const buf = ac.createBuffer(1, rate * dur, rate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      // Sparse random pops: mostly silence, occasional crackle
      data[i] = Math.random() < 0.003 ? (Math.random() - 0.5) * 0.6 : 0;
    }
    const source = ac.createBufferSource();
    source.buffer = buf;
    source.loop = true;
    // Bandpass to sound like fire
    const bp = ac.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 800;
    bp.Q.value = 0.7;
    const gain = ac.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.12, ac.currentTime + 0.5);
    source.connect(bp).connect(gain).connect(ac.destination);
    source.start();
    crackle.current = { source, gain };

    return () => {
      try { source.stop(); } catch {}
    };
  }, [on]);

  // Clean up on unmount
  useEffect(() => () => {
    try { crackle.current?.source.stop(); } catch {}
    try { ctx.current?.close(); } catch {}
  }, []);

  const bell = useCallback(() => {
    if (!on) return;
    const ac = getCtx();
    const osc = ac.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = 880; // A5
    const gain = ac.createGain();
    gain.gain.setValueAtTime(0.18, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 2.5);
    // Add a second harmonic for richness
    const osc2 = ac.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 1760;
    const gain2 = ac.createGain();
    gain2.gain.setValueAtTime(0.06, ac.currentTime);
    gain2.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 1.8);
    osc.connect(gain).connect(ac.destination);
    osc2.connect(gain2).connect(ac.destination);
    osc.start();
    osc2.start();
    osc.stop(ac.currentTime + 2.5);
    osc2.stop(ac.currentTime + 1.8);
  }, [on]);

  return { soundOn: on, toggleSound: () => setOn((v) => !v), bell };
}
