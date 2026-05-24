/**
 * Web Audio API synthesizer for offline, zero-dependency ambient white noise.
 * Includes Rain, Forest + Wind, Library, Ocean Waves, Cafe, and standard Raw Noise types.
 */

export type WhiteNoiseType = 'none' | 'rain' | 'forest' | 'library' | 'ocean' | 'brown' | 'pink' | 'white';

export interface AmbientSound {
  id: WhiteNoiseType;
  name: string;
  jpName: string;
  icon: string;
  description: string;
}

export const AMBIENT_SOUNDS: AmbientSound[] = [
  { id: 'none', name: 'Mute', jpName: '无声静音', icon: 'VolumeX', description: '关闭背景白噪音，专注于呼吸。' },
  { id: 'rain', name: 'Rain', jpName: '疗愈雨天', icon: 'CloudRain', description: '细雨拍打窗台的节奏，温柔洗涤思绪。' },
  { id: 'forest', name: 'Forest', jpName: '微风森林', icon: 'Trees', description: '微风拂过林间，伴随偶尔传来的林鸟啼鸣。' },
  { id: 'library', name: 'Library', jpName: '深夜图书馆', icon: 'BookOpen', description: '老旧图书馆的安静气息，夹杂若有若无的书页翻阅声。' },
  { id: 'ocean', name: 'Ocean Waves', jpName: '呼吸海洋', icon: 'Waves', description: '潮水缓缓起伏拍打沙滩，如同悠长的潮汐。' },
  { id: 'brown', name: 'Brown Noise', jpName: '暖意棕噪', icon: 'Flame', description: '低沉浑厚的暖心噪声，阻绝周围一切杂音。' },
  { id: 'pink', name: 'Pink Noise', jpName: '柔和粉噪', icon: 'Sparkles', description: '均衡自然的降噪频率，如同瀑布远端的绵密水声。' },
  { id: 'white', name: 'White Noise', jpName: '经典白噪', icon: 'Activity', description: '阻绝外界随机高低干扰，建立全方位的专注防护。' },
];

let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let currentType: WhiteNoiseType = 'none';
let currentVolume: number = 0.3; // Local channel volume

// Storage for active audio nodes and timers so they can be disposed
interface ActiveEngine {
  sources: AudioScheduledSourceNode[];
  timers: any[];
  nodesToDisconnect: AudioNode[];
}

let activeEngine: ActiveEngine = {
  sources: [],
  timers: [],
  nodesToDisconnect: []
};

// Lazy creation of AudioContext
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  // Try to resume if suspended
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Ensure master gain is initialised
function getMasterGain(ctx: AudioContext): GainNode {
  if (!masterGain) {
    masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(currentVolume, ctx.currentTime);
    masterGain.connect(ctx.destination);
  }
  return masterGain;
}

// Stop current noises completely
export function stopWhiteNoise() {
  // Clear any procedural timers
  activeEngine.timers.forEach((t) => clearTimeout(t));
  activeEngine.timers = [];

  // Stop sound source nodes
  activeEngine.sources.forEach((src) => {
    try {
      src.stop();
    } catch (e) {
      // already stopped or not started
    }
  });
  activeEngine.sources = [];

  // Disconnect remaining filters and LFOs
  activeEngine.nodesToDisconnect.forEach((node) => {
    try {
      node.disconnect();
    } catch (e) {
      // already disconnected
    }
  });
  activeEngine.nodesToDisconnect = [];

  currentType = 'none';
}

// Update runtime channel volume
export function setWhiteNoiseVolume(volume: number) {
  currentVolume = volume;
  const ctx = getAudioContext();
  if (ctx) {
    const gainNode = getMasterGain(ctx);
    // Smooth ramp
    gainNode.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.1);
  }
}

export function getCurrentNoiseType(): WhiteNoiseType {
  return currentType;
}

// Generators for Noise Buffers
function createWhiteNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buffer;
}

function createPinkNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
    data[i] *= 0.11; // normalisation
    b6 = white * 0.115926;
  }
  return buffer;
}

function createBrownNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const bufferSize = 2 * ctx.sampleRate;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0.0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + (0.02 * white)) / 1.02;
    lastOut = data[i];
    data[i] *= 3.5; // normalisation factor
  }
  return buffer;
}

// Set up repeating loop for buffers
function playNoiseBuffer(ctx: AudioContext, buffer: AudioBuffer, targetGainNode: AudioNode): AudioBufferSourceNode {
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;
  source.connect(targetGainNode);
  source.start(0);
  activeEngine.sources.push(source);
  return source;
}

/**
 * Main play trigger function. Handles lazy audio init and builds requested synthesis.
 */
export function playWhiteNoise(type: WhiteNoiseType, volume: number = 0.3) {
  const ctx = getAudioContext();
  if (!ctx) {
    console.warn("AudioContext is not supported on this browser.");
    return;
  }

  // First stop whatever is running
  stopWhiteNoise();

  currentVolume = volume;
  setWhiteNoiseVolume(volume);

  if (type === 'none') {
    return;
  }

  currentType = type;
  const master = getMasterGain(ctx);

  try {
    switch (type) {
      case 'white': {
        const buffer = createWhiteNoiseBuffer(ctx);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(8000, ctx.currentTime);
        filter.connect(master);
        activeEngine.nodesToDisconnect.push(filter);

        playNoiseBuffer(ctx, buffer, filter);
        break;
      }
      case 'pink': {
        const buffer = createPinkNoiseBuffer(ctx);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(6000, ctx.currentTime);
        filter.connect(master);
        activeEngine.nodesToDisconnect.push(filter);

        playNoiseBuffer(ctx, buffer, filter);
        break;
      }
      case 'brown': {
        const buffer = createBrownNoiseBuffer(ctx);
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(2500, ctx.currentTime);
        filter.connect(master);
        activeEngine.nodesToDisconnect.push(filter);

        playNoiseBuffer(ctx, buffer, filter);
        break;
      }
      case 'rain': {
        // Steady warm shower (Pink + Brown combined wash)
        const pinkBuffer = createPinkNoiseBuffer(ctx);
        const rainFilter = ctx.createBiquadFilter();
        rainFilter.type = 'lowpass';
        rainFilter.frequency.setValueAtTime(1400, ctx.currentTime);
        
        const washGain = ctx.createGain();
        washGain.gain.setValueAtTime(0.7, ctx.currentTime);

        rainFilter.connect(washGain);
        washGain.connect(master);
        activeEngine.nodesToDisconnect.push(rainFilter, washGain);

        playNoiseBuffer(ctx, pinkBuffer, rainFilter);

        // Procedural raindrops scheduler
        const triggerRaindrop = () => {
          if (currentType !== 'rain') return;

          const osc = ctx.createOscillator();
          const pGain = ctx.createGain();
          const filterDrop = ctx.createBiquadFilter();

          filterDrop.type = 'bandpass';
          filterDrop.frequency.setValueAtTime(1600 + Math.random() * 2000, ctx.currentTime);
          filterDrop.Q.setValueAtTime(4, ctx.currentTime);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(1200 + Math.random() * 1000, ctx.currentTime);
          osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.04);

          pGain.gain.setValueAtTime(0, ctx.currentTime);
          pGain.gain.linearRampToValueAtTime(0.02 * (Math.random() * 0.45 + 0.55), ctx.currentTime + 0.002);
          pGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.03 + Math.random() * 0.05);

          osc.connect(pGain);
          pGain.connect(filterDrop);
          filterDrop.connect(master);

          osc.start();
          osc.stop(ctx.currentTime + 0.1);

          activeEngine.sources.push(osc);

          // Random time gap to simulate genuine chaotic outdoor raindrops
          const gap = 50 + Math.random() * 200;
          const t = setTimeout(triggerRaindrop, gap);
          activeEngine.timers.push(t);
        };

        triggerRaindrop();
        break;
      }
      case 'forest': {
        // Whistling wind: brown noise modulated by slow LFO sweeping low/mid filter
        const brownBuffer = createBrownNoiseBuffer(ctx);
        const windFilter = ctx.createBiquadFilter();
        windFilter.type = 'bandpass';
        windFilter.Q.setValueAtTime(1.8, ctx.currentTime);
        windFilter.frequency.setValueAtTime(400, ctx.currentTime);

        const windGain = ctx.createGain();
        windGain.gain.setValueAtTime(0.25, ctx.currentTime);

        windFilter.connect(windGain);
        windGain.connect(master);
        activeEngine.nodesToDisconnect.push(windFilter, windGain);

        playNoiseBuffer(ctx, brownBuffer, windFilter);

        // Wind modulation (LFO)
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(0.08, ctx.currentTime); // Slow cycle (~12s)

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(180, ctx.currentTime); // sweep 180hz

        lfo.connect(lfoGain);
        lfoGain.connect(windFilter.frequency);
        lfo.start();

        activeEngine.sources.push(lfo);
        activeEngine.nodesToDisconnect.push(lfoGain);

        // Procedural cozy bird singing chirper scheduler
        const triggerBirdChirp = () => {
          if (currentType !== 'forest') return;

          const now = ctx.currentTime;
          const chirpsCount = Math.floor(Math.random() * 3) + 1;
          let delay = 0;

          for (let i = 0; i < chirpsCount; i++) {
            const osc = ctx.createOscillator();
            const chirpGain = ctx.createGain();
            const toneFilter = ctx.createBiquadFilter();

            toneFilter.type = 'bandpass';
            toneFilter.frequency.setValueAtTime(3000 + Math.random() * 800, now + delay);
            toneFilter.Q.setValueAtTime(2.0, now + delay);

            osc.type = 'sine';
            const baseFreq = 2600 + Math.random() * 600;
            osc.frequency.setValueAtTime(baseFreq, now + delay);
            osc.frequency.exponentialRampToValueAtTime(baseFreq + 1200, now + delay + 0.05);

            chirpGain.gain.setValueAtTime(0, now + delay);
            chirpGain.gain.linearRampToValueAtTime(0.012, now + delay + 0.01);
            chirpGain.gain.exponentialRampToValueAtTime(0.0001, now + delay + 0.06);

            osc.connect(chirpGain);
            chirpGain.connect(toneFilter);
            toneFilter.connect(master);

            osc.start(now + delay);
            osc.stop(now + delay + 0.07);

            activeEngine.sources.push(osc);
            activeEngine.nodesToDisconnect.push(toneFilter, chirpGain);

            delay += 0.1 + Math.random() * 0.08;
          }

          // Gap between pleasant bird arrivals (3.5s to 12s)
          const gap = 3500 + Math.random() * 8500;
          const t = setTimeout(triggerBirdChirp, gap);
          activeEngine.timers.push(t);
        };

        triggerBirdChirp();
        break;
      }
      case 'library': {
        // Constant ultra low-pass filters creating quiet atmosphere ventilation hum
        const pinkBuffer = createPinkNoiseBuffer(ctx);
        const humFilter = ctx.createBiquadFilter();
        humFilter.type = 'lowpass';
        humFilter.frequency.setValueAtTime(140, ctx.currentTime);

        const humGain = ctx.createGain();
        humGain.gain.setValueAtTime(0.4, ctx.currentTime);

        humFilter.connect(humGain);
        humGain.connect(master);
        activeEngine.nodesToDisconnect.push(humFilter, humGain);

        playNoiseBuffer(ctx, pinkBuffer, humFilter);

        // Slow random rustling of paper, desk adjustments, or pages turning
        const triggerLibraryRustle = () => {
          if (currentType !== 'library') return;

          const noiseSource = ctx.createBufferSource();
          noiseSource.buffer = pinkBuffer;

          const rustleFilter = ctx.createBiquadFilter();
          rustleFilter.type = 'bandpass';
          rustleFilter.frequency.setValueAtTime(700 + Math.random() * 1100, ctx.currentTime);
          rustleFilter.Q.setValueAtTime(1.2, ctx.currentTime);

          const rustleGain = ctx.createGain();
          const duration = 0.25 + Math.random() * 0.45;

          rustleGain.gain.setValueAtTime(0, ctx.currentTime);
          rustleGain.gain.linearRampToValueAtTime(0.008 + Math.random() * 0.008, ctx.currentTime + 0.05);
          rustleGain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);

          noiseSource.connect(rustleFilter);
          rustleFilter.connect(rustleGain);
          rustleGain.connect(master);

          noiseSource.start();
          noiseSource.stop(ctx.currentTime + duration + 0.05);

          activeEngine.sources.push(noiseSource);
          activeEngine.nodesToDisconnect.push(rustleFilter, rustleGain);

          // Schedule next library movement (6s to 18s)
          const gap = 6000 + Math.random() * 12000;
          const t = setTimeout(triggerLibraryRustle, gap);
          activeEngine.timers.push(t);
        };

        triggerLibraryRustle();
        break;
      }
      case 'ocean': {
        // Slowly surging waves: high volume lowpass filtered pink noise modulated by sub LFO
        const pinkBuffer = createPinkNoiseBuffer(ctx);
        const waveFilter = ctx.createBiquadFilter();
        waveFilter.type = 'lowpass';
        waveFilter.Q.setValueAtTime(1.1, ctx.currentTime);
        waveFilter.frequency.setValueAtTime(320, ctx.currentTime);

        const waveGain = ctx.createGain();
        waveGain.gain.setValueAtTime(0.5, ctx.currentTime);

        waveFilter.connect(waveGain);
        waveGain.connect(master);
        activeEngine.nodesToDisconnect.push(waveFilter, waveGain);

        playNoiseBuffer(ctx, pinkBuffer, waveFilter);

        // Tide oscillator: super slow sinusoidal breathing wave
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(0.07, ctx.currentTime); // ocean rhythm 14 seconds per splash

        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(190, ctx.currentTime); // sweeping sweep

        lfo.connect(lfoGain);
        lfoGain.connect(waveFilter.frequency);
        lfo.start();

        activeEngine.sources.push(lfo);
        activeEngine.nodesToDisconnect.push(lfoGain);
        break;
      }
    }
  } catch (error) {
    console.error("Failed to play synthesized ambient white noise:", error);
  }
}
