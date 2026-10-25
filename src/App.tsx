import React, { useState, useMemo } from 'react';
import { CanvasGame } from './components/CanvasGame';
import { SettingsModal } from './components/SettingsModal';
import { VocabLibraryModal } from './components/VocabLibraryModal';
import {
  Play,
  Volume2,
  Settings,
  FileText,
  BookOpen,
  Headphones,
  Brain,
  Eye,
  BookMarked,
  Coffee,
  Zap,
  ExternalLink,
  Layers,
  RotateCcw
} from 'lucide-react';
import {
  CHINESE_HSK_DATA,
  CHINESE_XIEHANZI_DATA,
  CHINESE_HSK30_DATA,
  getLessonsByLevel,
  getTopicsByLevel
} from './data/vocabData';
import { soundManager } from './game/SoundManager';
import type { GameSettings, HskLevel, GamePlayMode, WordItem } from './types/game';

export const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isHomeSettingsOpen, setIsHomeSettingsOpen] = useState<boolean>(false);
  const [isVocabLibraryOpen, setIsVocabLibraryOpen] = useState<boolean>(false);
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState<boolean>(false);
  const [scopeSubTab, setScopeSubTab] = useState<'lesson' | 'topic'>('lesson');

  // Load High Score
  const [highScore] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('linguablaster_chinese_highscore');
      return saved ? parseInt(saved, 10) || 0 : 0;
    } catch {
      return 0;
    }
  });

  // Custom Words Deck from LocalStorage
  const [customWords, setCustomWords] = useState<WordItem[]>(() => {
    try {
      const saved = localStorage.getItem('linguastrike_custom_words');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const saveCustomWordsToStorage = (words: WordItem[]) => {
    try {
      localStorage.setItem('linguastrike_custom_words', JSON.stringify(words));
    } catch (e) {
      console.warn('Could not save custom words to localStorage', e);
    }
  };

  // 1. Ghi đè file mới luôn khi add file
  const handleSetCustomWords = (newWords: WordItem[]) => {
    setCustomWords(newWords);
    saveCustomWordsToStorage(newWords);
  };

  // 2. Thêm từ mới hoặc sửa từ
  const handleSaveCustomWord = (word: WordItem, targetIndex?: number) => {
    setCustomWords(prev => {
      let updated: WordItem[];
      if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < prev.length) {
        updated = [...prev];
        updated[targetIndex] = word;
      } else {
        const existingIdx = prev.findIndex(w => w.fullWord === word.fullWord);
        if (existingIdx !== -1) {
          updated = [...prev];
          updated[existingIdx] = word;
        } else {
          updated = [...prev, word];
        }
      }
      saveCustomWordsToStorage(updated);
      return updated;
    });
  };

  // 3. Xử lý khi thêm danh sách từ
  const handleAddCustomWords = (newWords: WordItem[]) => {
    setCustomWords(prev => {
      const updated = [...prev];
      newWords.forEach(nw => {
        const existingIdx = updated.findIndex(w => w.fullWord === nw.fullWord);
        if (existingIdx !== -1) {
          updated[existingIdx] = nw;
        } else {
          updated.push(nw);
        }
      });
      saveCustomWordsToStorage(updated);
      return updated;
    });
  };

  // 4. Xóa 1 từ cụ thể
  const handleDeleteCustomWord = (wordId: string) => {
    setCustomWords(prev => {
      const updated = prev.filter(w => w.id !== wordId);
      saveCustomWordsToStorage(updated);
      return updated;
    });
  };

  // 5. Xóa toàn bộ
  const handleClearCustomWords = () => {
    setCustomWords([]);
    try {
      localStorage.removeItem('linguastrike_custom_words');
    } catch {
      // ignore
    }
  };

  const [configuredSettings, setConfiguredSettings] = useState<GameSettings>({
    language: 'zh',
    inputMode: 'latin',
    playMode: 'hanzi_to_pinyin',
    clozeStyle: 'reveal_on_type',
    spawnMode: 'single',
    gameMode: 'practice', // Mặc định chế độ Zen thư giãn không áp lực
    vocabSource: 'system',
    curriculum: 'xiehanzi', // Giáo trình Chuẩn XieHanzi 146 bài
    selectedHsk: 'HSK 1',
    selectedLessonNumber: 'all',
    selectedTopic: 'all',
    requireTones: false,
    showHints: false,
    showTypingGuide: false,
    showHanViet: true,
    showMeaningHint: true,
    enableBossFight: true,
    repeatMissedWords: true,
    speedMultiplier: 1.0,
    soundEnabled: true,
    autoPronounce: true,
    ttsVolume: 0.9,
    sfxVolume: 0.5,
    ttsRate: 0.95,
  });

  // Dynamic system counts
  const systemCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'HSK 1': 0,
      'HSK 2': 0,
      'HSK 3': 0,
      'HSK 4': 0,
      'HSK 5': 0,
      'HSK 6': 0,
      'Đời sống': 0,
    };
    const activeData = configuredSettings.curriculum === 'hsk30' ? CHINESE_HSK30_DATA : CHINESE_XIEHANZI_DATA;
    activeData.forEach(w => {
      if (w.hskLevel && counts[w.hskLevel] !== undefined) {
        counts[w.hskLevel]++;
      }
    });
    return counts;
  }, [configuredSettings.curriculum]);

  const customCounts = useMemo(() => {
    const counts: Record<string, number> = {
      'HSK 1': 0,
      'HSK 2': 0,
      'HSK 3': 0,
      'HSK 4': 0,
      'HSK 5': 0,
      'HSK 6': 0,
      'Đời sống': 0,
    };
    customWords.forEach(w => {
      const lvl = w.hskLevel || 'Đời sống';
      if (counts[lvl] !== undefined) {
        counts[lvl]++;
      } else {
        counts['Đời sống']++;
      }
    });
    return counts;
  }, [customWords]);

  const activeSource = configuredSettings.vocabSource || 'system';

  const hskPills = useMemo(() => {
    const levels: HskLevel[] = ['Tất cả', 'HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'Đời sống'];
    const activeData = configuredSettings.curriculum === 'hsk30' ? CHINESE_HSK30_DATA : CHINESE_XIEHANZI_DATA;

    return levels.map(lvl => {
      let countNum = 0;
      if (lvl === 'Tất cả') {
        if (activeSource === 'custom') countNum = customWords.length;
        else if (activeSource === 'both') countNum = activeData.length + customWords.length;
        else countNum = activeData.length;
      } else {
        const sysC = systemCounts[lvl] || 0;
        const cusC = customCounts[lvl] || 0;
        if (activeSource === 'custom') countNum = cusC;
        else if (activeSource === 'both') countNum = sysC + cusC;
        else countNum = sysC;
      }

      return {
        level: lvl,
        rawCount: countNum,
        count: `${countNum.toLocaleString()} từ`,
      };
    });
  }, [activeSource, customWords.length, customCounts, systemCounts, configuredSettings.curriculum]);

  // Lessons of currently selected HSK level (Zero hardcoding)
  const availableLessons = useMemo(() => {
    return getLessonsByLevel(configuredSettings.selectedHsk);
  }, [configuredSettings.selectedHsk]);

  // Topics of currently selected HSK level (Zero hardcoding)
  const availableTopics = useMemo(() => {
    return getTopicsByLevel(configuredSettings.selectedHsk);
  }, [configuredSettings.selectedHsk]);

  // Currently active lesson metadata
  const currentSelectedLesson = useMemo(() => {
    if (!configuredSettings.selectedLessonNumber || configuredSettings.selectedLessonNumber === 'all') {
      return null;
    }
    return availableLessons.find(l => l.lessonNumber === configuredSettings.selectedLessonNumber) || null;
  }, [availableLessons, configuredSettings.selectedLessonNumber]);

  // Calculate dynamic words ready for playing
  const activePoolCount = useMemo(() => {
    let pool: WordItem[] = [];
    const source = configuredSettings.vocabSource || 'system';
    let baseList: WordItem[] = [];

    if (source === 'custom') {
      baseList = customWords;
    } else if (source === 'both') {
      const sysList = configuredSettings.curriculum === 'hsk30' ? CHINESE_HSK30_DATA : CHINESE_XIEHANZI_DATA;
      baseList = [...sysList, ...customWords];
    } else {
      baseList = configuredSettings.curriculum === 'hsk30' ? CHINESE_HSK30_DATA : CHINESE_XIEHANZI_DATA;
    }

    if (configuredSettings.selectedHsk === 'Tất cả' || configuredSettings.selectedHsk === 'Tự nạp') {
      pool = baseList;
    } else {
      pool = baseList.filter(w => (w.hskLevel || 'Đời sống') === configuredSettings.selectedHsk);
    }

    if (configuredSettings.selectedLessonNumber && configuredSettings.selectedLessonNumber !== 'all') {
      const lessonFiltered = pool.filter(w => w.lessonNumber === configuredSettings.selectedLessonNumber);
      if (lessonFiltered.length > 0) pool = lessonFiltered;
    } else if (configuredSettings.selectedTopic && configuredSettings.selectedTopic !== 'all') {
      const topicFiltered = pool.filter(w => w.topic === configuredSettings.selectedTopic);
      if (topicFiltered.length > 0) pool = topicFiltered;
    }

    return pool.length;
  }, [
    configuredSettings.vocabSource,
    configuredSettings.curriculum,
    configuredSettings.selectedHsk,
    configuredSettings.selectedLessonNumber,
    configuredSettings.selectedTopic,
    customWords,
  ]);

  const playModeOptions: {
    id: GamePlayMode;
    icon: React.ReactNode;
    name: string;
    desc: string;
  }[] = [
    {
      id: 'hanzi_to_pinyin',
      icon: <Eye className="w-4 h-4 text-cyan-400" />,
      name: 'Nhìn chữ Hán ➔ Gõ Pinyin',
      desc: 'Hiển thị chữ Hán. Gõ đúng Pinyin để luyện ghi nhớ mặt chữ.',
    },
    {
      id: 'meaning_to_pinyin',
      icon: <Brain className="w-4 h-4 text-amber-400" />,
      name: 'Nhớ nghĩa Việt ➔ Gõ Pinyin',
      desc: 'Hiển thị nghĩa tiếng Việt. Tự nhớ từ vựng tiếng Trung tương ứng.',
    },
    {
      id: 'listening_to_pinyin',
      icon: <Headphones className="w-4 h-4 text-sky-400" />,
      name: 'Nghe phát âm ➔ Gõ Pinyin',
      desc: 'Ẩn chữ và phát âm mẫu. Dùng tai bắt âm để gõ lại đúng chính tả.',
    },
    {
      id: 'cloze_practice',
      icon: <BookMarked className="w-4 h-4 text-emerald-400" />,
      name: 'Luyện từ mới (Điền khuyết)',
      desc: 'Hiện chữ Hán kèm Pinyin khuyết chữ cái. Phù hợp khi mới học từ.',
    },
  ];

  const handleStartGame = () => {
    const source = configuredSettings.vocabSource || 'system';
    if (source === 'custom') {
      if (customWords.length === 0) {
        setIsHomeSettingsOpen(true);
        return;
      }
      if (configuredSettings.selectedHsk !== 'Tất cả' && configuredSettings.selectedHsk !== 'Tự nạp') {
        const wordsInLevel = customWords.filter(w => (w.hskLevel || 'Đời sống') === configuredSettings.selectedHsk);
        if (wordsInLevel.length === 0) {
          alert(`Bộ từ tự nạp của bạn chưa có từ nào thuộc cấp độ ${configuredSettings.selectedHsk}. Bạn hãy chọn cấp độ khác có từ hoặc chọn 'Tất cả' nhé!`);
          return;
        }
      }
    }
    soundManager.playLaserSound();
    setHasStarted(true);
  };

  const handleTestVoice = () => {
    setIsPlayingTestVoice(true);
    soundManager.speak('你好，欢迎学习汉语！', 'zh', true);
    setTimeout(() => setIsPlayingTestVoice(false), 1800);
  };

  if (hasStarted) {
    return (
      <CanvasGame
        initialSettings={configuredSettings}
        onGoHome={() => setHasStarted(false)}
        customWords={customWords}
        onSetCustomWords={handleSetCustomWords}
        onAddCustomWords={handleAddCustomWords}
        onSaveCustomWord={handleSaveCustomWord}
        onDeleteCustomWord={handleDeleteCustomWord}
        onClearCustomWords={handleClearCustomWords}
      />
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#11100e] flex items-center justify-center select-none p-3 sm:p-4 font-sans text-[#ece6da]">
      {/* Background ambient warm subtle pattern */}
      <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#d97706 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      {/* Container */}
      <div className="relative z-10 w-full max-w-3xl p-4 sm:p-6 bg-[#1a1815] border-2 border-[#2c2822] rounded-2xl shadow-2xl flex flex-col max-h-[96vh] overflow-y-auto custom-scrollbar">
        {/* Top Header Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 mb-3 border-b border-[#2c2822]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#fbf8f3] font-display">
                LinguaStrike
              </h1>
              <span className="font-hanzi text-amber-500 font-bold text-sm border border-amber-500/40 px-2 py-0.5 rounded-lg bg-amber-500/10">
                擊字
              </span>
              <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-[#25221d] border border-[#353028] text-stone-300 font-mono flex items-center gap-1">
                <span>📚 146 Bài học HSK Chuẩn</span>
              </span>
              {customWords.length > 0 && (
                <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-amber-500/15 border border-amber-500/40 text-amber-300 font-mono font-bold animate-pulse">
                  ⭐ {customWords.length.toLocaleString()} từ của tôi
                </span>
              )}
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Luyện gõ Pinyin theo từng bài học giáo trình, rèn luyện 4 giác quan và chơi game thư giãn
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestVoice}
              title="Nghe thử giọng phát âm"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25221d] hover:bg-[#322d26] border border-[#3a342b] hover:border-amber-500/50 text-stone-300 text-xs font-medium rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <Volume2 className={`w-3.5 h-3.5 ${isPlayingTestVoice ? 'text-amber-400' : 'text-stone-400'}`} />
              <span className="hidden sm:inline">Thử âm</span>
            </button>

            <button
              onClick={() => setIsVocabLibraryOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25221d] hover:bg-[#322d26] border border-[#3a342b] hover:border-amber-500/50 text-stone-300 text-xs font-medium rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <BookOpen className="w-3.5 h-3.5 text-stone-400" />
              <span>Thư viện ({(CHINESE_HSK_DATA.length + customWords.length).toLocaleString()})</span>
            </button>

            <button
              onClick={() => setIsHomeSettingsOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25221d] hover:bg-[#322d26] border border-[#3a342b] hover:border-amber-500/50 text-stone-300 text-xs font-medium rounded-xl transition-all cursor-pointer shadow-sm"
            >
              <Settings className="w-3.5 h-3.5 text-stone-400" />
              <span>Cài đặt</span>
            </button>
          </div>
        </div>

        {/* High Score Bar if exists */}
        {highScore > 0 && (
          <div className="mb-3 px-3.5 py-1.5 bg-[#141311] border border-[#2c2822] rounded-xl flex items-center justify-between text-xs">
            <span className="text-stone-400 flex items-center gap-1.5">
              <span>🏆</span>
              <span>Điểm cao nhất của bạn:</span>
            </span>
            <span className="font-mono font-bold text-amber-400 tracking-wider">{highScore.toLocaleString()} PTS</span>
          </div>
        )}

        {/* PHẦN 1: PHONG CÁCH TRẢI NGHIỆM (ZEN THƯ GIÃN vs ARCADE CHIẾN BINH) */}
        <div className="mb-3.5 text-left">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-display font-bold uppercase tracking-wider text-stone-400">
              1. Phong cách trải nghiệm (Linh động, Không gò bó):
            </label>
            <span className="text-[11px] font-mono font-bold text-amber-400">
              {configuredSettings.gameMode === 'practice' ? '☕ Zen: Học chậm chắc, không áp lực' : '🚀 Arcade: Đua điểm, đấu Boss'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setConfiguredSettings(prev => ({ ...prev, gameMode: 'practice' }))}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                configuredSettings.gameMode === 'practice'
                  ? 'bg-emerald-500/10 border-emerald-500 text-white shadow-md ring-1 ring-emerald-500/40'
                  : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${configuredSettings.gameMode === 'practice' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-[#1e1b17] border-[#2c2822] text-stone-400'}`}>
                    <Coffee className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs sm:text-sm text-emerald-300">
                      ☕ Thư Giãn (Zen Mode)
                    </span>
                    <span className="ml-2 text-[10px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400">
                      KHUYÊN DÙNG
                    </span>
                  </div>
                </div>
                {configuredSettings.gameMode === 'practice' && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500 text-black">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-300 leading-relaxed pl-8">
                <strong>Không Game Over, không trừ máu.</strong> Chữ rơi thong thả, gõ sai được gõ lại, nghe phát âm chuẩn và tự động lặp lại từ chưa nhớ.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setConfiguredSettings(prev => ({ ...prev, gameMode: 'arcade' }))}
              className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                configuredSettings.gameMode === 'arcade'
                  ? 'bg-amber-500/10 border-amber-500 text-white shadow-md ring-1 ring-amber-500/40'
                  : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${configuredSettings.gameMode === 'arcade' ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' : 'bg-[#1e1b17] border-[#2c2822] text-stone-400'}`}>
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-xs sm:text-sm text-amber-300">
                    🚀 Chiến Binh (Arcade Mode)
                  </span>
                </div>
                {configuredSettings.gameMode === 'arcade' && (
                  <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500 text-black">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed pl-8">
                Có thanh Máu (HP), tính chuỗi Combo, nộ <strong>Fever Mode x2 điểm</strong> và đối đầu <strong>Trùm Boss</strong> mang câu giao tiếp của bài học!
              </p>
            </button>
          </div>
        </div>

        {/* PHẦN 2: CHẾ ĐỘ GIÁC QUAN LUYỆN TẬP */}
        <div className="mb-3.5 text-left">
          <label className="text-xs font-display font-bold uppercase tracking-wider text-stone-400 block mb-1.5">
            2. Mục tiêu rèn luyện (4 Giác quan não bộ):
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {playModeOptions.map(m => {
              const isSelected = configuredSettings.playMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setConfiguredSettings(prev => ({ ...prev, playMode: m.id }))}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-[#25211c] border-amber-500 text-white shadow-md'
                      : 'bg-[#151412] border-[#2c2822] text-stone-300 hover:border-[#443e35]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded-lg border ${isSelected ? 'bg-amber-500/20 border-amber-500/50 text-amber-400' : 'bg-[#1e1b17] border-[#2c2822] text-stone-400'}`}>
                        {m.icon}
                      </div>
                      <span className="font-bold text-xs sm:text-sm text-white tracking-wide">
                        {m.name}
                      </span>
                    </div>
                    {isSelected && (
                      <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-amber-500 text-black tracking-wider">
                        ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-stone-400 leading-relaxed pl-8">
                    {m.desc}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* PHẦN 3: NGUỒN TỪ & CẤP ĐỘ HSK */}
        <div className="mb-3.5 text-left">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-display font-bold uppercase tracking-wider text-stone-400">
              3. Nguồn từ vựng & Cấp độ:
            </label>
            <span className="text-[11px] text-amber-400 font-medium">
              {configuredSettings.vocabSource === 'custom'
                ? `Đang chọn: Bộ từ của tôi (${customWords.length} từ)`
                : configuredSettings.vocabSource === 'both'
                ? `Đang chọn: Học kết hợp (${(CHINESE_HSK_DATA.length + customWords.length).toLocaleString()} từ)`
                : `Đang chọn: Giáo trình HSK (${CHINESE_HSK_DATA.length.toLocaleString()} từ)`}
            </span>
          </div>

          {/* 3 Source Options */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-2.5">
            <button
              type="button"
              onClick={() => setConfiguredSettings(prev => ({ ...prev, vocabSource: 'system' }))}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                (configuredSettings.vocabSource || 'system') === 'system'
                  ? 'bg-[#25211c] border-amber-500 text-white shadow-md'
                  : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">🏛️ Giáo trình HSK</span>
                <span className="text-[10px] font-mono text-stone-400">{CHINESE_HSK_DATA.length.toLocaleString()} từ</span>
              </div>
              <p className="text-[10px] text-stone-400 mt-0.5">146 Bài học chuẩn XieHanzi</p>
            </button>

            <button
              type="button"
              onClick={() => {
                if (customWords.length === 0) {
                  setIsHomeSettingsOpen(true);
                } else {
                  setConfiguredSettings(prev => ({ ...prev, vocabSource: 'custom' }));
                }
              }}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                configuredSettings.vocabSource === 'custom'
                  ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-md ring-1 ring-amber-500/40'
                  : customWords.length > 0
                  ? 'bg-[#1a1612] border-amber-600/30 text-amber-400/90 hover:border-amber-500/60'
                  : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-amber-300">⭐ Bộ từ của tôi</span>
                <span className="text-[10px] font-mono font-bold text-amber-400">{customWords.length} từ</span>
              </div>
              <p className="text-[10px] text-stone-400 mt-0.5">
                {customWords.length > 0 ? 'Phân theo HSK tự nạp' : 'Chưa có từ, bấm để nạp'}
              </p>
            </button>

            <button
              type="button"
              onClick={() => setConfiguredSettings(prev => ({ ...prev, vocabSource: 'both' }))}
              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                configuredSettings.vocabSource === 'both'
                  ? 'bg-[#25211c] border-amber-500 text-white shadow-md'
                  : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-xs text-white">🔄 Học kết hợp</span>
                <span className="text-[10px] font-mono text-stone-400">
                  {(CHINESE_HSK_DATA.length + customWords.length).toLocaleString()} từ
                </span>
              </div>
              <p className="text-[10px] text-stone-400 mt-0.5">Trộn từ tự nạp & từ bài học</p>
            </button>
          </div>

          {/* Cấp độ HSK Breakdown */}
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5 mb-2.5">
            {hskPills.map(item => {
              const isSelected = configuredSettings.selectedHsk === item.level;
              const isEmpty = item.rawCount === 0;
              return (
                <button
                  key={item.level}
                  onClick={() => {
                    setConfiguredSettings(prev => ({
                      ...prev,
                      selectedHsk: item.level,
                      selectedLessonNumber: 'all',
                      selectedTopic: 'all',
                    }));
                  }}
                  className={`py-2 px-1 rounded-xl text-xs font-mono border transition-all cursor-pointer text-center relative ${
                    isSelected
                      ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-bold shadow-sm ring-1 ring-amber-500/40'
                      : isEmpty
                      ? 'bg-[#121110] border-[#22201c] text-stone-600 hover:border-[#333]'
                      : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35] hover:text-stone-200'
                  }`}
                >
                  <div className="leading-tight font-semibold">{item.level}</div>
                  <div className={`text-[9px] mt-0.5 ${isEmpty ? 'text-stone-600' : isSelected ? 'text-amber-400 font-bold' : 'opacity-70'}`}>
                    {item.count}
                  </div>
                </button>
              );
            })}
          </div>

          {/* PHẦN 4: CHỌN CHI TIẾT THEO BÀI HỌC (146 BÀI) HOẶC THEO CHỦ ĐỀ (DỮ LIỆU ĐỘNG 100%) */}
          {configuredSettings.selectedHsk !== 'Đời sống' && configuredSettings.selectedHsk !== 'Tự nạp' && (
            <div className="p-3 bg-[#141311] border border-[#2b2721] rounded-xl space-y-2.5 animate-in fade-in">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#24201a] pb-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-display font-bold uppercase tracking-wider text-amber-400">
                    4. Lọc phạm vi học trong {configuredSettings.selectedHsk}:
                  </span>
                </div>

                {/* Sub Tab: Theo Bài học vs Theo Chủ đề */}
                <div className="flex items-center gap-1 bg-[#1e1b17] p-0.5 rounded-lg border border-[#2f2b25]">
                  <button
                    type="button"
                    onClick={() => {
                      setScopeSubTab('lesson');
                      setConfiguredSettings(prev => ({ ...prev, selectedTopic: 'all' }));
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      scopeSubTab === 'lesson'
                        ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <BookOpen className="w-3 h-3" />
                    <span>Theo Bài học ({availableLessons.length})</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setScopeSubTab('topic');
                      setConfiguredSettings(prev => ({ ...prev, selectedLessonNumber: 'all' }));
                    }}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                      scopeSubTab === 'topic'
                        ? 'bg-amber-500 text-stone-950 font-bold shadow-sm'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Layers className="w-3 h-3" />
                    <span>Theo Chủ đề ({availableTopics.length})</span>
                  </button>
                </div>
              </div>

              {/* Scope Content: Theo Bài Học */}
              {scopeSubTab === 'lesson' ? (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <select
                      value={configuredSettings.selectedLessonNumber || 'all'}
                      onChange={e => setConfiguredSettings(prev => ({ ...prev, selectedLessonNumber: e.target.value, selectedTopic: 'all' }))}
                      className="bg-[#1c1a17] border border-[#353028] text-stone-200 text-xs rounded-xl px-3 py-2 flex-1 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="all">
                        -- Toàn bộ {availableLessons.length} bài học ({hskPills.find(p => p.level === configuredSettings.selectedHsk)?.count || 'toàn bộ'}) --
                      </option>
                      {availableLessons.map(lesson => (
                        <option key={lesson.id} value={lesson.lessonNumber}>
                          {lesson.lessonNumber}: {lesson.titleVi} ({lesson.titleZh}) — {lesson.wordCount} từ
                        </option>
                      ))}
                    </select>

                    {configuredSettings.selectedLessonNumber && configuredSettings.selectedLessonNumber !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setConfiguredSettings(prev => ({ ...prev, selectedLessonNumber: 'all' }))}
                        title="Học toàn bộ bài của cấp độ này"
                        className="px-2.5 py-2 bg-[#25211c] hover:bg-[#322d26] border border-[#3a342b] text-stone-300 text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" />
                        <span className="hidden sm:inline">Học hết bài</span>
                      </button>
                    )}
                  </div>

                  {/* Active Lesson Detail Card */}
                  {currentSelectedLesson && (
                    <div className="p-3 bg-[#1b1915] border border-amber-500/30 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-[11px] border border-amber-500/40">
                            {currentSelectedLesson.lessonNumber}
                          </span>
                          <span className="font-bold text-sm text-white font-hanzi">
                            {currentSelectedLesson.titleZh}
                          </span>
                          <span className="text-amber-400 font-mono text-xs">
                            [{currentSelectedLesson.pinyin}]
                          </span>
                        </div>
                        <p className="text-stone-300">
                          {currentSelectedLesson.titleVi}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-stone-400">
                          <span>🏷️ Chủ đề: <strong className="text-stone-300">{currentSelectedLesson.topic}</strong></span>
                          <span>•</span>
                          <span>🎯 Số từ: <strong className="text-amber-400 font-mono">{currentSelectedLesson.wordCount} từ</strong></span>
                        </div>
                      </div>

                      {currentSelectedLesson.url && (
                        <a
                          href={currentSelectedLesson.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                        >
                          <span>Xem bài giảng XieHanzi</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                /* Scope Content: Theo Chủ Đề */
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <select
                      value={configuredSettings.selectedTopic || 'all'}
                      onChange={e => setConfiguredSettings(prev => ({ ...prev, selectedTopic: e.target.value, selectedLessonNumber: 'all' }))}
                      className="bg-[#1c1a17] border border-[#353028] text-stone-200 text-xs rounded-xl px-3 py-2 flex-1 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="all">-- Tất cả {availableTopics.length} chủ đề của cấp độ này --</option>
                      {availableTopics.map(topic => (
                        <option key={topic.id} value={topic.topicName}>
                          {topic.topicName} ({topic.wordCount} từ • {topic.lessonCount} bài)
                        </option>
                      ))}
                    </select>

                    {configuredSettings.selectedTopic && configuredSettings.selectedTopic !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setConfiguredSettings(prev => ({ ...prev, selectedTopic: 'all' }))}
                        title="Học toàn bộ chủ đề"
                        className="px-2.5 py-2 bg-[#25211c] hover:bg-[#322d26] border border-[#3a342b] text-stone-300 text-xs rounded-xl flex items-center gap-1 transition-colors cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3 text-amber-400" />
                        <span className="hidden sm:inline">Tất cả chủ đề</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PHẦN 5: TÙY CHỌN BẬT / TẮT NHANH */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4 text-left">
          <button
            type="button"
            onClick={() => setConfiguredSettings(prev => ({ ...prev, showHints: !prev.showHints }))}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              configuredSettings.showHints
                ? 'bg-[#25211c] border-amber-500/60 text-white'
                : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35]'
            }`}
          >
            <div>
              <div className="text-xs font-semibold text-stone-200">Gợi ý nghĩa tiếng Việt</div>
              <div className="text-[11px] text-stone-400">
                {configuredSettings.showHints ? 'Đang bật hiển thị' : 'Đang tắt'}
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                configuredSettings.showHints ? 'bg-amber-500 text-black' : 'bg-[#25221d] text-stone-500'
              }`}
            >
              {configuredSettings.showHints ? 'BẬT' : 'TẮT'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setConfiguredSettings(prev => ({ ...prev, enableBossFight: !prev.enableBossFight }))}
            className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              configuredSettings.enableBossFight
                ? 'bg-[#25211c] border-amber-500/60 text-white'
                : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35]'
            }`}
          >
            <div>
              <div className="text-xs font-semibold text-stone-200">Thử thách Boss ghép câu</div>
              <div className="text-[11px] text-stone-400">
                {configuredSettings.enableBossFight ? 'Xuất hiện sau mỗi 6 từ' : 'Đang tắt'}
              </div>
            </div>
            <span
              className={`text-[10px] px-2 py-0.5 rounded font-mono font-bold ${
                configuredSettings.enableBossFight ? 'bg-amber-500 text-black' : 'bg-[#25221d] text-stone-500'
              }`}
            >
              {configuredSettings.enableBossFight ? 'BẬT' : 'TẮT'}
            </span>
          </button>
        </div>

        {/* NÚT HÀNH ĐỘNG BẮT ĐẦU */}
        <div className="flex flex-col sm:flex-row gap-2.5 mt-auto pt-2">
          <button
            onClick={() => setIsHomeSettingsOpen(true)}
            style={{ '--shadow-color': '#201d18' } as React.CSSProperties}
            className="tactile-btn bg-[#25221d] hover:bg-[#322d26] border border-[#3a342b] text-stone-300 font-semibold py-3 px-4 rounded-xl cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4 text-stone-400" />
            <span>Nạp từ / Sửa từ</span>
          </button>

          <button
            onClick={handleStartGame}
            style={{ '--shadow-color': '#92400e' } as React.CSSProperties}
            className="tactile-btn flex-1 bg-amber-500 hover:bg-amber-400 border border-amber-400 text-stone-950 font-black py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer tracking-wider font-display shadow-lg"
          >
            <Play className="w-4 h-4 fill-stone-950" />
            <span>
              {configuredSettings.gameMode === 'practice' ? 'BẮT ĐẦU HỌC (ZEN)' : 'BẮT ĐẦU CHIẾN (ARCADE)'}:{' '}
              {configuredSettings.selectedHsk}
              {configuredSettings.selectedLessonNumber && configuredSettings.selectedLessonNumber !== 'all'
                ? ` • ${configuredSettings.selectedLessonNumber}`
                : ''}
              {configuredSettings.selectedTopic && configuredSettings.selectedTopic !== 'all' && (!configuredSettings.selectedLessonNumber || configuredSettings.selectedLessonNumber === 'all')
                ? ` • ${configuredSettings.selectedTopic}`
                : ''}
              {' '}({activePoolCount} từ)
            </span>
            <span className="text-xs font-mono font-normal opacity-75 hidden md:inline">[Enter]</span>
          </button>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isHomeSettingsOpen}
        settings={configuredSettings}
        onUpdateSettings={newS => setConfiguredSettings(prev => ({ ...prev, ...newS }))}
        onClose={() => setIsHomeSettingsOpen(false)}
        customWords={customWords}
        onSetCustomWords={handleSetCustomWords}
        onAddCustomWords={handleAddCustomWords}
        onSaveCustomWord={handleSaveCustomWord}
        onDeleteCustomWord={handleDeleteCustomWord}
        onClearCustomWords={handleClearCustomWords}
      />

      {/* Vocabulary Library Modal */}
      <VocabLibraryModal
        isOpen={isVocabLibraryOpen}
        onClose={() => setIsVocabLibraryOpen(false)}
        customWords={customWords}
      />
    </div>
  );
};

export default App;
