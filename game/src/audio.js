// Tiny synthesised sound: every effect is an oscillator envelope, no audio files.
export function makeAudio() {
  const audio = { ctx: null, muted: false };
  audio.ensure = () => {
    if (!audio.ctx) {
      try { audio.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { audio.ctx = null; }
    }
    if (audio.ctx && audio.ctx.state === 'suspended') audio.ctx.resume().catch(() => {});
    return audio.ctx;
  };
  function tone(freq, dur, type, vol, slideTo) {
    if (audio.muted) return;
    const ctx = audio.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    gain.gain.setValueAtTime(vol || 0.08, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }
  audio.step = () => tone(140 + Math.random() * 40, 0.05, 'triangle', 0.03);
  audio.pebble = () => { tone(900, 0.08, 'sine', 0.07, 500); };
  audio.clink = () => { tone(1400, 0.12, 'sine', 0.09, 900); tone(2100, 0.08, 'sine', 0.05); };
  audio.pickup = () => { tone(660, 0.1, 'sine', 0.08); setTimeout(() => tone(990, 0.14, 'sine', 0.08), 90); };
  audio.prize = () => { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.16, 'sine', 0.09), i * 90)); };
  audio.alarm = () => { tone(220, 0.5, 'sawtooth', 0.06, 440); tone(440, 0.5, 'sawtooth', 0.04, 220); };
  audio.caught = () => { tone(180, 0.7, 'sawtooth', 0.09, 60); };
  audio.win = () => { [523, 659, 784, 1047, 1319].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.09), i * 110)); };
  audio.click = () => tone(500, 0.05, 'square', 0.04);
  return audio;
}
