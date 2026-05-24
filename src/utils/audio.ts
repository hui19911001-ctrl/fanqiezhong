/**
 * Serene, minimalist sound synthesis for POMODORO using Web Audio API
 */
export function playChime(volume: number = 0.5) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    const now = ctx.currentTime;
    
    // Low pass filter to make it sound warmer and rounder (Nordic minimalist tone)
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3000, now);
    filter.connect(ctx.destination);

    // Chime 1 (Warm Root Note)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, now); // C5 principal note for warmth
    
    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.3 * volume, now + 0.01);
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.9);
    
    osc1.connect(gain1);
    gain1.connect(filter);
    
    // Chime 2 (Crystal overtone)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, now + 0.08); // G5 (Perfect fifth) for clean brightness
    
    gain2.gain.setValueAtTime(0, now + 0.08);
    gain2.gain.linearRampToValueAtTime(0.2 * volume, now + 0.09);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.2);
    
    osc2.connect(gain2);
    gain2.connect(filter);

    // Chime 3 (Soft sparkle)
    const osc3 = ctx.createOscillator();
    const gain3 = ctx.createGain();
    osc3.type = 'sine';
    osc3.frequency.setValueAtTime(1046.50, now + 0.16); // C6 (Octave higher)
    
    gain3.gain.setValueAtTime(0, now + 0.16);
    gain3.gain.linearRampToValueAtTime(0.12 * volume, now + 0.17);
    gain3.gain.exponentialRampToValueAtTime(0.0001, now + 0.7);
    
    osc3.connect(gain3);
    gain3.connect(filter);
    
    // Start all components
    osc1.start(now);
    osc1.stop(now + 1.0);
    
    osc2.start(now + 0.08);
    osc2.stop(now + 1.3);

    osc3.start(now + 0.16);
    osc3.stop(now + 0.9);
  } catch (error) {
    console.warn("Could not preview audio chime:", error);
  }
}

/**
 * Plays a discrete, soft ambient click sound for tactical button interaction.
 */
export function playClick(volume: number = 0.2) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1200, now);
    osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
    
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(volume * 0.1, now + 0.002);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(now);
    osc.stop(now + 0.06);
  } catch (e) {
    // Fail silently for subtle interaction sounds
  }
}
