import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Search,
  Volume2,
  BookOpen,
  ChevronDown,
  Copy,
  Check,
  LayoutGrid,
  List,
  ExternalLink,
  RotateCcw
} from 'lucide-react';
import { CHINESE_HSK_DATA, getLessonsByLevel, getTopicsByLevel } from '../data/vocabData';
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
  const [librarySource, setLibrarySource] = useState<'all' | 'system' | 'custom'>('all');
  const [selectedFilter, setSelectedFilter] = useState<HskLevel>('Tất cả');
  const [selectedLesson, setSelectedLesson] = useState<string>('all');
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
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

  const allWords = useMemo(() => [...CHINESE_HSK_DATA, ...customWords], [customWords]);

  const currentSourceWords = useMemo(() => {
    if (librarySource === 'custom') return customWords;
    if (librarySource === 'system') return CHINESE_HSK_DATA;
    return allWords;
  }, [librarySource, customWords, allWords]);

  // Lessons of current filter
  const availableLessons = useMemo(() => {
    if (selectedFilter === 'Tất cả' || selectedFilter === 'Đời sống' || selectedFilter === 'Tự nạp') {
      return [];
    }
    return getLessonsByLevel(selectedFilter);
  }, [selectedFilter]);

  // Topics of current filter
  const availableTopics = useMemo(() => {
    if (selectedFilter === 'Tất cả' || selectedFilter === 'Đời sống' || selectedFilter === 'Tự nạp') {
      return [];
    }
    return getTopicsByLevel(selectedFilter);
  }, [selectedFilter]);

  const filteredWords = useMemo(() => {
    return currentSourceWords.filter(word => {
      const matchesLevel =
        selectedFilter === 'Tất cả' || (word.hskLevel || 'Đời sống') === selectedFilter;
      const matchesLesson =
        selectedLesson === 'all' || word.lessonNumber === selectedLesson;
      const matchesTopic =
        selectedTopic === 'all' || word.topic === selectedTopic;
      const s = searchTerm.trim().toLowerCase();
      const matchesSearch =
        s === '' ||
        word.fullWord.includes(s) ||
        word.pinyinSpaced.toLowerCase().includes(s) ||
        word.meaning.toLowerCase().includes(s) ||
        (word.hanViet && word.hanViet.toLowerCase().includes(s)) ||
        (word.meaningEn && word.meaningEn.toLowerCase().includes(s)) ||
        (word.category && word.category.toLowerCase().includes(s)) ||
        (word.lessonNumber && word.lessonNumber.toLowerCase().includes(s)) ||
        (word.lessonTitleVi && word.lessonTitleVi.toLowerCase().includes(s)) ||
        (word.topic && word.topic.toLowerCase().includes(s));

      return matchesLevel && matchesLesson && matchesTopic && matchesSearch;
    });
  }, [currentSourceWords, selectedFilter, selectedLesson, selectedTopic, searchTerm]);

  if (!isOpen) return null;

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
      <div className="bg-[#1c1a17] border-2 border-[#2f2b25] w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-[#2f2b25] flex items-center justify-between bg-[#141311]">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <span className="font-extrabold text-white text-base font-display tracking-wide">
              KHO TỪ VỰNG & GIÁO TRÌNH ({allWords.length.toLocaleString()} từ)
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
              className="p-1.5 text-stone-400 hover:text-white rounded-lg hover:bg-[#25221d] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-3 border-b border-[#2f2b25] bg-[#171513] space-y-2.5">
          {/* Top Source Switcher Tabs */}
          <div className="flex items-center gap-1.5 border-b border-[#28241e] pb-2">
            <span className="text-[11px] font-display uppercase tracking-wider text-stone-400 mr-2">
              Nguồn từ:
            </span>
            <button
              onClick={() => {
                setLibrarySource('all');
                setVisibleCount(60);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                librarySource === 'all'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Tất cả ({allWords.length.toLocaleString()})
            </button>
            <button
              onClick={() => {
                setLibrarySource('system');
                setVisibleCount(60);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                librarySource === 'system'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              🏛️ 146 Bài học Giáo trình ({CHINESE_HSK_DATA.length.toLocaleString()})
            </button>
            <button
              onClick={() => {
                setLibrarySource('custom');
                setVisibleCount(60);
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                librarySource === 'custom'
                  ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              ⭐ Bộ từ của tôi ({customWords.length.toLocaleString()})
            </button>
          </div>

          {/* Level Pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {levels.map(lvl => {
              const count =
                lvl === 'Tất cả'
                  ? currentSourceWords.length
                  : currentSourceWords.filter(w => (w.hskLevel || 'Đời sống') === lvl).length;
              const isSelected = selectedFilter === lvl;
              return (
                <button
                  key={lvl}
                  onClick={() => {
                    setSelectedFilter(lvl);
                    setSelectedLesson('all');
                    setSelectedTopic('all');
                    setVisibleCount(60);
                  }}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50 font-bold shadow-sm'
                      : count === 0
                      ? 'text-stone-600 border border-[#22201c] bg-[#121110]'
                      : 'text-stone-400 hover:text-stone-200 hover:bg-[#25221d] border border-[#2f2b25]'
                  }`}
                >
                  {lvl} ({count.toLocaleString()})
                </button>
              );
            })}
          </div>

          {/* Sub-Filter: Bài học hoặc Chủ đề cụ thể (Khi chọn HSK 1 - 6) */}
          {availableLessons.length > 0 && (
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1 border-t border-[#25211c]">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <span className="text-[11px] text-amber-400 font-semibold shrink-0">
                  📚 Bài học:
                </span>
                <select
                  value={selectedLesson}
                  onChange={e => {
                    setSelectedLesson(e.target.value);
                    setVisibleCount(60);
                  }}
                  className="bg-[#141311] border border-[#353028] text-stone-200 text-xs rounded-lg px-2.5 py-1.5 flex-1 focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="all">-- Tất cả {availableLessons.length} bài học --</option>
                  {availableLessons.map(l => (
                    <option key={l.id} value={l.lessonNumber}>
                      {l.lessonNumber}: {l.titleVi} ({l.titleZh}) — {l.wordCount} từ
                    </option>
                  ))}
                </select>
              </div>

              {availableTopics.length > 0 && (
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  <span className="text-[11px] text-amber-400 font-semibold shrink-0">
                    🏷️ Chủ đề:
                  </span>
                  <select
                    value={selectedTopic}
                    onChange={e => {
                      setSelectedTopic(e.target.value);
                      setVisibleCount(60);
                    }}
                    className="bg-[#141311] border border-[#353028] text-stone-200 text-xs rounded-lg px-2.5 py-1.5 flex-1 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="all">-- Tất cả {availableTopics.length} chủ đề --</option>
                    {availableTopics.map(t => (
                      <option key={t.id} value={t.topicName}>
                        {t.topicName} ({t.wordCount} từ)
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {(selectedLesson !== 'all' || selectedTopic !== 'all') && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedLesson('all');
                    setSelectedTopic('all');
                  }}
                  className="px-2 py-1.5 bg-[#25221d] hover:bg-[#322d26] border border-[#353028] text-stone-300 text-xs rounded-lg flex items-center justify-center gap-1 transition-colors cursor-pointer shrink-0"
                >
                  <RotateCcw className="w-3 h-3 text-amber-400" />
                  <span>Xóa lọc</span>
                </button>
              )}
            </div>
          )}

          {/* Search Box */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-stone-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => {
                setSearchTerm(e.target.value);
                setVisibleCount(60);
              }}
              placeholder="Tìm theo chữ Hán, Pinyin, nghĩa tiếng Việt, bài học, chủ đề..."
              className="w-full bg-[#121110] border border-[#2f2b25] rounded-xl pl-9 pr-4 py-2 text-xs text-stone-200 focus:outline-none focus:border-amber-500/70"
            />
          </div>
        </div>

        {/* Word Display Area */}
        <div className="p-4 overflow-y-auto custom-scrollbar flex-1">
          {filteredWords.length === 0 ? (
            <div className="text-center py-16 text-stone-400 text-xs space-y-2">
              <p className="text-base text-stone-300 font-bold mb-1">Không tìm thấy từ vựng phù hợp</p>
              <p className="text-stone-400">Hãy thử tìm từ khóa khác hoặc xóa bớt điều kiện lọc bài học/chủ đề.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {displayedSlice.map((word, idx) => (
                  <div
                    key={`${word.id}-${idx}`}
                    className="bg-[#161412] border border-[#29251f] hover:border-amber-500/40 rounded-xl p-3 flex items-start justify-between gap-2.5 transition-all shadow-sm"
                  >
                    <div className="flex-1 min-w-0">
                      {/* Meta badges */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5 text-[10px]">
                        <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded font-mono font-bold text-amber-400">
                          {word.hskLevel}
                        </span>
                        {word.lessonNumber && (
                          <span className="px-1.5 py-0.5 bg-[#25221d] border border-[#353028] rounded font-mono text-stone-300">
                            {word.lessonNumber}
                          </span>
                        )}
                        {word.category && (
                          <span className="text-stone-400 truncate max-w-[100px]">
                            • {word.category}
                          </span>
                        )}
                      </div>

                      {/* Hanzi + Pinyin */}
                      <div className="flex items-baseline gap-2 mb-1">
                        <span className="font-bold text-xl text-white font-hanzi">
                          {word.fullWord}
                        </span>
                        <span className="text-xs text-amber-300 font-mono">
                          [{word.pinyinSpaced}]
                        </span>
                      </div>

                      {/* Lesson title or topic if available */}
                      {word.lessonTitleVi && (
                        <div className="text-[10px] text-stone-400 mb-0.5 truncate">
                          📖 {word.lessonTitleVi} {word.topic ? `(${word.topic})` : ''}
                        </div>
                      )}

                      {/* Meaning */}
                      <div className="text-xs text-stone-200 truncate font-medium">
                        {word.meaning}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-1 shrink-0">
                      <button
                        onClick={() => playAudio(word)}
                        title="Nghe phát âm"
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          playingWordId === word.id
                            ? 'bg-amber-500 text-stone-950 font-bold'
                            : 'bg-[#25221d] hover:bg-[#322d26] text-stone-300'
                        }`}
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleCopyWord(word)}
                        title="Sao chép từ"
                        className="p-1.5 bg-[#25221d] hover:bg-[#322d26] text-stone-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                      >
                        {copiedId === word.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      {word.lessonUrl && (
                        <a
                          href={word.lessonUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Xem bài học trên XieHanzi"
                          className="p-1.5 bg-[#25221d] hover:bg-[#322d26] text-stone-400 hover:text-amber-400 rounded-lg transition-colors cursor-pointer flex items-center justify-center"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {visibleCount < filteredWords.length && (
                <div className="mt-4 text-center">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 60)}
                    className="inline-flex items-center gap-1 px-4 py-2 bg-[#25221d] hover:bg-[#322d26] border border-[#353028] text-stone-200 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Xem thêm (còn {(filteredWords.length - visibleCount).toLocaleString()} từ)</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Table View */
            <div className="overflow-x-auto border border-[#2b2721] rounded-xl bg-[#141311]">
              <table className="w-full text-left text-xs text-stone-300 border-collapse">
                <thead className="bg-[#1b1915] text-[11px] uppercase tracking-wider text-stone-400 border-b border-[#2b2721]">
                  <tr>
                    <th className="py-2.5 px-3">STT</th>
                    <th className="py-2.5 px-3">Cấp độ</th>
                    <th className="py-2.5 px-3">Bài học</th>
                    <th className="py-2.5 px-3">Hán tự</th>
                    <th className="py-2.5 px-3">Pinyin</th>
                    <th className="py-2.5 px-3">Nghĩa tiếng Việt</th>
                    <th className="py-2.5 px-3">Chủ đề</th>
                    <th className="py-2.5 px-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#24201a]">
                  {displayedSlice.map((word, idx) => (
                    <tr key={`${word.id}-${idx}`} className="hover:bg-[#1a1815] transition-colors">
                      <td className="py-2 px-3 font-mono text-stone-500 text-[11px]">{idx + 1}</td>
                      <td className="py-2 px-3">
                        <span className="px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/30 rounded font-mono font-bold text-amber-400 text-[10px]">
                          {word.hskLevel}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-stone-300 text-xs font-mono">
                        {word.lessonNumber || '—'}
                      </td>
                      <td className="py-2 px-3 font-bold text-base text-white font-hanzi">
                        {word.fullWord}
                      </td>
                      <td className="py-2 px-3 text-amber-300 font-mono text-xs">
                        [{word.pinyinSpaced}]
                      </td>
                      <td className="py-2 px-3 text-stone-200 text-xs">
                        {word.meaning}
                      </td>
                      <td className="py-2 px-3 text-stone-400 text-xs truncate max-w-[150px]">
                        {word.topic || word.category || '—'}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => playAudio(word)}
                            title="Nghe phát âm"
                            className="p-1 text-stone-400 hover:text-white rounded hover:bg-[#25221d] cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCopyWord(word)}
                            title="Sao chép"
                            className="p-1 text-stone-400 hover:text-white rounded hover:bg-[#25221d] cursor-pointer"
                          >
                            {copiedId === word.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                          {word.lessonUrl && (
                            <a
                              href={word.lessonUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Xem bài học"
                              className="p-1 text-stone-400 hover:text-amber-400 rounded hover:bg-[#25221d]"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {visibleCount < filteredWords.length && (
                <div className="p-3 text-center border-t border-[#2b2721]">
                  <button
                    onClick={() => setVisibleCount(prev => prev + 60)}
                    className="inline-flex items-center gap-1 px-4 py-1.5 bg-[#25221d] hover:bg-[#322d26] border border-[#353028] text-stone-200 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    <ChevronDown className="w-3.5 h-3.5" />
                    <span>Tải thêm</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#141311] border-t border-[#2f2b25] flex justify-between items-center text-xs text-stone-400">
          <div>
            Hiển thị <strong className="text-white font-mono">{displayedSlice.length.toLocaleString()}</strong> /{' '}
            <strong className="text-amber-400 font-mono">{filteredWords.length.toLocaleString()}</strong> từ
          </div>
          <button
            onClick={onClose}
            className="bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold px-5 py-2 rounded-xl text-xs transition-colors cursor-pointer font-display tracking-wider"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
