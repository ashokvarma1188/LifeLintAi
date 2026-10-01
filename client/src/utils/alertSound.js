/** A short two-tone beep for new incoming alerts — generated on the fly, no audio asset needed. */
export function playAlertSound() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();

    [880, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, ctx.currentTime);
      const start = ctx.currentTime + i * 0.18;
      gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.16);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.18);
    });

    setTimeout(() => ctx.close(), 600);
  } catch {
    // Audio isn't critical — a muted/blocked context should never break the page.
  }
}
