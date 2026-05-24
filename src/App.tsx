import React, { useState, useEffect } from 'react';
import { Target, Sparkles, RefreshCw, Feather, BookOpen, User, ChevronDown, ChevronUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, PomodoroSettings, DailyStats, TimerMode } from './types';
import Timer from './components/Timer';
import TodoList from './components/TodoList';
import Stats from './components/Stats';
import { getRandomQuote, Quote } from './utils/quotes';
import { playClick } from './utils/audio';
import LocalBackupAndProfile from './components/LocalBackupAndProfile';
import WhiteNoisePlayer from './components/WhiteNoisePlayer';

// Default preset fallback configurations
const DEFAULT_SETTINGS: PomodoroSettings = {
  focusTime: 25,
  breakTime: 5,
  longBreakTime: 15,
  autoStartNext: false,
  soundVolume: 0.5,
};

const THEMES = [
  { id: 'cream', name: '温柔奶油 🥛', color: 'bg-[#FAF9F5]' },
  { id: 'dark', name: '极客暗夜 🌌', color: 'bg-[#151817]' },
  { id: 'forest', name: '微风森林 🌲', color: 'bg-[#ECF2ED]' },
  { id: 'sakura', name: '初樱软粉 🌸', color: 'bg-[#FAF2F2]' },
  { id: 'ocean', name: '潮汐蔚蓝 🌊', color: 'bg-[#E9EFF2]' }
];

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

export default function App() {
  // 1. Core user states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [settings, setSettings] = useState<PomodoroSettings>(DEFAULT_SETTINGS);
  const [theme, setTheme] = useState<string>('cream');
  
  // Coordinated Timer states (lifted up to App.tsx)
  const [mode, setMode] = useState<TimerMode>('focus');
  const [timeLeft, setTimeLeft] = useState<number>(DEFAULT_SETTINGS.focusTime * 60);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  
  const [stats, setStats] = useState<DailyStats>({
    completedCount: 0,
    totalFocusMinutes: 0,
    lastUpdated: getTodayDateString(),
  });

  // 2. Mindfulness Quote state
  const [quote, setQuote] = useState<Quote>(getRandomQuote());

  // 3. User Feedback Toast notification state
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // 4. Onboarding & Nickname State
  const [username, setUsername] = useState<string>('');
  const [showOnboarding, setShowOnboarding] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>('');

  // 5. Collapse state for top panels (header & local profile backup)
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('pomodoro_header_collapsed') === 'true';
  });

  // Restore states from localStorage on initial mounting
  useEffect(() => {
    try {
      const storedTasks = localStorage.getItem('pomodoro_tasks');
      if (storedTasks) setTasks(JSON.parse(storedTasks));

      const storedSettings = localStorage.getItem('pomodoro_settings');
      let loadedTimeLeft = DEFAULT_SETTINGS.focusTime * 60;
      if (storedSettings) {
        const parsedSettings = JSON.parse(storedSettings);
        const mergedSettings = { ...DEFAULT_SETTINGS, ...parsedSettings };
        setSettings(mergedSettings);
        loadedTimeLeft = mergedSettings.focusTime * 60;
      }

      // Restore active execution from localStorage if a run was interrupted or slept
      const storedEndTime = localStorage.getItem('pomodoro_running_end_time');
      const storedIsRunning = localStorage.getItem('pomodoro_running_state');
      const storedMode = localStorage.getItem('pomodoro_running_mode') as TimerMode | null;

      if (storedEndTime && storedIsRunning === 'true' && storedMode) {
        const endTimeNum = parseInt(storedEndTime, 10);
        const now = Date.now();
        if (now < endTimeNum) {
          const remainingSeconds = Math.max(0, Math.round((endTimeNum - now) / 1000));
          setMode(storedMode);
          setTimeLeft(remainingSeconds);
          setIsRunning(true);
        } else {
          if (storedMode === 'focus') {
            // Restore as active focus overtime!
            setMode('focus');
            setTimeLeft(0);
            setIsRunning(true);
          } else {
            // Interrupted run has finished in real-time, clear cleanly
            localStorage.removeItem('pomodoro_running_end_time');
            localStorage.removeItem('pomodoro_running_state');
            localStorage.removeItem('pomodoro_running_mode');
            setTimeLeft(loadedTimeLeft);
          }
        }
      } else {
        setTimeLeft(loadedTimeLeft);
      }

      const savedTheme = localStorage.getItem('pomodoro_skin');
      if (savedTheme) setTheme(savedTheme);

      const storedStats = localStorage.getItem('pomodoro_stats');
      if (storedStats) {
        const parsedStats: DailyStats = JSON.parse(storedStats);
        const today = getTodayDateString();
        
        // Auto reset stats on day transition
        if (parsedStats.lastUpdated !== today) {
          const freshStats = {
            completedCount: 0,
            totalFocusMinutes: 0,
            lastUpdated: today,
          };
          setStats(freshStats);
          localStorage.setItem('pomodoro_stats', JSON.stringify(freshStats));
        } else {
          setStats(parsedStats);
        }
      }

      // Check for user identity profile onboarding
      const storedUsername = localStorage.getItem('pomodoro_username');
      if (storedUsername) {
        setUsername(storedUsername);
      } else {
        setShowOnboarding(true);
      }
    } catch (e) {
      console.error("Local storage restoration failed:", e);
    }
  }, []);

  // Save states securely to localStorage with hooks
  useEffect(() => {
    localStorage.setItem('pomodoro_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('pomodoro_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('pomodoro_stats', JSON.stringify(stats));
  }, [stats]);

  const handleThemeChange = (newTheme: string) => {
    playClick(settings.soundVolume);
    setTheme(newTheme);
    localStorage.setItem('pomodoro_skin', newTheme);
    showToast(`主题风格已成功设定为：${THEMES.find(t => t.id === newTheme)?.name} ✨`, "success");
  };

  // Handle pomodoro countdown milestone completed
  const handlePomodoroComplete = (mode: TimerMode, customDurationMinutes?: number) => {
    if (mode === 'focus') {
      const minsFocused = customDurationMinutes !== undefined ? customDurationMinutes : settings.focusTime;
      
      // 1. Update overall daily stats
      const updatedStats = {
        ...stats,
        completedCount: stats.completedCount + 1,
        totalFocusMinutes: parseFloat((stats.totalFocusMinutes + minsFocused).toFixed(1)),
        lastUpdated: getTodayDateString(),
      };
      setStats(updatedStats);

      // 2. If focus task was linked, increment its finished tomatoes slice and auto complete it
      if (activeTaskId) {
        setTasks((prevTasks) =>
          prevTasks.map((t) => {
            if (t.id === activeTaskId) {
              const nextPoms = t.completedPoms + 1;
              const nextFocusedMins = parseFloat(((t.focusedMinutes || 0) + minsFocused).toFixed(1));
              return { 
                ...t, 
                completedPoms: nextPoms, 
                completed: true, 
                focusedMinutes: nextFocusedMins 
              };
            }
            return t;
          })
        );
        setActiveTaskId(null);
      }
      
      // 3. Randomize fresh mindfulness quote to cheer them up
      setQuote(getRandomQuote());
    }
  };

  const handlePomodoroCompleteEarly = (mode: TimerMode, elapsedMinutes: number) => {
    if (mode === 'focus' && elapsedMinutes > 0) {
      const parsedMinutes = parseFloat(elapsedMinutes.toFixed(1));
      setStats((prevStats) => {
        const updatedMinutes = prevStats.totalFocusMinutes + parsedMinutes;
        return {
          ...prevStats,
          totalFocusMinutes: parseFloat(updatedMinutes.toFixed(1)),
          lastUpdated: getTodayDateString(),
        };
      });

      // Automatically mark active task as completed and clear active status
      if (activeTaskId) {
        setTasks((prevTasks) =>
          prevTasks.map((t) => {
            if (t.id === activeTaskId) {
              const nextFocusedMins = parseFloat(((t.focusedMinutes || 0) + parsedMinutes).toFixed(1));
              const additionalPoms = Math.max(1, Math.round(parsedMinutes / settings.focusTime));
              const nextPoms = t.completedPoms + additionalPoms;
              return { 
                ...t, 
                completed: true, 
                focusedMinutes: nextFocusedMins,
                completedPoms: nextPoms
              };
            }
            return t;
          })
        );
        setActiveTaskId(null);
      }

      // Randomize mindfulness quote
      setQuote(getRandomQuote());
    }
  };

  const handleResetStats = () => {
    const cleared = {
      completedCount: 0,
      totalFocusMinutes: 0,
      lastUpdated: getTodayDateString(),
    };
    setStats(cleared);
    setTasks((prevTasks) =>
      prevTasks.map((t) => ({
        ...t,
        completed: false,
        completedPoms: 0,
      }))
    );
  };

  const handleSaveOnboardingName = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tempName.trim();
    if (!trimmed) {
      showToast("请输入一个称呼，让我们更好接待您 🧘‍♂️", "error");
      return;
    }
    if (trimmed.length > 20) {
      showToast("称呼请控制在 20 个字以内。", "error");
      return;
    }
    setUsername(trimmed);
    localStorage.setItem('pomodoro_username', trimmed);
    setShowOnboarding(false);
    showToast(`欢迎 ${trimmed}！启动您的慢专注番茄钟 🌱`, "success");
    playClick(settings.soundVolume);
  };

  const refreshQuote = () => {
    playClick(settings.soundVolume);
    setQuote(getRandomQuote());
  };

  // Find active task details
  const activeTask = tasks.find((t) => t.id === activeTaskId);

  return (
    <div data-theme={theme} className="min-h-screen w-full selection:bg-morandi-sage-light text-morandi-charcoal font-sans flex flex-col items-center transition-colors duration-500">
      {/* Upper Subtle Accenting Top Line */}
      <div className="w-full h-1.5 bg-morandi-sage" />

      {/* Main Container Workspace */}
      <main className="w-full max-w-5xl px-4 py-8 md:py-12 flex-1 flex flex-col justify-between">
        

        {/* Dynamic Interactive Quote Board */}
        <div id="mindful-quote-board" className="w-full max-w-2xl mx-auto mb-8 bg-white border border-morandi-sand rounded-2xl p-4 flex items-center justify-between text-left shadow-2xs relative group transition-all-custom">
          <div className="flex items-start space-x-3.5 flex-1 pr-4">
            <div className="p-2.5 rounded-lg bg-morandi-rose-light text-morandi-rose shrink-0">
              <Feather className="w-4 h-4 stroke-[1.5]" />
            </div>
            <div>
              <p className="text-xs font-serif italic text-morandi-charcoal leading-relaxed">
                「{quote.text}」
              </p>
              <span className="text-[9px] text-morandi-charcoal/40 block mt-1 tracking-wide">— {quote.author}</span>
            </div>
          </div>
          <button
            id="refresh-quote-btn"
            onClick={refreshQuote}
            title="换一句专注金句"
            className="p-2 rounded-lg text-morandi-charcoal/30 hover:text-morandi-rose hover:bg-morandi-rose-light transition-all duration-200 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Dashboard Panels Layout */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 items-start">
          
          {/* Left Column: Pomodoro Big Timer (Spans 2/5 columns) */}
          <section id="timer-panel" className="md:col-span-2">
            <Timer
              activeTaskTitle={activeTask ? activeTask.title : null}
              onPomodoroComplete={handlePomodoroComplete}
              onPomodoroCompleteEarly={handlePomodoroCompleteEarly}
              settings={settings}
              setSettings={setSettings}
              showToast={showToast}
              timeLeft={timeLeft}
              setTimeLeft={setTimeLeft}
              isRunning={isRunning}
              setIsRunning={setIsRunning}
              mode={mode}
              setMode={setMode}
            />
            {/* Ambient White Noise Synthesiser Panel */}
            <WhiteNoisePlayer 
              systemVolume={settings.soundVolume} 
              isRunning={isRunning}
              mode={mode}
            />
          </section>

          {/* Right Column: Todo list & Daily Stats (Spans 3/5 columns) */}
          <section id="tasks-statistics-panel" className="md:col-span-3 flex flex-col space-y-6">
            <TodoList
              tasks={tasks}
              setTasks={setTasks}
              activeTaskId={activeTaskId}
              setActiveTaskId={setActiveTaskId}
              soundVolume={settings.soundVolume}
              settings={settings}
              setStats={setStats}
              timeLeft={timeLeft}
              setTimeLeft={setTimeLeft}
              isRunning={isRunning}
              setIsRunning={setIsRunning}
              mode={mode}
              setMode={setMode}
              onPomodoroCompleteEarly={handlePomodoroCompleteEarly}
              showToast={showToast}
            />
            
            <Stats
              stats={stats}
              tasks={tasks}
              onResetStats={handleResetStats}
              soundVolume={settings.soundVolume}
              settings={settings}
            />
          </section>

        </div>

        {/* Collapsible System Settings Panel (Positioned at bottom for daily workflow efficiency) */}
        <div className="mt-12">
          <AnimatePresence initial={false}>
            {!isHeaderCollapsed ? (
              <motion.div
                key="header-expanded-panel"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden"
              >
                {/* Header Block with Nordic Typography */}
                <header className="text-center mb-8 flex flex-col items-center">
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.6 }}
                    className="flex items-center space-x-2 bg-white px-4 py-1.5 rounded-full border border-morandi-sand/30 shadow-2xs mb-3"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-morandi-sage animate-pulse" />
                    <span className="text-[10px] font-semibold tracking-widest text-morandi-slate uppercase">Nordic Minimalist Timer</span>
                  </motion.div>
                  
                  <h1 className="font-serif text-3xl md:text-4xl text-morandi-charcoal tracking-tight font-medium">
                    {username ? `${username}的慢专注` : '慢专注'} <span className="text-morandi-sage">·</span> 番茄钟
                  </h1>
                  <p className="text-xs text-morandi-charcoal/50 mt-2 font-light max-w-none text-center">
                    「专注 25 分钟，给予灵魂呼吸的间隙。」沉浸在柔和莫兰迪色系中，理清今日步履。
                  </p>

                  {/* Aesthetic Color Palettes Skin Switcher */}
                  <div id="skin-switcher-row" className="flex items-center justify-center space-x-3 mt-4 bg-white/40 backdrop-blur-xs py-1.5 px-4 rounded-full border border-morandi-sand/20 shadow-3xs z-10">
                    <span className="text-[10px] font-semibold text-morandi-charcoal/40 uppercase tracking-widest mr-1">
                      专注皮肤风格
                    </span>
                    {THEMES.map((t) => (
                      <button
                        key={t.id}
                        id={`skin-theme-btn-${t.id}`}
                        onClick={() => handleThemeChange(t.id)}
                        className={`w-5 h-5 rounded-full ${t.color} border transition-all duration-300 relative focus:outline-none cursor-pointer flex items-center justify-center ${
                          theme === t.id 
                            ? 'scale-125 border-morandi-sage ring-2 ring-morandi-sage-light shadow-md' 
                            : 'border-morandi-sand/50 hover:scale-110 hover:border-morandi-sage'
                        }`}
                        title={t.name}
                      >
                        {theme === t.id && (
                          <span className="w-1.5 h-1.5 rounded-full bg-morandi-sage" />
                        )}
                      </button>
                    ))}
                  </div>
                </header>

                {/* Safe Local Onboarding Backup and Profile panel */}
                <LocalBackupAndProfile
                  tasks={tasks}
                  setTasks={setTasks}
                  settings={settings}
                  setSettings={setSettings}
                  stats={stats}
                  setStats={setStats}
                  username={username}
                  setUsername={setUsername}
                  showToast={showToast}
                  soundVolume={settings.soundVolume}
                />
              </motion.div>
            ) : (
              <motion.div
                key="header-collapsed-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="flex flex-col sm:flex-row items-center sm:items-baseline justify-between w-full max-w-2xl mx-auto bg-white/55 backdrop-blur-xs px-5 py-3.5 rounded-2xl border border-morandi-sand/40 shadow-3xs select-none"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="font-serif text-sm font-semibold text-morandi-charcoal">
                    {username ? `${username}的慢专注` : '慢专注'} <span className="text-morandi-sage">·</span> 番茄钟
                  </span>
                  <span className="text-[8px] bg-morandi-sage/10 text-morandi-sage border border-morandi-sage/20 px-2.5 py-0.5 rounded-full uppercase tracking-wider font-semibold">
                    微风专注模式 🍃
                  </span>
                </div>
                <button
                  id="expand-header-row-btn"
                  type="button"
                  onClick={() => {
                    playClick(settings.soundVolume);
                    setIsHeaderCollapsed(false);
                    localStorage.setItem('pomodoro_header_collapsed', 'false');
                  }}
                  className="text-[10px] text-morandi-sage hover:text-morandi-sage-hover font-medium flex items-center space-x-1 hover:underline cursor-pointer transition-colors duration-200 mt-2 sm:mt-0"
                >
                  <span>展开系统面板与设置</span>
                  <ChevronDown className="w-3 h-3 text-morandi-sage" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Dynamic Hide Controller Row if Not Collapsed */}
        {!isHeaderCollapsed && (
          <div className="w-full flex justify-end max-w-2xl mx-auto mt-4 mb-2 select-none">
            <button
              id="collapse-header-row-btn"
              type="button"
              onClick={() => {
                playClick(settings.soundVolume);
                setIsHeaderCollapsed(true);
                localStorage.setItem('pomodoro_header_collapsed', 'true');
              }}
              className="text-[10px] text-morandi-charcoal/40 hover:text-morandi-rose font-medium flex items-center space-x-1.5 hover:underline cursor-pointer bg-white/30 hover:bg-white/65 px-3 py-1.5 rounded-full border border-morandi-sand/35 transition-all duration-200"
            >
              <span>收起系统面板 (清爽专注)</span>
              <ChevronUp className="w-3 h-3 text-morandi-charcoal/40" />
            </button>
          </div>
        )}

        {/* Informative Help Guide for Office workers */}
        <footer id="instructions-bar" className="mt-12 text-center text-[11px] text-morandi-charcoal/30 space-y-1 select-none">
          <p>番茄钟工作法：专注 25 分钟工作，随后自动切换 5 分钟进行眼部舒放与站立抽空休息。</p>
          <p>© Nordic Pomodoro Focus. 每一天，伴您优雅漫步于高效卓越与恬静自然之间。</p>
        </footer>

      </main>

      {/* Beautiful Toast Notifications Drawer */}
      <AnimatePresence>
        {toast && (
          <motion.div
            id="toast-notification-banner"
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 15, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 border text-xs max-w-sm ${
              toast.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : toast.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-blue-50 border-blue-200 text-blue-800'
            }`}
          >
            <span className="font-medium">{toast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* High-Fidelity Local Persona Onboarding Overlay */}
      <AnimatePresence>
        {showOnboarding && (
          <motion.div
            id="onboarding-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-morandi-charcoal/30 backdrop-blur-md"
          >
            <motion.div
              id="onboarding-modal-card"
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', duration: 0.6 }}
              className="bg-white border border-morandi-sand rounded-3xl p-6 md:p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden"
            >
              {/* Soft decorative background leaf illustration */}
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-morandi-sage-light/25 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-morandi-rose-light/15 rounded-full blur-2xl pointer-events-none" />

              <div className="mx-auto w-12 h-12 bg-morandi-sage-light/80 text-morandi-sage rounded-2xl flex items-center justify-center mb-5">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>

              <h2 className="font-serif text-xl md:text-2xl font-semibold text-morandi-charcoal tracking-tight">
                「请问您的称呼？」
              </h2>
              
              <p className="text-xs text-morandi-charcoal/50 leading-relaxed mt-2 font-light">
                本系统专为 Netlify 静态主机进行极致离线优化。所有番茄钟与待办事项皆安全存放在您的本地缓存中。免注册登录，保护您的个人专注隐私。
              </p>

              <form onSubmit={handleSaveOnboardingName} className="mt-6 flex flex-col space-y-4">
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-morandi-charcoal/30">
                    <User className="w-4 h-4" />
                  </span>
                  <input
                    id="onboarding-name-input"
                    type="text"
                    required
                    placeholder="例如：晨溪, 森林旅人..."
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    maxLength={20}
                    className="w-full pl-10 pr-4 py-3 bg-morandi-sand-light/35 border border-morandi-sand/50 rounded-2xl text-xs focus:outline-none focus:ring-1 focus:ring-morandi-sage text-morandi-charcoal placeholder-morandi-charcoal/30 font-medium transition-all"
                    autoFocus
                  />
                </div>

                <button
                  id="onboarding-submit-btn"
                  type="submit"
                  className="w-full py-3 bg-morandi-sage hover:bg-morandi-sage-hover text-white text-xs font-semibold rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 cursor-pointer text-center select-none"
                >
                  开始专注 🧘‍♂️
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
