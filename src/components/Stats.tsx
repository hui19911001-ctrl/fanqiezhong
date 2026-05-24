import { Award, Flame, Zap, RefreshCw, Calendar, CheckSquare } from 'lucide-react';
import { motion } from 'motion/react';
import { DailyStats, Task, PomodoroSettings } from '../types';
import { playClick } from '../utils/audio';

interface StatsProps {
  stats: DailyStats;
  tasks: Task[];
  onResetStats: () => void;
  soundVolume: number;
  settings: PomodoroSettings;
}

const getTodayDateString = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Stats({
  stats,
  tasks,
  onResetStats,
  soundVolume,
  settings,
}: StatsProps) {
  const todayStr = getTodayDateString();
  const todayTasks = tasks.filter(task => !task.scheduledDate || task.scheduledDate <= todayStr);

  // Unassociated focus stats (recorded direct focus with no selected tasks)
  const totalAllTaskCompletedPoms = tasks.reduce((sum, t) => sum + t.completedPoms, 0);
  const unassociatedPoms = Math.max(0, stats.completedCount - totalAllTaskCompletedPoms);
  const todayCompletedCount = todayTasks.reduce((sum, t) => sum + t.completedPoms, 0) + unassociatedPoms;

  const totalAllTaskFocusedMinutes = tasks.reduce((sum, t) => sum + (t.focusedMinutes || (t.completedPoms * settings.focusTime) || 0), 0);
  const unassociatedMinutes = Math.max(0, stats.totalFocusMinutes - totalAllTaskFocusedMinutes);
  const todayFocusedMinutes = parseFloat((todayTasks.reduce((sum, t) => sum + (t.focusedMinutes || (t.completedPoms * settings.focusTime) || 0), 0) + unassociatedMinutes).toFixed(1));

  // Sum of estimated pomodoros of all of today's tasks. Fallback to 4 if no today's tasks exist.
  const totalEstimatedPoms = todayTasks.reduce((sum, task) => sum + task.estimatedPoms, 0);
  const dailyTarget = totalEstimatedPoms > 0 ? totalEstimatedPoms : 4;
  const progressRatio = dailyTarget > 0 ? Math.min(1, todayCompletedCount / dailyTarget) : 0;
  const completedPercentage = Math.round(progressRatio * 100);

  // Todo Completion Stats for Today only
  const completedTasksCount = todayTasks.filter((t) => t.completed).length;
  const totalTasksCount = todayTasks.length;

  return (
    <div id="stats-dashboard-card" className="bg-white rounded-3xl p-6 border border-morandi-sand shadow-sm transition-all-custom h-full flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-morandi-sand/40">
          <div>
            <h3 className="font-serif text-lg tracking-tight text-morandi-charcoal flex items-center space-x-2">
              <span>今日专注状态</span>
            </h3>
            <p className="text-[9px] text-morandi-charcoal/40 uppercase tracking-widest mt-0.5">Focus milestones & analytics</p>
          </div>
          <button
            id="reset-stats-btn"
            onClick={() => {
              if (confirm('确定要重置今日的专注统计数据吗？')) {
                playClick(soundVolume);
                onResetStats();
              }
            }}
            title="重置统计"
            className="p-1 rounded bg-morandi-sand-light hover:bg-morandi-sand text-morandi-charcoal/50 hover:text-morandi-charcoal transition-all text-[10px] flex items-center space-x-1 px-2 py-1 select-none"
          >
            <RefreshCw className="w-2.5 h-2.5" />
            <span>重置数据</span>
          </button>
        </div>

        {/* Bento Grid Stats items */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Item 1: Complete PomCount */}
          <div className="bg-morandi-sand-light/50 p-3.5 rounded-2xl border border-morandi-sand/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-morandi-charcoal/50">今日番茄钟</span>
              <span className="text-sm">🍅</span>
            </div>
            <div className="mt-2.5 flex items-baseline space-x-1">
              <span className="text-2xl font-mono font-bold text-morandi-charcoal">{todayCompletedCount}</span>
              <span className="text-xs text-morandi-charcoal/40">/ {dailyTarget} 个</span>
            </div>
          </div>

          {/* Item 2: Focus Minutes */}
          <div className="bg-morandi-sage-light/30 p-3.5 rounded-2xl border border-morandi-sage/20 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-morandi-slate">专注总时长</span>
              <span className="text-sm">⏳</span>
            </div>
            <div className="mt-2.5 flex items-baseline space-x-1">
              <span className="text-2xl font-mono font-bold text-morandi-slate">{todayFocusedMinutes}</span>
              <span className="text-xs text-morandi-slate/60">分钟</span>
            </div>
          </div>
        </div>

        {/* Todo task completion quick display */}
        <div className="bg-morandi-sand-light/20 p-3 rounded-2xl border border-morandi-sand/30 mb-5 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2 text-morandi-charcoal/70">
            <CheckSquare className="w-3.5 h-3.5 text-morandi-sage" />
            <span>今日任务完成进度</span>
          </div>
          <div className="flex items-center space-x-1.5 font-mono">
            <span className="font-semibold text-morandi-charcoal">{completedTasksCount}</span>
            <span className="opacity-40">/</span>
            <span className="text-morandi-charcoal/60">{totalTasksCount}</span>
            <span className="text-[10px] text-morandi-charcoal/40 bg-morandi-sand-light px-1.5 py-0.5 rounded-md ml-1">
              ({totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0}%)
            </span>
          </div>
        </div>

        {/* Daily Goal Visual Slider */}
        <div id="daily-goals-meter" className="space-y-2 mb-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-morandi-charcoal flex items-center space-x-1">
              <Award className="w-3.5 h-3.5 text-morandi-rose" />
              <span>每日番茄钟目标进度</span>
            </span>
            <span className="font-mono text-[11px] text-morandi-rose font-bold">
              {completedPercentage}%
            </span>
          </div>
          
          <div className="w-full bg-morandi-sand-light h-2 rounded-full overflow-hidden border border-morandi-sand/20">
            <motion.div
              className={`h-full rounded-full ${
                completedPercentage >= 100 ? 'bg-morandi-sage' : 'bg-morandi-rose'
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${completedPercentage}%` }}
              transition={{ type: 'spring', damping: 15, stiffness: 100 }}
            />
          </div>

          <div id="goal-motivational-indicator" className="text-[10px] text-morandi-charcoal/50 text-center pt-1 min-h-[16px]">
            {todayCompletedCount === 0 && '出发吧！点击播放，开始您的第一个 25 分钟专注 🌿'}
            {todayCompletedCount > 0 && todayCompletedCount < dailyTarget && '表现优异！离今日专注目标更近一步了 ✨'}
            {todayCompletedCount >= dailyTarget && '完美达成！恭喜您完成今日专注目标，可以适度给自己一个鼓励喽！🏆'}
          </div>
        </div>
      </div>

      {/* Decorative Brand footer */}
      <div className="mt-4 pt-3 border-t border-morandi-sand/30 flex items-center justify-between text-[10px] text-morandi-charcoal/30 select-none">
        <span className="flex items-center space-x-1 bg-transparent">
          <Flame className="w-3 h-3 text-morandi-rose animate-pulse" />
          <span>静心专注 · 莫兰迪简约番茄钟</span>
        </span>
        <span className="font-mono">VER 1.2 · LOCAL STORAGE</span>
      </div>
    </div>
  );
}
