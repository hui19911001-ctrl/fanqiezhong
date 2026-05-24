import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, RotateCcw, Coffee, Target, Volume2, Plus, Minus, Settings, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TimerMode, PomodoroSettings } from '../types';
import { playChime, playClick } from '../utils/audio';

interface TimerProps {
  activeTaskTitle: string | null;
  onPomodoroComplete: (mode: TimerMode, customDurationMinutes?: number) => void;
  onPomodoroCompleteEarly?: (mode: TimerMode, elapsedMinutes: number) => void;
  settings: PomodoroSettings;
  setSettings: (settings: PomodoroSettings) => void;
  showToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  // Lifted state props
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  mode: TimerMode;
  setMode: React.Dispatch<React.SetStateAction<TimerMode>>;
}

export default function Timer({
  activeTaskTitle,
  onPomodoroComplete,
  onPomodoroCompleteEarly,
  settings,
  setSettings,
  showToast,
  timeLeft,
  setTimeLeft,
  isRunning,
  setIsRunning,
  mode,
  setMode,
}: TimerProps) {
  const [showSettings, setShowSettings] = useState<boolean>(false);

  // States for direct keyboard numeric minutes entry
  const [isEditingMinutes, setIsEditingMinutes] = useState<boolean>(false);
  const [directMinutesInput, setDirectMinutesInput] = useState<string>('');

  // Buffer state for settings editing
  const [tempFocusTime, setTempFocusTime] = useState<number>(settings.focusTime);
  const [tempBreakTime, setTempBreakTime] = useState<number>(settings.breakTime);
  const [tempLongBreakTime, setTempLongBreakTime] = useState<number>(settings.longBreakTime);
  const [tempAutoStart, setTempAutoStart] = useState<boolean>(settings.autoStartNext);

  const [isOvertime, setIsOvertime] = useState<boolean>(false);
  const [overtimeSeconds, setOvertimeSeconds] = useState<number>(0);
  const [isOvertimeChoiceOpen, setIsOvertimeChoiceOpen] = useState<boolean>(false);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const endTimeRef = useRef<number | null>(null);

  // Keep lastTimeLeftRef synchronized with the state
  const lastTimeLeftRef = useRef<number>(timeLeft);
  useEffect(() => {
    lastTimeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Keep references to props stable to prevent restarting interval
  const onPomodoroCompleteRef = useRef(onPomodoroComplete);
  useEffect(() => {
    onPomodoroCompleteRef.current = onPomodoroComplete;
  }, [onPomodoroComplete]);

  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Helper to sync endTime ref and localStorage simultaneously
  const updateEndTime = (newEndTime: number | null) => {
    endTimeRef.current = newEndTime;
    if (newEndTime) {
      localStorage.setItem('pomodoro_running_end_time', String(newEndTime));
      localStorage.setItem('pomodoro_running_state', 'true');
      localStorage.setItem('pomodoro_running_mode', mode);
    } else {
      localStorage.removeItem('pomodoro_running_end_time');
      localStorage.removeItem('pomodoro_running_state');
      localStorage.removeItem('pomodoro_running_mode');
    }
  };

  // On mount, recover the absolute end time from localStorage if currently running
  useEffect(() => {
    const storedEndTime = localStorage.getItem('pomodoro_running_end_time');
    const storedIsRunning = localStorage.getItem('pomodoro_running_state');
    if (storedEndTime && storedIsRunning === 'true') {
      const parsedEndTime = parseInt(storedEndTime, 10);
      endTimeRef.current = parsedEndTime;
      
      const now = Date.now();
      if (now > parsedEndTime && mode === 'focus') {
        setIsOvertime(true);
        setOvertimeSeconds(Math.round((now - parsedEndTime) / 1000));
        setTimeLeft(0);
      }
    }
  }, [mode]);

  // Handle mode adjustments or resetting times when settings change
  useEffect(() => {
    if (!isRunning) {
      if (mode === 'focus') {
        setTimeLeft(settings.focusTime * 60);
      } else if (mode === 'break') {
        setTimeLeft(settings.breakTime * 60);
      } else if (mode === 'longBreak') {
        setTimeLeft(settings.longBreakTime * 60);
      }
    }
  }, [settings.focusTime, settings.breakTime, settings.longBreakTime, mode]);

  // Handle core counting tick using high-precision absolute timestamps (sleep/throttle proof)
  useEffect(() => {
    if (isRunning) {
      // Establish absolute target completion timestamp if we do not already have one
      let targetEndTime = endTimeRef.current;
      if (!targetEndTime) {
        targetEndTime = Date.now() + lastTimeLeftRef.current * 1000;
        updateEndTime(targetEndTime);
      }

      timerRef.current = setInterval(() => {
        const now = Date.now();
        if (now < targetEndTime) {
          const remaining = Math.max(0, Math.round((targetEndTime - now) / 1000));
          
          if (remaining !== lastTimeLeftRef.current) {
            setTimeLeft(remaining);
          }
          if (isOvertime) {
            setIsOvertime(false);
          }
        } else {
          // Absolute countdown target has reached/passed
          const elapsedOvertime = Math.round((now - targetEndTime) / 1000);
          
          if (mode === 'focus') {
            // Enter overtime!
            if (!isOvertime) {
              setIsOvertime(true);
              playChime(settingsRef.current.soundVolume);
              showToast?.("专注时间到！已进入超额累积状态 ✨", "info");
            }
            setOvertimeSeconds(elapsedOvertime);
            if (lastTimeLeftRef.current !== 0) {
              setTimeLeft(0);
            }
          } else {
            // Break modes complete instantly/auto-switch
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            updateEndTime(null);
            setIsRunning(false);
            
            playChime(settingsRef.current.soundVolume);
            onPomodoroCompleteRef.current(mode);
            
            // Auto transition to focus
            setMode('focus');
            setTimeLeft(settingsRef.current.focusTime * 60);
            
            if (settingsRef.current.autoStartNext) {
              setTimeout(() => {
                setIsRunning(true);
              }, 1000);
            }
          }
        }
      }, 200); // 200ms tick granularity ensures perfect accuracy
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (!isOvertime) {
        updateEndTime(null);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRunning, mode, isOvertime]);

  // Handle visibility & focus events to synchronize with absolute target time instantly upon wake/unlock
  useEffect(() => {
    const syncTimerOnWake = () => {
      if (isRunning && endTimeRef.current) {
        const now = Date.now();
        const targetEndTime = endTimeRef.current;
        if (now < targetEndTime) {
          const remaining = Math.max(0, Math.round((targetEndTime - now) / 1000));
          setTimeLeft(remaining);
          setIsOvertime(false);
        } else {
          if (mode === 'focus') {
            setIsOvertime(true);
            setOvertimeSeconds(Math.round((now - targetEndTime) / 1000));
            setTimeLeft(0);
          } else {
            setTimeLeft(0);
          }
        }
      }
    };

    document.addEventListener('visibilitychange', syncTimerOnWake);
    window.addEventListener('focus', syncTimerOnWake);

    return () => {
      document.removeEventListener('visibilitychange', syncTimerOnWake);
      window.removeEventListener('focus', syncTimerOnWake);
    };
  }, [isRunning, mode]);

  // Dynamic Browser Tab Countdown & Tomato Style Web Favicon
  useEffect(() => {
    const formatted = formatTime(timeLeft);
    const modeLabel = mode === 'focus' ? '专注中' : mode === 'break' ? '短休息中' : '长休息中';
    
    // 1. Update browser tab title
    if (isRunning) {
      if (isOvertime) {
        document.title = `[超时 +${formatTime(overtimeSeconds)}] 慢专注`;
      } else {
        document.title = `${formatted} (${modeLabel})`;
      }
    } else if (isOvertime) {
      document.title = `[超时 +${formatTime(overtimeSeconds)}] 已暂停`;
    } else {
      document.title = `慢专注 · 番茄钟`;
    }

    // 2. High-fidelity Vector SVG Tomato Favicon for premium browser experience
    const updateFavicon = () => {
      let fLink = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!fLink) {
        fLink = document.createElement('link');
        fLink.rel = 'icon';
        document.head.appendChild(fLink);
      }
      
      const tomatoSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <rect x="48" y="12" width="4" height="18" rx="1.5" fill="#10B981" />
          <path d="M50 20 C56 12 70 18 64 26 C58 32 52 25 50 20 Z" fill="#10B981" />
          <ellipse cx="50" cy="58" rx="36" ry="32" fill="#EF4444" />
          <ellipse cx="38" cy="46" rx="8" ry="4" transform="rotate(-15 38 46)" fill="#FFFFFF" fill-opacity="0.4" />
        </svg>
      `;

      const breakSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <path d="M50 15 C75 15 85 45 61 75 C45 95 25 80 25 60 C25 35 35 15 50 15 Z" fill="#10B981" />
          <path d="M30 65 Q45 50 55 25" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" fill="none" opacity="0.4" />
        </svg>
      `;

      const staticTomatoSvg = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
          <rect x="48" y="12" width="4" height="18" rx="1.5" fill="#10B981" />
          <path d="M50 20 C56 12 70 18 64 26 C58 32 52 25 50 20 Z" fill="#10B981" />
          <ellipse cx="50" cy="58" rx="36" ry="32" fill="#EF4444" />
          <ellipse cx="38" cy="46" rx="8" ry="4" transform="rotate(-15 38 46)" fill="#FFFFFF" fill-opacity="0.5" />
        </svg>
      `;

      const activeSvg = isRunning 
        ? (mode === 'focus' ? tomatoSvg : breakSvg)
        : staticTomatoSvg;

      const normalizedSvg = activeSvg.replace(/\s+/g, ' ').trim();
      fLink.href = `data:image/svg+xml,${encodeURIComponent(normalizedSvg)}`;
    };

    try {
      updateFavicon();
    } catch (e) {
      console.warn("Favicon system update bypassed:", e);
    }

  }, [timeLeft, mode, isRunning, isOvertime, overtimeSeconds]);

  // Utility actions
  const toggleTimer = () => {
    playClick(settings.soundVolume);
    if (isOvertime) {
      // In overtime: play/pause is treated as completing/settling the session!
      setIsRunning(false);
      setIsOvertimeChoiceOpen(true);
    } else {
      setIsRunning(!isRunning);
    }
  };

  const handleSettleOvertime = (includeOvertime: boolean) => {
    playClick(settings.soundVolume);
    setIsOvertimeChoiceOpen(false);
    setIsOvertime(false);
    
    const overtimeMins = overtimeSeconds / 60;
    const finalMinutes = includeOvertime 
      ? settings.focusTime + parseFloat(overtimeMins.toFixed(1))
      : settings.focusTime;
      
    setOvertimeSeconds(0);
    updateEndTime(null);
    setIsRunning(false);

    // Transition to break mode
    const nextMode: TimerMode = 'break';
    setMode(nextMode);
    setTimeLeft(settings.breakTime * 60);

    // Call callback with absolute focus minutes computed!
    if (onPomodoroComplete) {
      onPomodoroComplete(mode, finalMinutes);
    }
    
    showToast?.(`完美完成专注！已为您记入 ${finalMinutes} 分钟专注时长 🌟`, "success");

    if (settings.autoStartNext) {
      setTimeout(() => {
        setIsRunning(true);
      }, 1000);
    }
  };

  const resetTimer = () => {
    playClick(settings.soundVolume);
    setIsRunning(false);
    setIsOvertime(false);
    setIsOvertimeChoiceOpen(false);
    setOvertimeSeconds(0);
    updateEndTime(null);
    
    if (mode === 'focus') {
      setTimeLeft(settings.focusTime * 60);
    } else if (mode === 'break') {
      setTimeLeft(settings.breakTime * 60);
    } else if (mode === 'longBreak') {
      setTimeLeft(settings.longBreakTime * 60);
    }
  };

  const finishEarly = () => {
    playClick(settings.soundVolume);
    const elapsedSeconds = totalDuration - timeLeft;
    const elapsedMinutes = elapsedSeconds / 60;
    
    if (elapsedSeconds < 1) {
      showToast?.("专注时间太短了（不足 1 秒），暂时不计入总时间喔 🧘‍♂️", "info");
      resetTimer();
      return;
    }

    if (onPomodoroCompleteEarly) {
      onPomodoroCompleteEarly(mode, elapsedMinutes);
    }
    
    showToast?.(`已提前结束，成功累计 ${parseFloat(elapsedMinutes.toFixed(1))} 分钟专注时长 🌿`, "success");
    
    setIsRunning(false);
    
    // Switch settings and set next segment
    const nextMode = 'break';
    setMode(nextMode);
    
    const nextDuration = settings.breakTime * 60;
    setTimeLeft(nextDuration);
    
    if (settings.autoStartNext) {
      setTimeout(() => {
        setIsRunning(true);
      }, 1000);
    }
  };

  const manualSwitchMode = (newMode: TimerMode) => {
    if (isRunning || isOvertime) {
      const confirmSwitch = window.confirm("当前计时器正在运行中，确定要切换模式吗？这会清除当前专注进度哦 🍃");
      if (!confirmSwitch) return;
    }
    
    playClick(settings.soundVolume);
    setIsRunning(false);
    setIsOvertime(false);
    setIsOvertimeChoiceOpen(false);
    setOvertimeSeconds(0);
    updateEndTime(null);
    
    setMode(newMode);
    if (newMode === 'focus') {
      setTimeLeft(settings.focusTime * 60);
    } else if (newMode === 'break') {
      setTimeLeft(settings.breakTime * 60);
    } else if (newMode === 'longBreak') {
      setTimeLeft(settings.longBreakTime * 60);
    }
  };

  const adjustMinutes = (amount: number) => {
    playClick(settings.soundVolume);
    setTimeLeft((prev) => {
      const adjustment = amount * 60;
      const calculated = prev + adjustment;
      const finalSecs = calculated > 0 ? calculated : 10;
      // If we are currently running, adjust absolute target finish timestamp too
      if (isRunning) {
        updateEndTime(Date.now() + finalSecs * 1000);
      }
      return finalSecs;
    });
  };

  const handleDirectMinutesSubmit = () => {
    setIsEditingMinutes(false);
    const val = parseInt(directMinutesInput, 10);
    if (isNaN(val) || val <= 0) {
      showToast?.("请输入有效的正整数分钟喔 🧘‍♂️", "error");
      return;
    }
    if (val > 180) {
      showToast?.("专注时间最长为 180 分钟喔！", "error");
      return;
    }

    const nextSeconds = val * 60;
    setTimeLeft(nextSeconds);

    // Sync settings so it updates globally
    if (mode === 'focus') {
      setSettings({ ...settings, focusTime: val });
    } else if (mode === 'break') {
      setSettings({ ...settings, breakTime: val });
    } else if (mode === 'longBreak') {
      setSettings({ ...settings, longBreakTime: val });
    }

    // If running, shift the target absolute timestamp
    if (isRunning) {
      updateEndTime(Date.now() + nextSeconds * 1000);
    }
    showToast?.(`已成功调整时间为 ${val} 分钟 ✨`, "success");
  };

  // Convert seconds to readable MM:SS
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const formattedMins = mins.toString().padStart(2, '0');
    const formattedSecs = secs.toString().padStart(2, '0');
    return `${formattedMins}:${formattedSecs}`;
  };

  // Circular calculations
  const totalDuration = mode === 'focus' 
    ? settings.focusTime * 60 
    : mode === 'break' 
      ? settings.breakTime * 60 
      : settings.longBreakTime * 60;
  const progressPercentage = ((totalDuration - timeLeft) / totalDuration) * 100;
  
  // Circle path specifications: Radius = 120, Circumference = 2 * PI * 120 approx 753.98
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (timeLeft / totalDuration) * circumference;

  // Open settings drawer/modal helper
  const openSettings = () => {
    playClick(settings.soundVolume);
    setTempFocusTime(settings.focusTime);
    setTempBreakTime(settings.breakTime);
    setTempLongBreakTime(settings.longBreakTime);
    setTempAutoStart(settings.autoStartNext);
    setShowSettings(true);
  };

  const saveSettings = () => {
    playClick(settings.soundVolume);
    setSettings({
      focusTime: Math.max(1, Math.min(tempFocusTime, 120)),
      breakTime: Math.max(1, Math.min(tempBreakTime, 60)),
      longBreakTime: Math.max(1, Math.min(tempLongBreakTime, 60)),
      autoStartNext: tempAutoStart,
      soundVolume: settings.soundVolume,
    });
    setShowSettings(false);
  };

  const playTestSound = () => {
    playChime(settings.soundVolume);
  };

  return (
    <div id="pomodoro-timer-card" className="bg-white rounded-3xl p-6 md:p-8 border border-morandi-sand shadow-sm flex flex-col items-center justify-between text-center relative overflow-hidden transition-all-custom">
      {/* Decorative Mode Ambient Glow Background */}
      <div 
        className={`absolute -top-32 -left-32 w-64 h-64 rounded-full blur-3xl opacity-20 pointer-events-none transition-all-custom ${
          mode === 'focus' ? 'bg-morandi-sage' : 'bg-morandi-rose'
        }`} 
      />
      <div 
        className={`absolute -bottom-32 -right-32 w-64 h-64 rounded-full blur-3xl opacity-15 pointer-events-none transition-all-custom ${
          mode === 'focus' ? 'bg-morandi-sage' : 'bg-morandi-rose'
        }`} 
      />

      {/* Mode Switch Pills */}
      <div id="mode-switch-container" className="flex items-center space-x-1 border border-morandi-sand/30 bg-morandi-sand-light p-1.5 rounded-full z-10 w-fit mb-4 select-none">
        <button
          id="mode-focus-btn"
          onClick={() => manualSwitchMode('focus')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all-custom cursor-pointer ${
            mode === 'focus'
              ? 'bg-morandi-sage text-white shadow-sm'
              : 'text-morandi-charcoal/60 hover:text-morandi-charcoal hover:bg-morandi-sand/30'
          }`}
        >
          <Target className="w-3.5 h-3.5" />
          <span>专注 {settings.focusTime}m</span>
        </button>
        <button
          id="mode-break-btn"
          onClick={() => manualSwitchMode('break')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all-custom cursor-pointer ${
            mode === 'break'
              ? 'bg-morandi-rose text-white shadow-sm'
              : 'text-morandi-charcoal/60 hover:text-morandi-charcoal hover:bg-morandi-sand/30'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>短休息 {settings.breakTime}m</span>
        </button>
        <button
          id="mode-long-break-btn"
          onClick={() => manualSwitchMode('longBreak')}
          className={`flex items-center space-x-1 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all-custom cursor-pointer ${
            mode === 'longBreak'
              ? 'bg-morandi-rose text-white shadow-sm'
              : 'text-morandi-charcoal/60 hover:text-morandi-charcoal hover:bg-morandi-sand/30'
          }`}
        >
          <Coffee className="w-3.5 h-3.5" />
          <span>长休息 {settings.longBreakTime}m</span>
        </button>
      </div>

      {/* Linked Task Context Header */}
      <div id="linked-task-display" className="h-6 mb-4 z-10 w-full flex justify-center items-center">
        <AnimatePresence mode="wait">
          {mode === 'focus' ? (
            <motion.div
              key={activeTaskTitle || 'idle'}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              transition={{ duration: 0.25 }}
              className="text-xs text-morandi-charcoal/70 flex items-center space-x-1"
            >
              <div className={`w-1.5 h-1.5 rounded-full ${isRunning ? 'animate-pulse bg-morandi-sage' : 'bg-morandi-sand'}`} />
              <span className="truncate max-w-[240px]">
                {activeTaskTitle ? `专注目标：${activeTaskTitle}` : '选择一个待办任务以专注 🎯'}
              </span>
            </motion.div>
          ) : (
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 5 }}
              className="text-xs text-morandi-rose font-medium flex items-center space-x-1"
            >
              <Coffee className="w-3.5 h-3.5 animate-bounce" />
              <span>{mode === 'break' ? '放松呼吸，起来喝杯水、伸个懒腰吧 ☕' : '长休息阶段，闭目养神、散下步吧 🌳'}</span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* SVG Circular Countdown Gauge */}
      <div id="timer-countdown-gauge" className="relative select-none flex items-center justify-center my-4 z-10">
        <svg className="w-72 h-72 transform -rotate-90">
          {/* Background Track Circle */}
          <circle
            cx="144"
            cy="144"
            r={radius}
            className="stroke-morandi-sand-light"
            strokeWidth="8"
            fill="transparent"
          />
          {/* Active Colored Progress Path */}
          <motion.circle
            cx="144"
            cy="144"
            r={radius}
            className={`transition-all-custom ${
              isOvertime
                ? 'stroke-amber-500 animate-pulse'
                : mode === 'focus'
                  ? 'stroke-morandi-sage'
                  : 'stroke-morandi-rose'
            }`}
            strokeWidth="8"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
          />
        </svg>

        {/* Digital Time Reading & State Label */}
        <div className="absolute flex flex-col items-center justify-center w-56">
          {isOvertimeChoiceOpen ? (
            <div className="flex flex-col items-center bg-white/95 px-4 py-3 rounded-2xl border border-amber-200 shadow-xl z-30 space-y-2 select-none animate-in fade-in zoom-in-95 duration-200">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-widest">专注结算登记 🌿</span>
              <p className="text-[10px] text-morandi-charcoal/80 text-center leading-relaxed">
                原定：<span className="font-mono text-morandi-sage font-semibold">{settings.focusTime} 分钟</span>
                <br />
                超时：<span className="font-mono text-amber-600 font-semibold">+{parseFloat((overtimeSeconds / 60).toFixed(1))} 分钟</span>
              </p>
              
              <div className="flex flex-col space-y-1.5 w-full pt-1">
                <button
                  className="w-full py-1.5 px-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-[10px] font-medium transition-colors shadow-2xs cursor-pointer"
                  onClick={() => handleSettleOvertime(true)}
                >
                  包含超时：{(settings.focusTime + overtimeSeconds / 60).toFixed(1)}分钟
                </button>
                <button
                  className="w-full py-1.5 px-3 bg-morandi-sage hover:bg-morandi-sage-hover text-white rounded-lg text-[10px] font-medium transition-colors shadow-2xs cursor-pointer"
                  onClick={() => handleSettleOvertime(false)}
                >
                  仅计原定：{settings.focusTime}分钟
                </button>
                <button
                  className="w-full py-1 text-center text-morandi-charcoal/50 hover:text-morandi-charcoal text-[9px] hover:bg-morandi-sand/30 rounded transition-colors cursor-pointer"
                  onClick={() => {
                    playClick(settings.soundVolume);
                    setIsOvertimeChoiceOpen(false);
                    setIsRunning(true);
                    // Re-align absolute target completion timestamp with current overtime offset so ticking is seamless
                    const restoredTargetEndTime = Date.now() - overtimeSeconds * 1000;
                    updateEndTime(restoredTargetEndTime);
                  }}
                >
                  返回超时计时 {`↩`}
                </button>
              </div>
            </div>
          ) : isEditingMinutes ? (
            <div className="flex flex-col items-center bg-white/95 px-3 py-2 rounded-2xl border border-morandi-sand shadow-lg z-20">
              <input
                id="direct-time-input"
                type="number"
                min="1"
                max="180"
                value={directMinutesInput}
                onChange={(e) => setDirectMinutesInput(e.target.value)}
                onBlur={handleDirectMinutesSubmit}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleDirectMinutesSubmit();
                  if (e.key === 'Escape') setIsEditingMinutes(false);
                }}
                className="w-16 text-center font-mono text-3xl font-light bg-transparent border-b border-morandi-sage text-morandi-charcoal focus:outline-none focus:border-morandi-rose font-medium"
                autoFocus
                title="输入分钟后按下 Enter 确定"
              />
              <span className="text-[9px] text-morandi-charcoal/40 mt-1 select-none font-sans">确认 (Enter) 🌿</span>
            </div>
          ) : (
            <button
              id="timer-countdown-text-btn"
              onClick={() => {
                if (isOvertime) {
                  setIsRunning(false);
                  setIsOvertimeChoiceOpen(true);
                } else {
                  setDirectMinutesInput(String(Math.floor(timeLeft / 60)));
                  setIsEditingMinutes(true);
                }
              }}
              className="group/time flex flex-col items-center justify-center focus:outline-none cursor-pointer"
              title={isOvertime ? "点击完成结算专注" : "点击时间可直接键盘打字修改时间"}
            >
              <div className="flex items-center space-x-0.5">
                {isOvertime && (
                  <span className="font-mono text-3xl md:text-3xl font-medium tracking-tighter text-amber-600 animate-pulse mr-1">
                    +
                  </span>
                )}
                <span className={`font-mono text-5xl md:text-6xl font-light tracking-tighter transition-colors duration-200 ${
                  isOvertime 
                    ? 'text-amber-600 font-medium' 
                    : 'text-morandi-charcoal group-hover/time:text-morandi-sage'
                }`}>
                  {isOvertime ? formatTime(overtimeSeconds) : formatTime(timeLeft)}
                </span>
              </div>
              <span className="text-[8px] tracking-wide text-morandi-charcoal/30 group-hover/time:text-morandi-sage uppercase mt-1 transition-all duration-200 flex items-center space-x-1 select-none whitespace-nowrap">
                {isOvertime ? (
                  <span className="text-amber-600 animate-pulse">⏰ 专注中且超时 (点击登记)</span>
                ) : (
                  <span>点击直接打字修改 ⌨️</span>
                )}
              </span>
            </button>
          )}
          <span className="text-[10px] tracking-widest text-morandi-charcoal/40 uppercase mt-2 select-none">
            {isOvertime ? 'Overtime Focus' : mode === 'focus' ? 'Focus Period' : 'Relax Chill'}
          </span>
        </div>

        {/* Adjust Minutes Mini Buttons Left/Right */}
        <div className="absolute -left-12 top-1/2 -translate-y-1/2 flex flex-col space-y-2 opacity-52 md:opacity-75 hover:opacity-100 transition-opacity">
          <button
            id="adjust-minus-btn"
            onClick={() => adjustMinutes(-1)}
            title="减少 1 分钟"
            className="p-1.5 rounded-full bg-morandi-cream border border-morandi-sand hover:bg-morandi-sand-light text-morandi-charcoal/60 hover:text-morandi-charcoal transition-all-custom"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex flex-col space-y-2 opacity-52 md:opacity-75 hover:opacity-100 transition-opacity">
          <button
            id="adjust-plus-btn"
            onClick={() => adjustMinutes(1)}
            title="增加 1 分钟"
            className="p-1.5 rounded-full bg-morandi-cream border border-morandi-sand hover:bg-morandi-sand-light text-morandi-charcoal/60 hover:text-morandi-charcoal transition-all-custom"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Control Action Triggers */}
      <div id="timer-action-controls" className="flex items-center justify-center space-x-4 mt-6 z-10">
        <button
          id="reset-timer-btn"
          onClick={resetTimer}
          title="重置计时器"
          className="p-3.5 rounded-full bg-morandi-sand-light hover:bg-morandi-sand border border-transparent text-morandi-charcoal/70 hover:text-morandi-charcoal transition-all-custom"
        >
          <RotateCcw className="w-5 h-5" />
        </button>

        <button
          id="play-pause-btn"
          onClick={toggleTimer}
          className={`flex items-center justify-center w-16 h-16 rounded-full text-white shadow-md active:scale-95 transition-all-custom ${
            mode === 'focus' 
              ? 'bg-morandi-sage hover:bg-morandi-sage-hover' 
              : 'bg-morandi-rose hover:bg-morandi-rose-hover'
          }`}
        >
          {isRunning ? (
            <Pause className="w-6 h-6 fill-current text-white" />
          ) : (
            <Play className="w-6 h-6 fill-current text-white translate-x-0.5" />
          )}
        </button>

        <button
          id="open-settings-btn"
          onClick={openSettings}
          title="设置时间长度"
          className="p-3.5 rounded-full bg-morandi-sand-light hover:bg-morandi-sand border border-transparent text-morandi-charcoal/70 hover:text-morandi-charcoal transition-all-custom"
        >
          <Settings className="w-5 h-5" />
        </button>
      </div>

      {/* Early Complete or Settle Overtime button */}
      {isOvertime ? (
        <motion.button
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: [1, 1.03, 1], opacity: 1 }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
          id="settle-overtime-btn"
          onClick={() => {
            playClick(settings.soundVolume);
            setIsRunning(false);
            setIsOvertimeChoiceOpen(true);
          }}
          className="mt-3 px-6 py-2.5 rounded-full text-sm font-semibold bg-amber-500 text-white shadow-md hover:bg-amber-600 transition-all-custom flex items-center space-x-1.5 z-10 select-none cursor-pointer border border-amber-600/30"
        >
          <Check className="w-4 h-4" />
          <span>点击完成专注（+{Math.round(overtimeSeconds / 60)}分钟） 🎯</span>
        </motion.button>
      ) : (
        mode === 'focus' && timeLeft < totalDuration && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            id="early-complete-btn"
            onClick={finishEarly}
            className="mt-3 px-4 py-1.5 rounded-full text-xs font-semibold border border-morandi-sage text-morandi-sage hover:bg-morandi-sage hover:text-white transition-all-custom flex items-center space-x-1 shadow-3xs z-10 select-none cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
            <span>提前完成并记入时间 ✨</span>
          </motion.button>
        )
      )}

      {/* Slider Volume Indicator */}
      <div id="volume-fader" className="flex items-center space-x-2 mt-6 z-10 w-full max-w-[200px]">
        <Volume2 className="w-4 h-4 text-morandi-charcoal/50" />
        <input
          id="volume-slider"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={settings.soundVolume}
          onChange={(e) => setSettings({ ...settings, soundVolume: parseFloat(e.target.value) })}
          title="提示声音量"
          className="w-full accent-morandi-sage bg-morandi-sand-light h-1 rounded-lg cursor-pointer appearance-none outline-none"
        />
        <span className="text-[10px] font-mono text-morandi-charcoal/50 w-5">
          {Math.round(settings.soundVolume * 100)}%
        </span>
      </div>

      {/* Settings Dialog Overlay */}
      <AnimatePresence>
        {showSettings && (
          <div id="settings-dialog-overlay" className="fixed inset-0 bg-black/20 backdrop-blur-xs flex items-center justify-center z-50 p-4">
            <motion.div
              id="settings-dialog-card"
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-[#FAF9F6] border border-morandi-sand rounded-3xl p-6 md:p-8 w-full max-w-sm text-left shadow-lg"
            >
              <h3 className="font-serif text-xl tracking-tight text-morandi-charcoal mb-4 border-b border-morandi-sand pb-2 flex items-center space-x-2">
                <span>时间长度设置</span>
              </h3>

              <div className="space-y-4 mb-6">
                {/* Focus Duration */}
                <div>
                  <label className="text-xs font-medium text-morandi-charcoal/70 block mb-1">
                    专注时长：{tempFocusTime} 分钟
                  </label>
                  <input
                    id="settings-focus-input"
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={tempFocusTime}
                    onChange={(e) => setTempFocusTime(parseInt(e.target.value))}
                    className="w-full accent-morandi-sage bg-morandi-sand-light h-1 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-morandi-charcoal/40 font-mono mt-1">
                    <span>5m</span>
                    <span>25m</span>
                    <span>45m</span>
                    <span>60m</span>
                  </div>
                </div>

                {/* Break Duration */}
                <div>
                  <label className="text-xs font-medium text-morandi-charcoal/70 block mb-1">
                    短休息时长：{tempBreakTime} 分钟
                  </label>
                  <input
                    id="settings-break-input"
                    type="range"
                    min="2"
                    max="30"
                    step="1"
                    value={tempBreakTime}
                    onChange={(e) => setTempBreakTime(parseInt(e.target.value))}
                    className="w-full accent-morandi-rose bg-morandi-sand-light h-1 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-morandi-charcoal/40 font-mono mt-1">
                    <span>2m</span>
                    <span>5m</span>
                    <span>15m</span>
                    <span>30m</span>
                  </div>
                </div>

                {/* Long Break Duration */}
                <div>
                  <label className="text-xs font-medium text-morandi-charcoal/70 block mb-1">
                    长休息时长：{tempLongBreakTime} 分钟
                  </label>
                  <input
                    id="settings-long-break-input"
                    type="range"
                    min="5"
                    max="60"
                    step="5"
                    value={tempLongBreakTime}
                    onChange={(e) => setTempLongBreakTime(parseInt(e.target.value))}
                    className="w-full accent-morandi-rose bg-morandi-sand-light h-1 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-morandi-charcoal/40 font-mono mt-1">
                    <span>5m</span>
                    <span>15m</span>
                    <span>30m</span>
                    <span>60m</span>
                  </div>
                </div>

                {/* Auto start checkbox */}
                <div className="flex items-center justify-between py-2 border-t border-morandi-sand/40">
                  <div>
                    <span className="text-xs font-medium text-morandi-charcoal/80 block">自动开始下个阶段</span>
                    <span className="text-[10px] text-morandi-charcoal/40">计时结束时，不需手动点击即倒数下一轮</span>
                  </div>
                  <button
                    id="auto-start-toggle"
                    type="button"
                    onClick={() => setTempAutoStart(!tempAutoStart)}
                    className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                      tempAutoStart ? 'bg-morandi-sage' : 'bg-morandi-sand'
                    }`}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform ${
                        tempAutoStart ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Sound Check Button */}
                <div className="flex items-center justify-between py-1 border-t border-morandi-sand/40">
                  <span className="text-xs font-medium text-morandi-charcoal/80">测试提示铃声</span>
                  <button
                    id="sound-test-btn"
                    type="button"
                    onClick={playTestSound}
                    className="text-xs text-morandi-sage font-medium hover:text-morandi-sage-hover bg-morandi-slate-light px-3 py-1.5 rounded-full transition-all"
                  >
                    播放测试音 🔊
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div id="settings-dialog-footer" className="flex items-center space-x-2 justify-end">
                <button
                  id="settings-cancel-btn"
                  onClick={() => {
                    playClick(settings.soundVolume);
                    setShowSettings(false);
                  }}
                  className="px-4 py-2 text-xs font-medium text-morandi-charcoal/60 hover:text-morandi-charcoal transition-all-custom rounded-full"
                >
                  取消
                </button>
                <button
                  id="settings-save-btn"
                  onClick={saveSettings}
                  className="px-5 py-2 text-xs font-medium bg-morandi-sage hover:bg-morandi-sage-hover text-white rounded-full transition-all-custom flex items-center space-x-1 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>保存设置</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
