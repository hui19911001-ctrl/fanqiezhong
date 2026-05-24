import React, { useState } from 'react';
import { Plus, Trash2, Check, Play, Circle, CheckCircle, Flame, Target, Calendar, Clock } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Task, PomodoroSettings, DailyStats, TimerMode } from '../types';
import { playClick } from '../utils/audio';

const getTodayDateString = (): string => {
  return new Date().toISOString().split('T')[0];
};

const getTomorrowDateString = (): string => {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

interface TodoListProps {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  activeTaskId: string | null;
  setActiveTaskId: (id: string | null) => void;
  soundVolume: number;
  settings: PomodoroSettings;
  setStats: React.Dispatch<React.SetStateAction<DailyStats>>;
  // Added props for coordinating active timer state
  isRunning: boolean;
  setIsRunning: React.Dispatch<React.SetStateAction<boolean>>;
  timeLeft: number;
  setTimeLeft: React.Dispatch<React.SetStateAction<number>>;
  mode: TimerMode;
  setMode: React.Dispatch<React.SetStateAction<TimerMode>>;
  onPomodoroCompleteEarly: (mode: TimerMode, elapsedMinutes: number) => void;
  showToast?: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export default function TodoList({
  tasks,
  setTasks,
  activeTaskId,
  setActiveTaskId,
  soundVolume,
  settings,
  setStats,
  isRunning,
  setIsRunning,
  timeLeft,
  setTimeLeft,
  mode,
  setMode,
  onPomodoroCompleteEarly,
  showToast,
}: TodoListProps) {
  const [dateTab, setDateTab] = useState<'today' | 'tomorrow'>('today');
  const [newTitle, setNewTitle] = useState<string>('');
  const [estimatedPoms, setEstimatedPoms] = useState<number>(2);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');

  const addTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    playClick(soundVolume);
    const targetDate = dateTab === 'tomorrow' ? getTomorrowDateString() : getTodayDateString();
    
    const newTask: Task = {
      id: Math.random().toString(36).substring(2, 9),
      title: newTitle.trim(),
      completed: false,
      estimatedPoms,
      completedPoms: 0,
      createdAt: Date.now(),
      scheduledDate: targetDate,
    };

    setTasks([newTask, ...tasks]);
    setNewTitle('');
    
    if (dateTab === 'tomorrow') {
      showToast?.("任务已添加至明日计划 🌅", "success");
    } else {
      showToast?.("新增任务已加入今日专注 🌿", "success");
      // Automatically select the newly created task as active if none is currently selected
      if (!activeTaskId) {
        setActiveTaskId(newTask.id);
      }
    }
  };

  const moveTaskToTomorrow = (taskId: string) => {
    playClick(soundVolume);
    const tomorrowStr = getTomorrowDateString();
    
    // If it's the active focus task, unselect it
    if (activeTaskId === taskId) {
      setActiveTaskId(null);
    }
    
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          return { ...task, scheduledDate: tomorrowStr };
        }
        return task;
      })
    );
    showToast?.("任务已移至明日备忘，今天可以先放空啦 🌅", "success");
  };

  const moveTaskToToday = (taskId: string) => {
    playClick(soundVolume);
    const todayStr = getTodayDateString();
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          return { ...task, scheduledDate: todayStr };
        }
        return task;
      })
    );
    showToast?.("任务已移入今日专注，加油 🌿", "success");
  };

  const toggleTaskCompleted = (taskId: string) => {
    playClick(soundVolume);
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          const updatedCompleted = !task.completed;
          
          if (updatedCompleted) {
            // Task completed: calculate outstanding poms
            const pomsDiff = Math.max(0, task.estimatedPoms - task.completedPoms);
            
            // Update daily stats
            setStats((prevStats) => ({
              ...prevStats,
              completedCount: prevStats.completedCount + pomsDiff,
              totalFocusMinutes: prevStats.totalFocusMinutes + (pomsDiff * settings.focusTime),
              lastUpdated: getTodayDateString(),
            }));

            // Deselect as active task if it was active
            if (activeTaskId === taskId) {
              setActiveTaskId(null);
            }

            const finalFocusedMins = task.focusedMinutes && task.focusedMinutes > 0 
              ? task.focusedMinutes 
              : (task.estimatedPoms * settings.focusTime);

            return {
              ...task,
              completed: true,
              completedPoms: Math.max(task.completedPoms, task.estimatedPoms),
              focusedMinutes: finalFocusedMins,
            };
          } else {
            // Task uncompleted: reset completedPoms to 0 and focusedMinutes to 0
            const pomsToRemove = task.completedPoms;
            const minsToRemove = task.focusedMinutes || (task.completedPoms * settings.focusTime) || 0;

            setStats((prevStats) => ({
              ...prevStats,
              completedCount: Math.max(0, prevStats.completedCount - pomsToRemove),
              totalFocusMinutes: Math.max(0, prevStats.totalFocusMinutes - minsToRemove),
              lastUpdated: getTodayDateString(),
            }));

            return {
              ...task,
              completed: false,
              completedPoms: 0,
              focusedMinutes: 0,
            };
          }
        }
        return task;
      })
    );
  };

  const deleteTask = (taskId: string) => {
    playClick(soundVolume);
    if (activeTaskId === taskId) {
      setActiveTaskId(null);
    }
    setTasks(tasks.filter((task) => task.id !== taskId));
  };

  const adjustEstimatedPoms = (taskId: string, amount: number) => {
    playClick(soundVolume);
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          const calculated = task.estimatedPoms + amount;
          return { ...task, estimatedPoms: Math.max(1, Math.min(10, calculated)) };
        }
        return task;
      })
    );
  };

  const incrementCompletedPoms = (taskId: string, amount: number) => {
    playClick(soundVolume);
    setTasks(
      tasks.map((task) => {
        if (task.id === taskId) {
          const calculated = task.completedPoms + amount;
          return { ...task, completedPoms: Math.max(0, Math.min(12, calculated)) };
        }
        return task;
      })
    );
  };

  const handleSelectActiveTask = (taskId: string, completed: boolean) => {
    if (completed) return; // Can't focus on completed tasks
    playClick(soundVolume);
    
    const totalDuration = settings.focusTime * 60;

    // Check if switching task while timer is active and running in focus mode
    if (isRunning && mode === 'focus' && activeTaskId && activeTaskId !== taskId) {
      const confirmSwitch = window.confirm(`是否结束当前计时并切换到新任务？\n选择「确定」将计入您当前已专注的时间。`);
      if (!confirmSwitch) {
        // User cancelled, keep running current task timer
        return;
      }
      
      // Save elapsed focus time of the current session
      const elapsedSeconds = Math.max(0, totalDuration - timeLeft);
      const elapsedMinutes = elapsedSeconds / 60;
      
      if (elapsedSeconds >= 1) {
        onPomodoroCompleteEarly('focus', elapsedMinutes);
      }
    }

    // Toggle active task context & auto start timer
    setActiveTaskId(taskId);
    setMode('focus');
    setTimeLeft(totalDuration);
    setIsRunning(true);
  };

  // Filter tasks by date and tabs state
  const todayStr = getTodayDateString();
  const todayTasks = tasks.filter(task => !task.scheduledDate || task.scheduledDate <= todayStr);
  const tomorrowTasks = tasks.filter(task => task.scheduledDate && task.scheduledDate > todayStr);

  const todayPendingCount = todayTasks.filter(t => !t.completed).length;
  const tomorrowPendingCount = tomorrowTasks.filter(t => !t.completed).length;

  const activeDateTasks = dateTab === 'today' ? todayTasks : tomorrowTasks;

  const filteredTasks = activeDateTasks.filter((task) => {
    if (filter === 'pending') return !task.completed;
    if (filter === 'completed') return task.completed;
    return true;
  });

  return (
    <div id="todo-list-card" className="bg-white rounded-3xl p-6 md:p-8 border border-morandi-sand shadow-sm flex flex-col h-full transition-all-custom">
      
      {/* Day Selection Segmented Tabs */}
      <div className="flex bg-morandi-sand-light p-1 rounded-2xl border border-morandi-sand/30 mb-5 text-xs select-none">
        <button
          id="day-tab-today"
          type="button"
          onClick={() => { playClick(soundVolume); setDateTab('today'); }}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl transition-all font-medium cursor-pointer ${
            dateTab === 'today'
              ? 'bg-morandi-sage text-white shadow-2xs font-semibold'
              : 'text-morandi-charcoal/50 hover:text-morandi-charcoal hover:bg-morandi-sand/10'
          }`}
        >
          <span>今日专注 🌿</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono ${dateTab === 'today' ? 'bg-white/20 text-white' : 'bg-morandi-sand text-morandi-charcoal/40'}`}>
            {todayPendingCount}项
          </span>
        </button>
        <button
          id="day-tab-tomorrow"
          type="button"
          onClick={() => { playClick(soundVolume); setDateTab('tomorrow'); }}
          className={`flex-1 flex items-center justify-center space-x-1.5 py-2.5 rounded-xl transition-all font-medium cursor-pointer ${
            dateTab === 'tomorrow'
              ? 'bg-amber-500 text-white shadow-2xs font-semibold'
              : 'text-morandi-charcoal/50 hover:text-morandi-charcoal hover:bg-morandi-sand/10'
          }`}
        >
          <span>明日计划 🌅</span>
          <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-mono ${dateTab === 'tomorrow' ? 'bg-white/20 text-white' : 'bg-morandi-sand text-morandi-charcoal/40'}`}>
            {tomorrowPendingCount}项
          </span>
        </button>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 space-y-3 sm:space-y-0">
        <div>
          <h2 className="font-serif text-2xl tracking-tight text-morandi-charcoal flex items-center space-x-2">
            <span>{dateTab === 'today' ? '今日任务清单' : '明日备忘计划'}</span>
          </h2>
          <p className="text-[10px] text-morandi-charcoal/40 mt-1 tracking-wider uppercase">
            {dateTab === 'today' ? 'Focus & productivity alignment' : 'Anticipate & structure tomorrow'}
          </p>
        </div>

        {/* Filters Selectors */}
        <div id="filter-tabs" className="flex items-center space-x-1 bg-morandi-sand-light p-1 rounded-full text-xs self-start sm:self-auto">
          <button
            id="filter-all-btn"
            type="button"
            onClick={() => { playClick(soundVolume); setFilter('all'); }}
            className={`px-2.5 py-1.5 rounded-full transition-all-custom ${
              filter === 'all'
                ? 'bg-morandi-slate text-white'
                : 'text-morandi-charcoal/60 hover:text-morandi-charcoal'
            }`}
          >
            全部 ({activeDateTasks.length})
          </button>
          <button
            id="filter-pending-btn"
            type="button"
            onClick={() => { playClick(soundVolume); setFilter('pending'); }}
            className={`px-2.5 py-1.5 rounded-full transition-all-custom ${
              filter === 'pending'
                ? 'bg-morandi-slate text-white'
                : 'text-morandi-charcoal/60 hover:text-morandi-charcoal'
            }`}
          >
            待办 ({activeDateTasks.filter((t) => !t.completed).length})
          </button>
          <button
            id="filter-completed-btn"
            type="button"
            onClick={() => { playClick(soundVolume); setFilter('completed'); }}
            className={`px-2.5 py-1.5 rounded-full transition-all-custom ${
              filter === 'completed'
                ? 'bg-morandi-slate text-white'
                : 'text-morandi-charcoal/60 hover:text-morandi-charcoal'
            }`}
          >
            已成 ({activeDateTasks.filter((t) => t.completed).length})
          </button>
        </div>
      </div>

      {/* Task Creation Form */}
      <form id="task-creation-form" onSubmit={addTask} className="mb-6 bg-morandi-sand-light p-4 rounded-2xl border border-morandi-sand/30">
        <div className="flex flex-col space-y-3">
          <div className="flex items-center space-x-2">
            <input
              id="new-task-title-input"
              type="text"
              placeholder={
                dateTab === 'today'
                  ? '今天想要专注完成什么任务呢？...'
                  : '突然想到一件事，明天再做？在这里写下，明天会自动移入今日任务 🌅...'
              }
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="flex-1 bg-white rounded-xl py-2.5 px-4 text-xs text-morandi-charcoal placeholder-morandi-charcoal/40 border border-morandi-sand focus:outline-none focus:ring-1 focus:ring-morandi-sage focus:border-morandi-sage transition-all"
            />
          </div>

          <div className="flex items-center justify-between text-xs pt-2">
            <div className="flex items-center space-x-2 text-morandi-charcoal/70">
              <span>预估番茄钟：</span>
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button
                    key={num}
                    id={`est-pom-choice-${num}`}
                    type="button"
                    onClick={() => { playClick(soundVolume); setEstimatedPoms(num); }}
                    className={`w-6 h-6 rounded-full text-[10px] font-mono transition-all flex items-center justify-center ${
                      estimatedPoms >= num
                        ? 'bg-morandi-rose text-white scale-105'
                        : 'bg-white border border-morandi-sand text-morandi-charcoal/40 hover:bg-morandi-sand/20'
                    }`}
                  >
                    🍅
                  </button>
                ))}
                <span className="text-[10px] font-mono text-morandi-charcoal/50 ml-1">({estimatedPoms} 个)</span>
              </div>
            </div>

            {/* Quick Add Button */}
            <button
              id="add-task-submit-btn"
              type="submit"
              className="px-4 py-2 bg-morandi-sage hover:bg-morandi-sage-hover text-white rounded-xl text-xs font-semibold flex items-center space-x-1 shadow-sm active:scale-95 transition-all-custom cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>新增任务</span>
            </button>
          </div>
        </div>
      </form>

      {/* Task Items Workspace */}
      <div id="tasks-scroll-container" className="flex-1 overflow-y-auto max-h-[350px] pr-1 space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredTasks.length === 0 ? (
            <motion.div
              key="empty-state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="py-12 text-center text-morandi-charcoal/40 px-4 flex flex-col items-center justify-center space-y-3"
            >
              <CheckCircle className="w-10 h-10 stroke-1 text-morandi-sand" />
              <div className="text-xs text-center py-2">
                {dateTab === 'today' ? (
                  <>
                    {filter === 'all' && '今天还没有待办事项，新增一个任务，迈出品味专注的第一步吧。 ☕'}
                    {filter === 'pending' && '专注进行中的任务都完成了！真棒 🌿'}
                    {filter === 'completed' && '还没有完成任何任务。慢慢来，享受专注的过程！'}
                  </>
                ) : (
                  <>
                    {filter === 'all' && '明天还在计划中。随手记下一件突然想到的事，给明天减负吧 🗺️'}
                    {filter === 'pending' && '明日备忘计划中的待办已被提前清空。 🌿'}
                    {filter === 'completed' && '明日计划中目前还没有已完成的任务。 ✨'}
                  </>
                )}
              </div>
            </motion.div>
          ) : (
            filteredTasks.map((task) => {
              const isActive = activeTaskId === task.id;
              const actualMins = task.focusedMinutes || (task.completedPoms * settings.focusTime) || 0;
              const displayCompletedPoms = Math.max(task.completedPoms, Math.round(actualMins / settings.focusTime));
              const progressPercent = task.completed 
                ? 100 
                : Math.min(100, Math.round((actualMins / (task.estimatedPoms * settings.focusTime)) * 100));

              return (
                <motion.div
                  key={task.id}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                  className={`p-4 rounded-2xl border transition-all-custom flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    isActive
                      ? 'bg-morandi-sage-light/40 border-morandi-sage shadow-xs'
                      : 'bg-white hover:bg-morandi-sand-light/30 border-morandi-sand/50'
                  }`}
                >
                  {/* Task Checkbox + Title Box */}
                  <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                    {/* Checkbox Trigger */}
                    <button
                      id={`toggle-task-${task.id}`}
                      type="button"
                      onClick={() => toggleTaskCompleted(task.id)}
                      className={`w-5 h-5 rounded-full flex items-center justify-center transition-all shrink-0 mt-0.5 cursor-pointer ${
                        task.completed
                          ? 'bg-morandi-sage text-white'
                          : 'border border-morandi-sand hover:border-morandi-sage text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </button>

                    {/* Task Title Content */}
                    <div id={`task-title-info-${task.id}`} className="min-w-0 flex-1 flex flex-col">
                      <span
                        className={`text-xs font-semibold truncate ${
                          task.completed
                            ? 'line-through text-morandi-charcoal/40 font-light'
                            : 'text-morandi-charcoal'
                        }`}
                      >
                        {task.title}
                      </span>
                      
                      {/* Tomatoes counts & exact duration indicators */}
                      <div className="flex flex-wrap items-center gap-y-1 gap-x-3 mt-1.5 text-[10px] text-morandi-charcoal/50 select-none">
                        <div className="flex items-center space-x-0.5 font-mono">
                          <span>🍅 {displayCompletedPoms}</span>
                          <span className="opacity-40">/</span>
                          <span>{task.estimatedPoms} 预估</span>
                        </div>
                        
                        {/* Pom Indicators Micro dots */}
                        <div className="flex items-center space-x-0.5 opacity-90">
                          {Array.from({ length: Math.max(task.estimatedPoms, displayCompletedPoms) }).map((_, i) => (
                            <div
                              key={i}
                              className={`w-1.5 h-1.5 rounded-full ${
                                i < displayCompletedPoms
                                  ? 'bg-morandi-rose'
                                  : 'bg-morandi-sand'
                              }`}
                            />
                          ))}
                        </div>

                        {/* Exact logged elapsed focus minutes badge */}
                        {actualMins > 0 && (
                          <div className="text-[10px] font-mono text-morandi-charcoal/40 bg-morandi-sand/30 hover:bg-morandi-sand/65 hover:text-morandi-charcoal px-2 py-0.5 rounded-md flex items-center space-x-1.5 border border-morandi-sand/20 transition-all duration-200">
                            <Clock className="w-3 h-3 text-morandi-sage/80" />
                            <span>已专注 <strong>{actualMins}</strong> 分钟</span>
                          </div>
                        )}
                      </div>

                      {/* Beautiful tactile Segmented Block Progress representations (Nordic Ticks Meter) */}
                      <div className="w-full mt-3 flex flex-col space-y-1.5 select-none">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {(() => {
                            const minutesPerBlock = 5;
                            const activeBlocks = Math.ceil(actualMins / minutesPerBlock);
                            const targetMins = (task.estimatedPoms || 1) * settings.focusTime;
                            const targetBlocks = Math.ceil(targetMins / minutesPerBlock);
                            const maxBlocks = Math.max(activeBlocks, targetBlocks);

                            return Array.from({ length: maxBlocks }).map((_, idx) => {
                              const blockNum = idx + 1;
                              const isFilled = blockNum <= activeBlocks;
                              let blockColor = "bg-morandi-sand/15 border border-morandi-sand/25";
                              
                              if (isFilled) {
                                if (task.completed) {
                                  blockColor = "bg-morandi-sage border border-morandi-sage/30 shadow-3xs";
                                } else if (isActive) {
                                  blockColor = "bg-morandi-rose border border-morandi-rose/30 shadow-2xs animate-pulse";
                                } else {
                                  blockColor = "bg-morandi-slate border border-morandi-slate/30";
                                }
                              }

                              return (
                                <motion.div
                                  key={idx}
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  transition={{ delay: Math.min(10, idx) * 0.02, type: "spring", stiffness: 350, damping: 25 }}
                                  className={`w-2 h-3.5 rounded-[2px] transition-all duration-300 ${blockColor}`}
                                  title={`第 ${blockNum} 槽位 (累积约 ${blockNum * minutesPerBlock} 分钟)`}
                                />
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Task Options & Focus Switch Controls */}
                  <div className="flex items-center space-x-2 shrink-0 sm:self-center self-end pl-8 sm:pl-0">
                    {/* Done Milestone status badge */}
                    {task.completed && (
                      <div className="text-[10px] font-serif font-medium text-morandi-sage-hover bg-morandi-sage/5 px-2.5 py-1 rounded-full flex items-center space-x-1 border border-morandi-sage/20 select-none">
                        <span>已达成 🎯</span>
                      </div>
                    )}

                    {/* Increment/Decrement Completed Tomatoes Slice */}
                    {!task.completed && (
                      <div className="flex items-center space-x-1 bg-morandi-sand-light px-1.5 py-1 rounded-lg border border-morandi-sand/20 select-none">
                        <button
                          id={`dec-comp-poms-${task.id}`}
                          type="button"
                          onClick={() => adjustEstimatedPoms(task.id, -1)}
                          title="减少预估番茄钟"
                          className="w-4 h-4 flex items-center justify-center text-[10px] text-morandi-charcoal/50 hover:text-morandi-charcoal hover:bg-morandi-sand/30 rounded cursor-pointer"
                        >
                          -
                        </button>
                        <span className="text-[10px] font-mono text-morandi-charcoal w-3 text-center">估</span>
                        <button
                          id={`inc-comp-poms-${task.id}`}
                          type="button"
                          onClick={() => adjustEstimatedPoms(task.id, 1)}
                          title="增加预估番茄钟"
                          className="w-4 h-4 flex items-center justify-center text-[10px] text-morandi-charcoal/50 hover:text-morandi-charcoal hover:bg-morandi-sand/30 rounded cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    )}

                    {/* Active Target Connector or Reschedule Button */}
                    {!task.completed && (
                      dateTab === 'today' ? (
                        <>
                          <button
                            id={`select-active-task-${task.id}`}
                            type="button"
                            onClick={() => handleSelectActiveTask(task.id, task.completed)}
                            className={`px-2.5 py-1.5 rounded-lg text-[10px] font-semibold flex items-center space-x-1 transition-all cursor-pointer ${
                              isActive
                                ? 'bg-morandi-sage text-white shadow-xs'
                                : 'bg-morandi-slate-light text-morandi-slate hover:bg-morandi-sage hover:text-white'
                            }`}
                          >
                            <Target className="w-3 h-3" />
                            <span>{isActive ? '专注中' : '选择专注'}</span>
                          </button>

                          <button
                            id={`move-to-tomorrow-${task.id}`}
                            type="button"
                            onClick={() => moveTaskToTomorrow(task.id)}
                            title="明天再做"
                            className="px-2 py-1.5 rounded-lg text-[10px] items-center space-x-1 border border-amber-200 text-amber-700 hover:bg-amber-50 transition-all flex cursor-pointer font-medium"
                          >
                            <Calendar className="w-3 h-3 text-amber-600" />
                            <span>明天做</span>
                          </button>
                        </>
                      ) : (
                        <button
                          id={`move-to-today-${task.id}`}
                          type="button"
                          onClick={() => moveTaskToToday(task.id)}
                          className="px-2.5 py-1.5 rounded-lg text-[10px] font-semibold flex items-center space-x-1 border border-morandi-sage text-morandi-sage hover:bg-morandi-sage/10 hover:text-morandi-sage transition-all cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>移入今日</span>
                        </button>
                      )
                    )}

                    {/* Delete Trigger */}
                    <button
                      id={`delete-task-${task.id}`}
                      type="button"
                      onClick={() => deleteTask(task.id)}
                      title="删除任务"
                      className="p-1.5 rounded-lg text-morandi-charcoal/30 hover:text-morandi-terracotta hover:bg-morandi-rose-light transition-all"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
