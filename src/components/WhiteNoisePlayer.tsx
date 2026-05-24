import React, { useState, useEffect, useRef } from 'react';
import { 
  VolumeX, 
  CloudRain, 
  Trees, 
  BookOpen, 
  Waves, 
  Flame, 
  Sparkles, 
  Activity, 
  Volume2, 
  Music,
  Pause,
  Play
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  AMBIENT_SOUNDS, 
  WhiteNoiseType, 
  playWhiteNoise, 
  stopWhiteNoise, 
  setWhiteNoiseVolume 
} from '../utils/whiteNoise';
import { playClick } from '../utils/audio';
import { TimerMode } from '../types';

// Dynamic Safely-Mapped Icons corresponding to whiteNoise ambient database
const IconMap: Record<string, React.ComponentType<any>> = {
  VolumeX,
  CloudRain,
  Trees,
  BookOpen,
  Waves,
  Flame,
  Sparkles,
  Activity
};

interface WhiteNoisePlayerProps {
  systemVolume: number; // Volume fallback for UI clicks etc.
  isRunning: boolean;
  mode: TimerMode;
}

export default function WhiteNoisePlayer({ systemVolume, isRunning, mode }: WhiteNoisePlayerProps) {
  const [activeType, setActiveType] = useState<WhiteNoiseType>('none');
  const [volume, setVolume] = useState<number>(0.3);
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const wasFocusingRef = useRef<boolean>(false);

  // Restore previous white noise state from localStorage safely (for comforting UX)
  useEffect(() => {
    try {
      const savedType = localStorage.getItem('pomodoro_white_noise_type') as WhiteNoiseType;
      const savedVolume = localStorage.getItem('pomodoro_white_noise_vol');
      
      if (savedVolume) {
        const parsedVol = parseFloat(savedVolume);
        setVolume(parsedVol);
        setWhiteNoiseVolume(parsedVol);
      }

      if (savedType && savedType !== 'none') {
        setActiveType(savedType);
        // Play automatically if user wants to keep context, or wait for them to toggle
        // To respect browser autoplay policy, we'll configure state but let user play first-click,
        // or let's start playing straight away if browser allows
        playWhiteNoise(savedType, savedVolume ? parseFloat(savedVolume) : 0.3);
      }
    } catch (e) {
      console.warn('Could not restore white noise cache:', e);
    }

    // Clean up sounds when component unmouunts
    return () => {
      stopWhiteNoise();
    };
  }, []);

  // Auto-stop white noise when user cancels, pauses, or completes active focus state
  useEffect(() => {
    const isCurrentlyFocusing = isRunning && mode === 'focus';
    if (wasFocusingRef.current && !isCurrentlyFocusing && activeType !== 'none') {
      stopWhiteNoise();
      setActiveType('none');
      localStorage.setItem('pomodoro_white_noise_type', 'none');
    }
    wasFocusingRef.current = isCurrentlyFocusing;
  }, [isRunning, mode, activeType]);

  // Handle a noise grid element being selected/toggled
  const handleSoundToggle = (type: WhiteNoiseType) => {
    playClick(systemVolume);
    if (activeType === type) {
      // Toggle off if clicking the active one
      stopWhiteNoise();
      setActiveType('none');
      localStorage.setItem('pomodoro_white_noise_type', 'none');
    } else {
      setActiveType(type);
      playWhiteNoise(type, volume);
      localStorage.setItem('pomodoro_white_noise_type', type);
    }
  };

  // Handle Volume Change slider interaction
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    setWhiteNoiseVolume(newVol);
    localStorage.setItem('pomodoro_white_noise_vol', String(newVol));
  };

  const activeSoundInfo = AMBIENT_SOUNDS.find(s => s.id === activeType);

  return (
    <div 
      id="white-noise-panel-card" 
      className="bg-white rounded-3xl p-5 md:p-6 border border-morandi-sand shadow-sm mt-6 text-left relative overflow-hidden transition-all-custom"
    >
      {/* Dynamic Colored Glow based on noise filter */}
      <AnimatePresence>
        {activeType !== 'none' && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.12 }}
            exit={{ opacity: 0 }}
            className={`absolute inset-0 pointer-events-none transition-colors duration-700 ${
              activeType === 'rain' ? 'bg-morandi-sage-light' :
              activeType === 'forest' ? 'bg-morandi-slate-light' :
              activeType === 'library' ? 'bg-morandi-rose-light' :
              activeType === 'ocean' ? 'bg-sky-50' : 'bg-morandi-sand-light'
            }`}
          />
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between z-10 relative mb-4">
        <div className="flex items-center space-x-2">
          <div className={`p-2 rounded-xl ${activeType !== 'none' ? 'bg-morandi-sage text-white animate-pulse' : 'bg-morandi-sand-light text-morandi-charcoal/50'}`}>
            <Music className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-serif text-sm font-semibold text-morandi-charcoal">
              专注白噪音机
            </h3>
            <p className="text-[10px] text-morandi-charcoal/40 font-light">
              声音合成技术 · 隔绝周围繁杂
            </p>
          </div>
        </div>

        {/* Animated Sound Spectrum (Shows when actively playing) */}
        {activeType !== 'none' && (
          <div className="flex items-end space-x-[2px] h-3 ml-2" title="播放中">
            <motion.div animate={{ height: [4, 12, 4] }} transition={{ duration: 0.8, repeat: Infinity, ease: 'easeInOut' }} className="w-[3px] bg-morandi-sage rounded-full" />
            <motion.div animate={{ height: [2, 10, 2] }} transition={{ duration: 0.5, repeat: Infinity, ease: 'easeInOut', delay: 0.15 }} className="w-[3px] bg-morandi-sage rounded-full" />
            <motion.div animate={{ height: [5, 14, 5] }} transition={{ duration: 0.9, repeat: Infinity, ease: 'easeInOut', delay: 0.3 }} className="w-[3px] bg-morandi-sage rounded-full" />
            <motion.div animate={{ height: [3, 8, 3] }} transition={{ duration: 0.6, repeat: Infinity, ease: 'easeInOut', delay: 0.05 }} className="w-[3px] bg-morandi-sage rounded-full" />
          </div>
        )}
      </div>

      {/* Grid of Sound Toggles */}
      <div className="grid grid-cols-4 gap-2 z-10 relative">
        {AMBIENT_SOUNDS.map((sound) => {
          const IconComponent = IconMap[sound.icon] || VolumeX;
          const isActive = activeType === sound.id;

          return (
            <button
              key={sound.id}
              id={`sound-select-btn-${sound.id}`}
              onClick={() => handleSoundToggle(sound.id)}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all cursor-pointer group ${
                isActive 
                  ? 'bg-morandi-sage border-morandi-sage text-white shadow-xs' 
                  : 'bg-morandi-sand-light/40 hover:bg-morandi-sand-light border-morandi-sand/30 text-morandi-charcoal/70 hover:text-morandi-charcoal'
              }`}
              title={sound.description}
            >
              <div className={`p-1.5 rounded-lg mb-1 group-hover:scale-110 transition-transform ${
                isActive ? 'bg-white/20 text-white' : 'text-morandi-charcoal/60'
              }`}>
                <IconComponent className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="text-[10px] font-medium tracking-tight whitespace-nowrap block truncate w-full">
                {sound.jpName.replace('!', '')}
              </span>
            </button>
          );
        })}
      </div>

      {/* Expanded control details & volume slider */}
      {activeType !== 'none' && activeSoundInfo && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="mt-4 pt-4 border-t border-morandi-sand/30 z-10 relative flex flex-col space-y-3"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-6">
              <span className="text-[10px] uppercase font-bold text-morandi-sage tracking-wider">
                正在播放
              </span>
              <h4 className="font-serif text-xs font-semibold text-morandi-charcoal mt-0.5">
                {activeSoundInfo.jpName} <span className="font-sans text-[10px] text-morandi-charcoal/40 font-light">({activeSoundInfo.name})</span>
              </h4>
              <p className="text-[10px] text-morandi-charcoal/50 leading-relaxed mt-1 font-light">
                {activeSoundInfo.description}
              </p>
            </div>
            
            <button
              id="white-noise-pause-btn"
              onClick={() => handleSoundToggle(activeType)}
              className="p-2 rounded-full bg-morandi-rose/10 text-morandi-rose hover:bg-morandi-rose/20 cursor-pointer self-center"
              title="暂停白噪音"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Volume Slider */}
          <div className="flex items-center space-x-2 bg-morandi-sand-light/30 p-2.5 rounded-xl border border-morandi-sand/10">
            <Volume2 className="w-3.5 h-3.5 text-morandi-charcoal/40" />
            <input
              id="white-noise-volume-slider"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
              className="w-full accent-morandi-sage bg-morandi-sand h-1 rounded-lg cursor-pointer appearance-none outline-none"
              title="白噪音独立音量"
            />
            <span className="text-[9px] font-mono font-medium text-morandi-charcoal/50 w-6 text-right">
              {Math.round(volume * 100)}%
            </span>
          </div>
        </motion.div>
      )}
    </div>
  );
}
