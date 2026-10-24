import React, { useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Settings,
  BookOpen,
  Home,
  Volume2
} from 'lucide-react';
import type { GameStats, ActiveWord } from '../types/game';
import { soundManager } from '../game/SoundManager';

interface PauseModalProps {
  isOpen: boolean;
  stats: GameStats;
  hp: number;
  maxHp: number;
  currentTarget: ActiveWord | null;
  onResume: () => void;
  onRestart: () => void;
  onOpenSettings: () => void;
  onOpenVocabLibrary: () => void;
  onGoHome: () => void;
}

export const PauseModal: React.FC<PauseModalProps> = ({
  isOpen,
  stats,
  hp,
  maxHp,
  currentTarget,
  onResume,
  onRestart,
  onOpenSettings,
  onOpenVocabLibrary,
  onGoHome,
}) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Only Escape key resumes (never letter keys)
      if (e.key === 'Escape') {
        e.preventDefault();
        onResume();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onResume]);

  if (!isOpen) return null;

  const playTargetAudio = () => {
    if (currentTarget) {
      soundManager.speak(currentTarget.wordItem.audioText, currentTarget.wordItem.language, true);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Tạm dừng"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none font-sans text-[#ede7dc]"
    >
      <div className="bg-[#1c1a17] border-2 border-[#2f2b25] w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 text-center border-b border-[#2f2b25] bg-[#141311]">
          <h2 className="text-xl font-extrabold text-[#fbf8f3] tracking-wide font-display">
            ĐANG TẠM DỪNG
          </h2>
          <p className="text-stone-400 text-xs mt-1">
            Nhấn <kbd className="px-1.5 py-0.5 bg-[#25221d] border border-[#3a342b] rounded text-stone-300 font-mono text-[11px]">Esc</kbd> để tiếp tục chơi
          </p>
        </div>

        {/* Stats */}
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-[#141311] border border-[#2c2822] rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-stone-400 block font-medium uppercase font-display">Máu</span>
              <span className="text-sm font-bold text-rose-400 font-mono mt-0.5 block">
                {hp}/{maxHp}
              </span>
            </div>

            <div className="bg-[#141311] border border-[#2c2822] rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-stone-400 block font-medium uppercase font-display">Điểm</span>
              <span className="text-sm font-bold text-amber-400 font-mono mt-0.5 block">
                {stats.score.toLocaleString()}
              </span>
            </div>

            <div className="bg-[#141311] border border-[#2c2822] rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-stone-400 block font-medium uppercase font-display">Đã gõ</span>
              <span className="text-sm font-bold text-emerald-400 font-mono mt-0.5 block">
                {stats.wordsDefeated}
              </span>
            </div>

            <div className="bg-[#141311] border border-[#2c2822] rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-stone-400 block font-medium uppercase font-display">Chuỗi</span>
              <span className="text-sm font-bold text-amber-400 font-mono mt-0.5 block">
                x{stats.combo}
              </span>
            </div>
          </div>

          {/* Current Target Word Preview */}
          {currentTarget && (
            <div className="bg-[#141311] border border-[#2c2822] rounded-xl p-3 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-stone-400 block font-medium mb-0.5 uppercase tracking-wider font-display">
                  Từ đang rơi:
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-white font-hanzi">
                    {currentTarget.wordItem.fullWord}
                  </span>
                  <span className="text-xs font-semibold text-amber-400 font-mono">
                    [{currentTarget.wordItem.pinyinSpaced}]
                  </span>
                </div>
                <div className="text-xs text-stone-300 mt-0.5">
                  {currentTarget.wordItem.meaning}
                  {currentTarget.wordItem.hanViet ? ` • Hán Việt: ${currentTarget.wordItem.hanViet}` : ''}
                </div>
              </div>

              <button
                onClick={playTargetAudio}
                title="Nghe phát âm"
                className="p-2 bg-[#25221d] hover:bg-[#322d26] text-amber-400 rounded-lg transition-colors cursor-pointer border border-[#3a342b]"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Primary Action: RESUME */}
          <button
            onClick={onResume}
            style={{ '--shadow-color': '#92400e' } as React.CSSProperties}
            className="tactile-btn w-full bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 text-sm cursor-pointer font-display uppercase tracking-wider"
          >
            <Play className="w-4 h-4 fill-stone-950" />
            <span>Tiếp tục (Esc)</span>
          </button>

          {/* Secondary Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={onRestart}
              className="flex items-center justify-center gap-1.5 p-2.5 bg-[#25221d] hover:bg-[#322d26] border border-[#3a342b] rounded-xl text-xs font-medium text-stone-300 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-stone-400" />
              <span>Chơi lại</span>
            </button>

            <button
              onClick={onOpenSettings}
              className="flex items-center justify-center gap-1.5 p-2.5 bg-[#25221d] hover:bg-[#322d26] border border-[#3a342b] rounded-xl text-xs font-medium text-stone-300 transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-stone-400" />
              <span>Cài đặt</span>
            </button>

            <button
              onClick={onOpenVocabLibrary}
              className="flex items-center justify-center gap-1.5 p-2.5 bg-[#25221d] hover:bg-[#322d26] border border-[#3a342b] rounded-xl text-xs font-medium text-stone-300 transition-colors cursor-pointer"
            >
              <BookOpen className="w-3.5 h-3.5 text-stone-400" />
              <span>Kho từ vựng</span>
            </button>

            <button
              onClick={onGoHome}
              className="flex items-center justify-center gap-1.5 p-2.5 bg-[#25221d] hover:bg-[#322d26] border border-[#3a342b] rounded-xl text-xs font-medium text-stone-300 transition-colors cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-stone-400" />
              <span>Về trang chủ</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
