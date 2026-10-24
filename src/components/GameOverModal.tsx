import React, { useState } from 'react';
import {
  RotateCcw,
  Volume2,
  Copy,
  Check,
  RotateCw
} from 'lucide-react';
import type { GameStats, WordItem } from '../types/game';
import { soundManager } from '../game/SoundManager';

interface GameOverModalProps {
  isOpen: boolean;
  stats: GameStats;
  onRestart: () => void;
  onChangeSettings: () => void;
  onPracticeMissed?: (missed: WordItem[]) => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  stats,
  onRestart,
  onChangeSettings,
  onPracticeMissed,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const accuracyPercent = stats.totalKeystrokes > 0
    ? Math.round((stats.correctKeystrokes / stats.totalKeystrokes) * 100)
    : 0;

  const playWordAudio = (word: WordItem) => {
    soundManager.speak(word.audioText, word.language, true);
  };

  const handleCopyWord = (word: WordItem) => {
    const textToCopy = `${word.fullWord} [${word.pinyinSpaced}] : ${word.meaning}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(word.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kết quả lượt chơi"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none font-sans text-[#ede7dc]"
    >
      <div className="bg-[#1c1a17] border-2 border-[#2f2b25] w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 text-center border-b border-[#2f2b25] bg-[#141311]">
          <h2 className="text-xl font-extrabold text-[#fbf8f3] tracking-wide font-display">
            KẾT THÚC LƯỢT CHƠI
          </h2>
          <p className="text-stone-400 text-xs mt-1">
            {stats.wordsMissed.length > 0
              ? `Có ${stats.wordsMissed.length} từ chưa kịp gõ chạm đáy phòng thủ.`
              : 'Tuyệt vời! Bạn đã hoàn thành xuất sắc lượt chơi này!'}
          </p>
        </div>

        {/* Stats Grid */}
        <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar">
          <div className="grid grid-cols-4 gap-2">
            <div className="bg-[#141311] border border-[#2c2822] rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-stone-400 block font-medium uppercase font-display">Điểm số</span>
              <span className="text-base font-bold text-amber-400 font-mono mt-0.5 block">
                {stats.score.toLocaleString()}
              </span>
            </div>

            <div className="bg-[#141311] border border-[#2c2822] rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-stone-400 block font-medium uppercase font-display">Từ đã gõ</span>
              <span className="text-base font-bold text-emerald-400 font-mono mt-0.5 block">
                {stats.wordsDefeated}
              </span>
            </div>

            <div className="bg-[#141311] border border-[#2c2822] rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-stone-400 block font-medium uppercase font-display">Chuỗi cao</span>
              <span className="text-base font-bold text-amber-400 font-mono mt-0.5 block">
                x{stats.maxCombo}
              </span>
            </div>

            <div className="bg-[#141311] border border-[#2c2822] rounded-xl p-2.5 text-center">
              <span className="text-[10px] text-stone-400 block font-medium uppercase font-display">Độ chuẩn</span>
              <span className="text-base font-bold text-stone-200 font-mono mt-0.5 block">
                {accuracyPercent}%
              </span>
            </div>
          </div>

          {/* Missed Words Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-stone-300 font-display uppercase tracking-wider">
                Từ chưa kịp gõ ({stats.wordsMissed.length})
              </span>
              <span className="text-[11px] text-stone-500 font-mono">Click 🔊 để nghe âm</span>
            </div>

            {stats.wordsMissed.length === 0 ? (
              <div className="bg-[#141311] border border-[#2c2822] rounded-xl p-4 text-center text-stone-400 text-xs">
                Bạn đã hoàn thành chính xác tất cả các từ trong lượt chơi này!
              </div>
            ) : (
              <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1 custom-scrollbar">
                {stats.wordsMissed.map((word, index) => (
                  <div
                    key={`${word.id}-${index}`}
                    className="bg-[#141311] border border-[#2c2822] hover:border-amber-500/50 rounded-xl p-2.5 flex items-center justify-between transition-all"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => playWordAudio(word)}
                        className="bg-[#25221d] hover:bg-[#322d26] text-amber-400 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 border border-[#3a342b]"
                        title="Nghe phát âm"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>

                      <div className="min-w-0">
                        <div className="flex items-baseline gap-1.5 flex-wrap">
                          <span className="font-bold text-white text-base font-hanzi">
                            {word.fullWord}
                          </span>
                          <span className="text-xs text-amber-400 font-mono font-medium">
                            [{word.pinyinSpaced || word.phonetic || ''}]
                          </span>
                          {word.hanViet && (
                            <span className="text-[10px] text-stone-400">
                              ({word.hanViet})
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-stone-300 truncate">
                          {word.meaning}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleCopyWord(word)}
                        title="Sao chép từ"
                        className="p-1 text-stone-500 hover:text-stone-300 transition-colors cursor-pointer"
                      >
                        {copiedId === word.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <span className="text-[11px] font-mono text-stone-400 bg-[#221f1a] px-2 py-0.5 rounded border border-[#353028]">
                        {word.latinInput}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#141311] border-t border-[#2f2b25] flex flex-col sm:flex-row gap-2">
          {stats.wordsMissed.length > 0 && onPracticeMissed && (
            <button
              onClick={() => onPracticeMissed(stats.wordsMissed)}
              className="bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 font-semibold py-2.5 px-3.5 rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Luyện lại {stats.wordsMissed.length} từ này</span>
            </button>
          )}

          <div className="flex gap-2 flex-1">
            <button
              onClick={onChangeSettings}
              className="flex-1 bg-[#25221d] hover:bg-[#322d26] text-stone-300 font-medium py-2.5 px-3 rounded-xl border border-[#3a342b] text-xs transition-colors cursor-pointer"
            >
              Cài đặt
            </button>
            <button
              onClick={onRestart}
              style={{ '--shadow-color': '#92400e' } as React.CSSProperties}
              className="tactile-btn flex-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold py-2.5 px-4 rounded-xl flex items-center justify-center gap-1.5 text-xs cursor-pointer font-display uppercase tracking-wider"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Chơi lại</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
