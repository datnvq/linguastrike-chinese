import React, { useState, useEffect } from 'react';
import {
  X,
  Search,
  Volume2,
  BookOpen,
  Download,
  ChevronDown,
  Copy,
  Check,
  LayoutGrid,
  List
} from 'lucide-react';
import { CHINESE_HSK_DATA } from '../data/vocabData';
import { soundManager } from '../game/SoundManager';
import type { HskLevel, WordItem } from '../types/game';

interface VocabLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  customWords?: WordItem[];
}

export const VocabLibraryModal: React.FC<VocabLibraryModalProps> = ({
  isOpen,
  onClose,
  customWords = [],
}) => {
  const [selectedFilter, setSelectedFilter] = useState<HskLevel>('Tất cả');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [visibleCount, setVisibleCount] = useState<number>(60);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [playingWordId, setPlayingWordId] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const allWords = [...CHINESE_HSK_DATA, ...customWords];

  const filteredWords = allWords.filter(word => {
    const matchesLevel = selectedFilter === 'Tất cả' || word.hskLevel === selectedFilter;
    const s = searchTerm.trim().toLowerCase();
    const matchesSearch =
      s === '' ||
      word.fullWord.includes(s) ||
      word.pinyinSpaced.toLowerCase().includes(s) ||
      word.meaning.toLowerCase().includes(s) ||
      (word.hanViet && word.hanViet.toLowerCase().includes(s)) ||
      (word.meaningEn && word.meaningEn.toLowerCase().includes(s)) ||
      (word.category && word.category.toLowerCase().includes(s));
    return matchesLevel && matchesSearch;
  });

  const levels: HskLevel[] = ['Tất cả', 'HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'Đời sống'];

  const playAudio = (word: WordItem) => {
    setPlayingWordId(word.id);
    soundManager.speak(word.audioText, word.language, true);
    setTimeout(() => setPlayingWordId(null), 1200);
  };

  const handleCopyWord = (word: WordItem) => {
    const textToCopy = `${word.fullWord} [${word.pinyinSpaced}] : ${word.meaning}`;
    navigator.clipboard.writeText(textToCopy);
    setCopiedId(word.id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const displayedSlice = filteredWords.slice(0, visibleCount);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Kho từ vựng HSK"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none font-sans text-[#ede7dc]"
    >
      <div className="bg-[#1c1a17] border-2 border-[#2f2b25] w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#2f2b25] flex items-center justify-between bg-[#141311]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <span className="font-extrabold text-white text-base font-display tracking-wide">
              KHO TỪ VỰNG HSK ({allWords.length.toLocaleString()} từ)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 bg-[#141311] border border-[#2f2b25] rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                title="Dạng thẻ"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'grid' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-stone-400 hover:text-white'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('table')}
                title="Dạng bảng"
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table' ? 'bg-amber-500/20 text-amber-400 font-bold' : 'text-stone-400 hover:text-white'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer hover:bg-[#25221d]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Downloads Bar */}
        <div className="px-5 py-2 bg-[#141311]/80 border-b border-[#2f2b25] flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-stone-400">
            Hán tự, Pinyin, Từ loại, Nghĩa tiếng Việt
          </span>

          <div className="flex items-center gap-2">
            <a
              href="/data/HSK3.0_1-6_tu_vung_nghia_Viet.xlsx"
              download="HSK3.0_1-6_tu_vung_nghia_Viet.xlsx"
              className="inline-flex items-center gap-1 text-stone-300 hover:text-amber-400 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-500" />
              <span>Tải file gốc Excel</span>
            </a>
            <span className="text-stone-600">•</span>
            <a
              href="/data/mau_nhap_tu_vung_hsk.xlsx"
              download="mau_nhap_tu_vung_hsk.xlsx"
              className="inline-flex items-center gap-1 text-stone-300 hover:text-amber-400 transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-amber-500" />
              <span>Tải file mẫu Excel</span>
            </a>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="p-4 border-b border-slate-800 space-y-2.5 bg-slate-950/20">
          <div className="flex flex-wrap gap-1.5">
            {levels.map(lvl => {
              const count = lvl === 'Tất cả' ? allWords.length : allWords.filter(w => w.hskLevel === lvl).length;
              const isSelected = selectedFilter === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => {
                    setSelectedFilter(lvl);
                    setVisibleCount(60);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 text-white font-semibold'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {lvl} ({count.toLocaleString()})
                </button>
              );
            })}
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setVisibleCount(60);
              }}
              placeholder="Tìm theo chữ Hán, Pinyin, nghĩa..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
            />
          </div>
        </div>

        {/* Word Display Area */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {filteredWords.length === 0 ? (
            <div className="text-center py-16 text-slate-500 text-xs">
              Không tìm thấy từ vựng phù hợp với "{searchTerm}"
            </div>
          ) : viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {displayedSlice.map((word, idx) => (
                  <div
                    key={`${word.id}-${idx}`}
                    className="bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 rounded-xl p-3 flex items-start justify-between gap-2.5 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-1 text-[10px] text-slate-400">
                        <span className="px-1 py-0.2 bg-slate-900 rounded font-mono text-cyan-400">
                          {word.hskLevel}
                        </span>
                        {word.category && (
                          <span className="truncate max-w-[120px]">
                            • {word.category}
                          </span>
                        )}
                      </div>

                      <div className="flex items-baseline gap-2 mb-0.5">
                        <span className="font-bold text-xl text-white font-mono">
                          {word.fullWord}
                        </span>
                        <span className="text-xs text-amber-300 font-mono">
                          [{word.pinyinSpaced}]
                        </span>
                      </div>

                      {word.hanViet && (
                        <div className="text-[11px] text-slate-400 mb-0.5">
                          Hán-Việt: <span className="text-slate-300">{word.hanViet}</span>
                        </div>
                      )}

                      <div className="text-xs text-slate-300 truncate">
                        {word.meaning}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => playAudio(word)}
                        title="Nghe phát âm"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          playingWordId === word.id
                            ? 'bg-cyan-500 text-slate-950'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleCopyWord(word)}
                        title="Sao chép từ"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        {copiedId === word.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {visibleCount < filteredWords.length && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 60)}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Xem thêm (còn {(filteredWords.length - visibleCount).toLocaleString()} từ)</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px]">
                    <th className="py-2 px-3">Cấp độ</th>
                    <th className="py-2 px-3">Hán tự</th>
                    <th className="py-2 px-3">Pinyin</th>
                    <th className="py-2 px-3">Hán-Việt</th>
                    <th className="py-2 px-3">Nghĩa tiếng Việt</th>
                    <th className="py-2 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {displayedSlice.map((word, idx) => (
                    <tr key={`${word.id}-${idx}`} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-2 px-3 text-cyan-400 font-mono text-[10px]">
                        {word.hskLevel}
                      </td>
                      <td className="py-2 px-3 font-semibold text-white text-base font-mono">
                        {word.fullWord}
                      </td>
                      <td className="py-2 px-3 text-amber-300 font-mono">
                        {word.pinyinSpaced}
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {word.hanViet || '—'}
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {word.meaning}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => playAudio(word)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors cursor-pointer"
                            title="Nghe"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCopyWord(word)}
                            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded transition-colors cursor-pointer"
                            title="Sao chép"
                          >
                            {copiedId === word.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {visibleCount < filteredWords.length && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 60)}
                    className="inline-flex items-center gap-1 px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Xem thêm</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950/60 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>
            {Math.min(visibleCount, filteredWords.length).toLocaleString()} / {filteredWords.length.toLocaleString()} từ
          </span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
