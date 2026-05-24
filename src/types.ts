export type TimerMode = 'focus' | 'break' | 'longBreak';

export interface Task {
  id: string;
  title: string;
  completed: boolean;
  estimatedPoms: number; // Estimated pomodoros (e.g. 1-5 🍅)
  completedPoms: number; // Completed pomodoros for this specific task
  createdAt: number;
  scheduledDate?: string; // ISO date string 'YYYY-MM-DD' representing active date
  focusedMinutes?: number; // Total focused minutes logged on this task
}

export interface PomodoroSettings {
  focusTime: number; // in minutes, default 25
  breakTime: number; // in minutes, default 5
  longBreakTime: number; // in minutes, default 15
  autoStartNext: boolean; // auto-start break/focus
  soundVolume: number; // 0 to 1
}

export interface DailyStats {
  completedCount: number; // number of completed focus rounds
  totalFocusMinutes: number; // minutes focused
  lastUpdated: string; // date string YYYY-MM-DD
}
