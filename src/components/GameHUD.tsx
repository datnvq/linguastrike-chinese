import React from 'react';
import {
  Heart,
  Volume2,
  VolumeX,
  Settings,
  Pause,
  Play,
  Home,
  BookOpen,
  Zap,
  Flame,
  Snowflake
} from 'lucide-react';
import type { GameStats, Language, GameMode, SpawnMode, HskLevel } from '../types/game';

interface GameHUDProps {
  hp: number;
  maxHp: number;
  stats: GameStats;
  currentLanguage: Language;
  gameMode: GameMode;
  spawnMode: SpawnMode;
  selectedHsk: HskLevel;
  isPaused: boolean;
  isSoundMuted: boolean;
  onToggleMute: () => void;
  onActivateFreeze?: () => void;
  onTogglePause: () => void;
  onOpenSettings: () => void;
  onOpenVocabLibrary?: () => void;
  onReplayAudio: () => void;
  onGoHome: () => void;
}

export const GameHUD: React.FC<GameHUDProps> = ({
  hp,
  maxHp,
  stats,
  gameMode,
  selectedHsk,
  isPaused,
  isSoundMuted,
  onToggleMute,
  onActivateFreeze,
  onTogglePause,
  onOpenSettings,
  onOpenVocabLibrary,
  onReplayAudio,
  onGoHome,
}) => {
  const hpPercent = Math.max(0, Math.min(100, (hp / maxHp) * 100));
  const isLowHp = hpPercent <= 30;

  const energy = stats.energy ?? 0;
  const isSkillReady = energy >= 100;
  const wpm = stats.wpm ?? 0;

  return (
    <div className="absolute top-0 left-0 right-0 z-20 px-3 sm:px-6 py-2.5 flex items-center justify-between pointer-events-none select-none font-sans text-[#ede7dc]">
      {/* Left: Home + Health + Skill / Energy */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <button
          onClick={onGoHome}
          title="Về trang chủ"
          aria-label="Về trang chủ"
          className="bg-[#1c1a17]/95 hover:bg-[#2c2822] border border-[#353028] text-stone-300 hover:text-white p-2 rounded-xl transition-all cursor-pointer shadow-sm hover:border-amber-500/50"
        >
          <Home className="w-4 h-4" />
        </button>

        {gameMode === 'arcade' ? (
          <div className="bg-[#1c1a17]/95 border border-[#353028] rounded-xl px-3 py-1.5 flex items-center gap-2.5 shadow-md">
            <Heart className={`w-4 h-4 ${isLowHp ? 'text-rose-500 fill-rose-500 animate-pulse' : 'text-rose-400 fill-rose-400/80'}`} />
            <div className="flex flex-col">
              <div className="flex justify-between items-center text-[10px] text-stone-400 font-mono tracking-wider">
                <span className="uppercase">MÁU</span>
                <span className={isLowHp ? 'text-rose-400 font-bold ml-2' : 'text-stone-200 ml-2 font-mono font-bold'}>
                  {hp}/{maxHp}
                </span>
              </div>
              <div className="w-16 sm:w-24 h-1.5 bg-[#121110] rounded-full overflow-hidden mt-0.5 border border-[#2b2721]">
                <div
                  className={`h-full transition-all duration-200 rounded-full ${
                    isLowHp ? 'bg-rose-500' : 'bg-gradient-to-r from-rose-600 to-rose-400'
                  }`}
                  style={{ width: `${hpPercent}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-[#1c1a17]/95 border border-[#353028] rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-emerald-400 shadow-sm">
            ZEN
          </div>
        )}

        {/* Skill: Time Freeze Energy Bar */}
        <button
          onClick={() => {
            if (isSkillReady && onActivateFreeze) onActivateFreeze();
          }}
          disabled={!isSkillReady}
          title={isSkillReady ? 'Kích hoạt Đóng băng thời gian (Phím Shift)' : `Tích nộ: ${Math.round(energy)}%`}
          className={`px-2.5 py-1.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer shadow-sm ${
            isSkillReady
              ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.4)] animate-pulse'
              : 'bg-[#1c1a17]/95 border-[#353028] text-stone-500 cursor-not-allowed'
          }`}
        >
          <Snowflake className={`w-3.5 h-3.5 ${isSkillReady ? 'text-amber-300' : 'text-stone-500'}`} />
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider">
              {isSkillReady ? 'SẴN SÀNG!' : `${Math.round(energy)}% NỘ`}
            </span>
          </div>
          <span className="text-[9px] px-1 py-0.5 rounded bg-[#25221d] text-stone-400 font-mono hidden md:inline">
            Shift
          </span>
        </button>

        <div className="bg-[#1c1a17]/95 border border-[#353028] rounded-xl px-2.5 py-1.5 text-xs font-mono font-bold text-amber-400 hidden lg:block shadow-sm">
          {selectedHsk}
        </div>
      </div>

      {/* Center: Score + WPM + Fever Badge */}
      <div className="flex items-center gap-2 pointer-events-auto">
        <div className="flex items-center gap-3.5 bg-[#1c1a17]/95 border border-[#353028] px-4 py-1.5 rounded-xl shadow-md">
          <div className="flex flex-col items-center">
            <span className="text-[9px] text-stone-400 font-display uppercase tracking-widest">ĐIỂM</span>
            <span className="text-base sm:text-lg font-bold text-white font-mono leading-tight tracking-wider">
              {stats.score.toLocaleString()}
            </span>
          </div>

          {stats.combo > 1 && (
            <div className="pl-2.5 border-l border-[#2e2a24] flex flex-col items-center">
              <span className="text-[9px] text-amber-400 font-display uppercase tracking-widest">CHUỖI</span>
              <span className="text-sm font-bold text-amber-400 font-mono leading-tight">
                x{stats.combo}
              </span>
            </div>
          )}

          {/* Realtime WPM Indicator */}
          <div className="pl-2.5 border-l border-[#2e2a24] flex flex-col items-center">
            <span className="text-[9px] text-stone-400 font-display uppercase tracking-widest flex items-center gap-0.5">
              {wpm >= 60 ? (
                <Flame className="w-2.5 h-2.5 text-rose-400" />
              ) : (
                <Zap className="w-2.5 h-2.5 text-amber-400" />
              )}
              WPM
            </span>
            <span
              className={`text-sm font-bold font-mono leading-tight ${
                wpm >= 60
                  ? 'text-rose-400 font-black animate-pulse'
                  : wpm >= 35
                  ? 'text-amber-400'
                  : 'text-stone-300'
              }`}
            >
              {wpm}
            </span>
          </div>
        </div>

        {/* Fever Mode Glow Badge */}
        {stats.isFeverMode && (
          <div className="px-2.5 py-1 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 text-white font-black text-xs font-display tracking-wider uppercase animate-bounce shadow-lg flex items-center gap-1 border border-amber-300/40">
            <Flame className="w-3.5 h-3.5 fill-white text-white" />
            FEVER x2
          </div>
        )}
      </div>

      {/* Right Controls: Quick Mute + Replay + Vocab + Pause + Settings */}
      <div className="flex items-center gap-1.5 pointer-events-auto">
        {/* Quick Mute / Voice Toggle */}
        <button
          onClick={onToggleMute}
          title={isSoundMuted ? 'Bật âm thanh (M)' : 'Tắt âm thanh (M)'}
          aria-label={isSoundMuted ? 'Bật âm thanh' : 'Tắt âm thanh'}
          className={`p-2 rounded-xl border transition-all cursor-pointer flex items-center gap-1 shadow-sm ${
            isSoundMuted
              ? 'bg-rose-950/60 border-rose-800 text-rose-400'
              : 'bg-[#1c1a17]/95 hover:bg-[#2c2822] border-[#353028] hover:border-amber-500/50 text-stone-300 hover:text-white'
          }`}
        >
          {isSoundMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-amber-400" />}
          <span className="text-[10px] text-stone-400 font-mono hidden md:inline">M</span>
        </button>

        <button
          onClick={onReplayAudio}
          title="Nghe lại phát âm (Space)"
          aria-label="Nghe lại phát âm"
          className="bg-[#1c1a17]/95 hover:bg-[#2c2822] border border-[#353028] hover:border-amber-500/50 text-stone-300 hover:text-white p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
        >
          <span className="text-xs">🔊</span>
          <span className="text-[10px] text-stone-400 font-mono hidden md:inline">Space</span>
        </button>

        {onOpenVocabLibrary && (
          <button
            onClick={onOpenVocabLibrary}
            title="Kho từ vựng"
            aria-label="Kho từ vựng"
            className="bg-[#1c1a17]/95 hover:bg-[#2c2822] border border-[#353028] hover:border-amber-500/50 text-stone-300 hover:text-white p-2 rounded-xl transition-all cursor-pointer shadow-sm"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={onTogglePause}
          title={isPaused ? 'Tiếp tục' : 'Tạm dừng (Esc)'}
          aria-label={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
          className="bg-[#1c1a17]/95 hover:bg-[#2c2822] border border-[#353028] hover:border-amber-500/50 text-stone-300 hover:text-white p-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-sm"
        >
          {isPaused ? <Play className="w-4 h-4 text-emerald-400" /> : <Pause className="w-4 h-4" />}
          <span className="text-[10px] text-stone-400 font-mono hidden md:inline">Esc</span>
        </button>

        <button
          onClick={onOpenSettings}
          title="Cài đặt"
          aria-label="Cài đặt"
          className="bg-[#1c1a17]/95 hover:bg-[#2c2822] border border-[#353028] hover:border-amber-500/50 text-stone-300 hover:text-white p-2 rounded-xl transition-all cursor-pointer shadow-sm"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
