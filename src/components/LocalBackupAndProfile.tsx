import React, { useState } from 'react';
import { 
  Download, 
  Upload, 
  User, 
  Check, 
  Sparkles, 
  HelpCircle,
  Cpu,
  RefreshCw,
  Edit2
} from 'lucide-react';
import { Task, PomodoroSettings, DailyStats } from '../types';
import { playClick } from '../utils/audio';

interface LocalBackupAndProfileProps {
  tasks: Task[];
  setTasks: (tasks: Task[]) => void;
  settings: PomodoroSettings;
  setSettings: (settings: PomodoroSettings) => void;
  stats: DailyStats;
  setStats: (stats: DailyStats) => void;
  username: string;
  setUsername: (name: string) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  soundVolume: number;
}

export default function LocalBackupAndProfile({
  tasks,
  setTasks,
  settings,
  setSettings,
  stats,
  setStats,
  username,
  setUsername,
  showToast,
  soundVolume,
}: LocalBackupAndProfileProps) {
  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [nameInput, setNameInput] = useState<string>(username || '');

  // Trigger nickname save manually
  const handleSaveName = () => {
    playClick(soundVolume);
    const trimmed = nameInput.trim();
    if (!trimmed) {
      showToast("称呼不能是空白哦！", "error");
      return;
    }
    if (trimmed.length > 20) {
      showToast("称呼请控制在 20 个字符以内。", "error");
      return;
    }
    setUsername(trimmed);
    localStorage.setItem('pomodoro_username', trimmed);
    setIsEditingName(false);
    showToast(`好名字！已为您更新称呼为：${trimmed} 🌿`, "success");
  };

  // --- Offline Manual JSON File Export ---
  const handleExportDataLocal = () => {
    playClick(soundVolume);
    try {
      const backupObj = {
        username,
        tasks,
        settings,
        stats,
        backupDate: new Date().toISOString(),
        platform: "Netlify Local Offline Mode",
      };

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
        JSON.stringify(backupObj, null, 2)
      )}`;
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `${username || 'focus'}_pomodoro_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      showToast("个人专注进度 JSON 导出成功！文件已安全下载。💾", "success");
    } catch (e) {
      console.error(e);
      showToast("导出数据时发生异常。", "error");
    }
  };

  // --- Offline Manual JSON File Import ---
  const handleImportDataLocal = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        const parsed = JSON.parse(fileContent);

        if (parsed && (Array.isArray(parsed.tasks) || parsed.settings || parsed.stats || parsed.username)) {
          if (parsed.username && typeof parsed.username === 'string') {
            setUsername(parsed.username);
            localStorage.setItem('pomodoro_username', parsed.username);
          }
          if (Array.isArray(parsed.tasks)) {
            setTasks(parsed.tasks);
          }
          if (parsed.settings) {
            setSettings({
              ...settings,
              ...parsed.settings
            });
          }
          if (parsed.stats) {
            setStats(parsed.stats);
          }
          showToast("专注记录与备份数据还原成功！🌱", "success");
        } else {
          showToast("备份文件格式不符，找不到有效的专注数据。", "error");
        }
      } catch (err) {
        console.error(err);
        showToast("解析备份文件失败，请提供合规的 json 进度档。", "error");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div 
      id="local-storage-backup-panel" 
      className="w-full max-w-5xl mx-auto mb-6 bg-white border border-morandi-sand rounded-3xl p-5 md:p-6 shadow-2xs text-left text-morandi-charcoal transition-all"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Local Storage Profile Header */}
        <div className="flex items-start space-x-3.5 flex-1">
          <div className="p-3 bg-morandi-sage-light text-morandi-sage rounded-2xl shrink-0 flex items-center justify-center">
            <User className="w-5 h-5" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              {isEditingName ? (
                <div className="flex items-center space-x-1.5 mt-0.5">
                  <input
                    id="nickname-edit-input"
                    type="text"
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    maxLength={20}
                    onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                    className="px-2 py-0.5 text-xs font-serif border border-morandi-sand rounded-lg focus:outline-none focus:ring-1 focus:ring-morandi-sage max-w-[140px] bg-white text-morandi-charcoal font-medium"
                    autoFocus
                  />
                  <button
                    id="confirm-nickname-btn"
                    onClick={handleSaveName}
                    className="p-1 text-morandi-sage hover:bg-morandi-sage-light rounded-md transition-all cursor-pointer"
                    title="保存"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <h3 className="font-serif text-base tracking-tight font-semibold flex items-center">
                    {username ? `你好，${username} 🧘‍♂️` : '慢专注旅伴'}
                  </h3>
                  <button
                    id="edit-nickname-btn"
                    onClick={() => { playClick(soundVolume); setNameInput(username); setIsEditingName(true); }}
                    className="p-1 hover:bg-morandi-sand-light rounded text-morandi-charcoal/40 hover:text-morandi-charcoal transition-all cursor-pointer"
                    title="修改称呼"
                  >
                    <Edit2 className="w-3 h-3" />
                  </button>
                </div>
              )}
              
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-morandi-sage text-white tracking-wider">
                本地安全模式
              </span>
              <span className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase bg-morandi-sand text-morandi-charcoal/50 select-none">
                Netlify 静态托管优化
              </span>
            </div>
            
            <p className="text-xs text-morandi-charcoal/50 mt-1.5 leading-relaxed">
              所有专注时间、自定义任务与计时器参数均即时存储在您本地的 <span className="font-mono text-[11px] bg-morandi-sand/40 px-1 py-0.5 rounded text-morandi-sage">localStorage</span> 里。免账号、免登录、完全离线安心，关闭标签页绝不丢失。
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div id="local-sync-actions" className="flex flex-wrap items-center gap-2 md:self-center shrink-0">
          {/* Export JSON Btn */}
          <button
            id="local-export-data-btn"
            onClick={handleExportDataLocal}
            title="手动导出备份 JSON 文件"
            className="px-3.5 py-2 hover:bg-morandi-sand-light border border-morandi-sand rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all text-morandi-charcoal select-none cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-morandi-rose" />
            <span>手动『导出数据(JSON)』</span>
          </button>

          {/* Import JSON Btn */}
          <label
            htmlFor="local-import-data-input"
            className="px-3.5 py-2 hover:bg-morandi-sand-light border border-morandi-sand rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all text-morandi-charcoal select-none cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5 text-morandi-sage" />
            <span>手动『导入数据』</span>
            <input
              id="local-import-data-input"
              type="file"
              accept=".json"
              onChange={handleImportDataLocal}
              className="hidden"
            />
          </label>

          {/* Help/Guide Icon */}
          <button
            id="local-toggle-guide-btn"
            onClick={() => { playClick(soundVolume); setShowGuide(!showGuide); }}
            className="p-2 bg-morandi-sand-light/50 hover:bg-morandi-sand/30 rounded-xl text-morandi-charcoal/70 transition-all cursor-pointer"
            title="本地存储与安全说明"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Expandable Safety Guidance */}
      {showGuide && (
        <div id="local-safety-guide" className="mt-5 p-5 bg-morandi-sand-light/35 border-l-2 border-morandi-sage rounded-r-2xl space-y-3.5 text-xs">
          <div className="flex items-center justify-between pb-1 border-b border-morandi-sand/40">
            <h4 className="font-serif font-bold text-morandi-charcoal">🌿 关于「本地安全存储」与「Netlify 托管」的安心指引</h4>
            <span className="text-[10px] text-morandi-charcoal/40 font-mono">COOKIES & LOCALSTORAGE SAFETY</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 leading-relaxed text-morandi-charcoal/80">
            <div className="space-y-1">
              <p className="font-semibold text-morandi-charcoal flex items-center space-x-1">
                <Cpu className="w-3.5 h-3.5 text-morandi-sage" />
                <span>无后端、无泄露</span>
              </p>
              <p className="text-[11px] text-morandi-charcoal/60">
                本网页专为 Netlify 等现代静态网络平台优化，完全运行于您的个人浏览器中。绝不收集、不传输您的任何番茄钟或称呼隐私，干净无杂质。
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-morandi-charcoal flex items-center space-x-1">
                <Sparkles className="w-3.5 h-3.5 text-morandi-rose" />
                <span>即时自动存档</span>
              </p>
              <p className="text-[11px] text-morandi-charcoal/60">
                当您在倒数完成、勾选待办事项、或是调整白噪音音量时，背景会以毫秒级速度存档。您甚至可以在离线无网络的状态下完美运作。
              </p>
            </div>

            <div className="space-y-1">
              <p className="font-semibold text-morandi-charcoal flex items-center space-x-1">
                <RefreshCw className="w-3.5 h-3.5 text-morandi-slate" />
                <span>完美的转移兼容性</span>
              </p>
              <p className="text-[11px] text-morandi-charcoal/60">
                如果您需要清理浏览器、更换新电脑，只要点击<strong>手动『导出数据』</strong>，并在新设备上<strong>手动『导入数据』</strong>即可一秒无缝延续您的专注旅程。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
