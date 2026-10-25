import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from '../game/Engine';
import { GameHUD } from './GameHUD';
import { SettingsModal } from './SettingsModal';
import { GameOverModal } from './GameOverModal';
import { VocabLibraryModal } from './VocabLibraryModal';
import { PauseModal } from './PauseModal';
import type { GameSettings, GameStats, WordItem, BossEnemy, ActiveWord } from '../types/game';
import { CHINESE_HSK_DATA, CHINESE_XIEHANZI_DATA, CHINESE_HSK30_DATA } from '../data/vocabData';
import { createBossEnemy } from '../data/bossData';
import { createActiveWord } from '../utils/clozeHelper';
import { soundManager } from '../game/SoundManager';
import confetti from 'canvas-confetti';

const MAX_HP = 100;
const DAMAGE_PER_MISS = 20;

interface CanvasGameProps {
  onGoHome: () => void;
  initialSettings?: Partial<GameSettings>;
  customWords?: WordItem[];
  onSetCustomWords?: (words: WordItem[]) => void;
  onAddCustomWords?: (words: WordItem[]) => void;
  onSaveCustomWord?: (word: WordItem, targetIndex?: number) => void;
  onDeleteCustomWord?: (wordId: string) => void;
  onClearCustomWords?: () => void;
}

export const CanvasGame: React.FC<CanvasGameProps> = ({
  onGoHome,
  initialSettings,
  customWords = [],
  onSetCustomWords,
  onAddCustomWords,
  onSaveCustomWord,
  onDeleteCustomWord,
  onClearCustomWords,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const hiddenInputRef = useRef<HTMLInputElement | null>(null);
  const missedQueueRef = useRef<WordItem[]>([]);
  const customVocabRef = useRef<WordItem[]>(customWords);
  const shuffledDeckRef = useRef<WordItem[]>([]);
  const bossCounterRef = useRef<number>(0);

  // Game Settings State
  const [settings, setSettings] = useState<GameSettings>({
    language: 'zh',
    inputMode: 'latin',
    playMode: 'hanzi_to_pinyin',
    clozeStyle: 'reveal_on_type',
    spawnMode: 'single',
    gameMode: 'arcade',
    selectedHsk: 'HSK 1',
    requireTones: false,
    showHints: false,
    showTypingGuide: false,
    showHanViet: true,
    showMeaningHint: true,
    enableBossFight: true,
    repeatMissedWords: true,
    speedMultiplier: 1.2,
    soundEnabled: true,
    autoPronounce: true,
    ttsVolume: 0.9,
    sfxVolume: 0.5,
    ttsRate: 0.95,
    ...initialSettings,
  });

  // Game Play State
  const [hp, setHp] = useState<number>(MAX_HP);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [isVocabLibraryOpen, setIsVocabLibraryOpen] = useState<boolean>(false);
  const [isScreenShaking, setIsScreenShaking] = useState<boolean>(false);
  const [currentTarget, setCurrentTarget] = useState<ActiveWord | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(() => settings.timeLimitSeconds || 60);
  const [timeBonusText, setTimeBonusText] = useState<string | null>(null);
  const keystrokesHistoryRef = useRef<number[]>([]);

  // Stats State
  const [stats, setStats] = useState<GameStats>(() => {
    let savedScore = 0;
    try {
      const saved = localStorage.getItem('linguablaster_chinese_highscore');
      if (saved) savedScore = parseInt(saved, 10) || 0;
    } catch {
      // ignore
    }
    return {
      score: 0,
      highScore: savedScore,
      combo: 0,
      maxCombo: 0,
      wordsDefeated: 0,
      bossesDefeated: 0,
      wordsMissed: [],
      level: 1,
      accuracy: 100,
      totalKeystrokes: 0,
      correctKeystrokes: 0,
      energy: 0,
      maxEnergy: 100,
      wpm: 0,
      isFeverMode: false,
      isFrozen: false,
    };
  });

  // Sync highscore to localStorage
  useEffect(() => {
    if (stats.score > stats.highScore) {
      localStorage.setItem('linguablaster_chinese_highscore', stats.score.toString());
    }
  }, [stats.score, stats.highScore]);

  // Fisher-Yates True Random Shuffle Helper
  const refreshShuffledDeck = useCallback(() => {
    let pool: WordItem[] = [];
    const source = settings.vocabSource || (settings.selectedHsk === 'Tự nạp' ? 'custom' : 'system');
    let baseList: WordItem[] = [];

    if (source === 'custom') {
      // 100% chỉ lấy từ bộ từ tự nạp
      baseList = [...customVocabRef.current];
    } else if (source === 'both') {
      // Học kết hợp cả từ tự nạp và từ hệ thống
      const sysList = settings.curriculum === 'hsk3' ? CHINESE_HSK30_DATA : CHINESE_XIEHANZI_DATA;
      baseList = [...sysList, ...customVocabRef.current];
    } else {
      // Dữ liệu gốc HSK hệ thống (mặc định Giáo trình Chuẩn XieHanzi 146 bài)
      baseList = settings.curriculum === 'hsk3' ? [...CHINESE_HSK30_DATA] : [...CHINESE_XIEHANZI_DATA];
    }

    // Lọc theo cấp độ đã chọn (HSK 1 - 6, Đời sống, hoặc Tất cả)
    if (settings.selectedHsk === 'Tất cả' || settings.selectedHsk === 'Tự nạp') {
      pool = baseList;
    } else {
      pool = baseList.filter(w => (w.hskLevel || 'Đời sống') === settings.selectedHsk);
    }

    // Lọc theo nhiều bài học được chọn cùng lúc (Multi-Lesson)
    const selectedLessons = settings.selectedLessonNumbers && settings.selectedLessonNumbers.length > 0
      ? settings.selectedLessonNumbers
      : settings.selectedLessonNumber && settings.selectedLessonNumber !== 'all'
      ? [settings.selectedLessonNumber]
      : [];

    if (selectedLessons.length > 0 && !selectedLessons.includes('all')) {
      const lessonFiltered = pool.filter(w => w.lessonNumber && selectedLessons.includes(w.lessonNumber));
      if (lessonFiltered.length > 0) {
        pool = lessonFiltered;
      }
    }

    // Lọc theo nhiều chủ đề được chọn cùng lúc (Multi-Topic)
    const selectedTopics = settings.selectedTopics && settings.selectedTopics.length > 0
      ? settings.selectedTopics
      : settings.selectedTopic && settings.selectedTopic !== 'all'
      ? [settings.selectedTopic]
      : [];

    if (selectedTopics.length > 0 && !selectedTopics.includes('all')) {
      const topicFiltered = pool.filter(w => w.topic && selectedTopics.includes(w.topic));
      if (topicFiltered.length > 0) {
        pool = topicFiltered;
      }
    }

    // Dự phòng an toàn nếu cấp độ trong nguồn này không có từ
    if (pool.length === 0) {
      if (source === 'custom' && customVocabRef.current.length > 0) {
        pool = [...customVocabRef.current];
      } else {
        pool = [...CHINESE_HSK_DATA.slice(0, 50)];
      }
    }

    const deck = [...pool];
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    shuffledDeckRef.current = deck;
  }, [
    settings.selectedHsk,
    settings.vocabSource,
    settings.curriculum,
    settings.selectedLessonNumber,
    settings.selectedLessonNumbers,
    settings.selectedTopic,
    settings.selectedTopics
  ]);

  // Reset deck whenever HSK level, vocabSource or customWords changes
  useEffect(() => {
    customVocabRef.current = customWords;
    refreshShuffledDeck();
  }, [customWords, settings.selectedHsk, settings.vocabSource, refreshShuffledDeck]);

  // Engine Callbacks
  const handleDamage = useCallback((missedWord: WordItem) => {
    if (settings.repeatMissedWords) {
      missedQueueRef.current.push(missedWord);
    }

    // Reset Fever Mode on taking damage
    engineRef.current?.setFever(false);

    if (settings.gameMode === 'arcade') {
      setHp(prevHp => {
        const newHp = Math.max(0, prevHp - DAMAGE_PER_MISS);
        if (newHp === 0) {
          setIsGameOver(true);
          engineRef.current?.stop();
        }
        return newHp;
      });
    } else if (settings.gameMode === 'time_attack') {
      // Time Attack: Rơi mất từ bị trừ 3 giây
      setTimeLeft(t => {
        const nextTime = Math.max(0, t - 3);
        if (nextTime === 0) {
          setIsGameOver(true);
          engineRef.current?.stop();
        }
        return nextTime;
      });
      setTimeBonusText('-3s');
      setTimeout(() => setTimeBonusText(null), 1000);
    }

    setStats(prev => ({
      ...prev,
      combo: 0,
      isFeverMode: false,
      wordsMissed: [...prev.wordsMissed, missedWord],
    }));
  }, [settings.repeatMissedWords, settings.gameMode]);

  const handleWordDefeated = useCallback((_word: WordItem, points: number) => {
    setStats(prev => {
      const nextCombo = prev.combo + 1;
      const comboBonus = Math.floor(points * (1 + nextCombo * 0.15));

      // Trigger Fever Mode if Combo >= 10!
      if (nextCombo >= 10) {
        engineRef.current?.setFever(true);
      }

      if (nextCombo > 0 && nextCombo % 5 === 0) {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#fbbf24', '#06b6d4', '#10b981'],
        });
      }

      const nextWordsDefeated = prev.wordsDefeated + 1;

      // Time Attack Mode: Thưởng thêm thời gian sống còn!
      if (settings.gameMode === 'time_attack') {
        const bonus = nextCombo >= 5 ? 5 : 2;
        setTimeLeft(t => Math.min(180, t + bonus));
        setTimeBonusText(`+${bonus}s`);
        setTimeout(() => setTimeBonusText(null), 1000);
      }

      // Trigger Boss Fight every 6 defeated words if enabled!
      if (settings.enableBossFight && nextWordsDefeated > 0 && nextWordsDefeated % 6 === 0) {
        setTimeout(() => {
          if (engineRef.current && !engineRef.current.currentBoss) {
            const canvasWidth = canvasRef.current?.width || 800;
            const boss = createBossEnemy(bossCounterRef.current++, canvasWidth);
            engineRef.current.spawnBoss(boss);
          }
        }, 600);
      }

      const newScore = prev.score + comboBonus;
      const newHighScore = Math.max(prev.highScore, newScore);

      return {
        ...prev,
        combo: nextCombo,
        maxCombo: Math.max(prev.maxCombo, nextCombo),
        wordsDefeated: nextWordsDefeated,
        score: newScore,
        highScore: newHighScore,
        isFeverMode: nextCombo >= 10,
      };
    });
  }, [settings.enableBossFight]);

  const handleBossDefeated = useCallback((_boss: BossEnemy, bonusScore: number) => {
    setStats(prev => {
      confetti({
        particleCount: 70,
        spread: 80,
        origin: { y: 0.5 },
        colors: ['#f59e0b', '#ec4899', '#3b82f6', '#10b981'],
      });

      const newScore = prev.score + bonusScore;
      const newHighScore = Math.max(prev.highScore, newScore);

      return {
        ...prev,
        bossesDefeated: prev.bossesDefeated + 1,
        score: newScore,
        highScore: newHighScore,
      };
    });

    // In Boss Rush: tiếp tục triệu hồi Boss tiếp theo!
    if (settings.gameMode === 'boss_rush') {
      setTimeout(() => {
        if (engineRef.current && !isGameOver) {
          const canvasWidth = canvasRef.current?.width || 800;
          const boss = createBossEnemy(bossCounterRef.current++, canvasWidth);
          engineRef.current.spawnBoss(boss);
        }
      }, 1200);
    }
  }, [settings.gameMode, isGameOver]);

  // Time Attack Countdown Timer
  useEffect(() => {
    if (settings.gameMode !== 'time_attack' || isPaused || isGameOver) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          setIsGameOver(true);
          engineRef.current?.stop();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [settings.gameMode, isPaused, isGameOver]);

  // Boss Rush: Triệu hồi Boss đầu tiên ngay khi vào trận
  useEffect(() => {
    if (settings.gameMode === 'boss_rush') {
      const timer = setTimeout(() => {
        if (engineRef.current && !engineRef.current.currentBoss) {
          const canvasWidth = canvasRef.current?.width || 800;
          const boss = createBossEnemy(bossCounterRef.current++, canvasWidth);
          engineRef.current.spawnBoss(boss);
        }
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [settings.gameMode]);

  const handleComboChange = useCallback((combo: number) => {
    setStats(prev => ({ ...prev, combo }));
  }, []);

  const handleKeystroke = useCallback((isCorrect: boolean) => {
    if (isCorrect) {
      const now = Date.now();
      keystrokesHistoryRef.current.push(now);
      const tenSecAgo = now - 10000;
      keystrokesHistoryRef.current = keystrokesHistoryRef.current.filter(t => t > tenSecAgo);
      const strokesInWindow = keystrokesHistoryRef.current.length;
      const calculatedWpm = Math.round((strokesInWindow / 5) * 6);

      setStats(prev => ({
        ...prev,
        totalKeystrokes: prev.totalKeystrokes + 1,
        correctKeystrokes: prev.correctKeystrokes + 1,
        energy: Math.min(100, (prev.energy ?? 0) + 1.8),
        wpm: calculatedWpm,
      }));
    } else {
      setStats(prev => ({
        ...prev,
        totalKeystrokes: prev.totalKeystrokes + 1,
      }));
    }
  }, []);

  const handleScreenShake = useCallback(() => {
    setIsScreenShaking(true);
    setTimeout(() => setIsScreenShaking(false), 350);
  }, []);

  const handleToggleMute = useCallback(() => {
    setSettings(prev => {
      const nextSound = !prev.soundEnabled;
      soundManager.setSoundEnabled(nextSound);
      return { ...prev, soundEnabled: nextSound };
    });
  }, []);

  const handleActivateFreeze = useCallback(() => {
    if ((stats.energy ?? 0) >= 100) {
      setStats(prev => ({ ...prev, energy: 0, isFrozen: true }));
      engineRef.current?.activateTimeFreeze(3.5);
    }
  }, [stats.energy]);

  // Initialize Game Engine
  useEffect(() => {
    if (!canvasRef.current) return;

    const engine = new GameEngine(canvasRef.current, settings, {
      onDamage: handleDamage,
      onWordDefeated: handleWordDefeated,
      onBossDefeated: handleBossDefeated,
      onComboChange: handleComboChange,
      onKeystroke: handleKeystroke,
      onScreenShake: handleScreenShake,
      onTargetChange: setCurrentTarget,
      onFeverChange: (isFever) => setStats(prev => ({ ...prev, isFeverMode: isFever })),
      onFreezeChange: (isFrozen) => setStats(prev => ({ ...prev, isFrozen })),
    });

    engineRef.current = engine;
    engine.start();

    const handleResize = () => {
      engine.resize();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      engine.stop();
      window.removeEventListener('resize', handleResize);
    };
  }, [settings, handleDamage, handleWordDefeated, handleBossDefeated, handleComboChange, handleKeystroke, handleScreenShake]);

  // Update Settings in Engine
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateSettings(settings);
    }
  }, [settings]);

  // Spawning next word
  const spawnNextWord = useCallback(() => {
    if (!engineRef.current || isPaused || isGameOver) return;
    if (engineRef.current.currentBoss) return;

    let wordItem: WordItem;

    if (missedQueueRef.current.length > 0) {
      wordItem = missedQueueRef.current.shift()!;
    } else {
      if (shuffledDeckRef.current.length === 0) {
        refreshShuffledDeck();
      }
      wordItem = shuffledDeckRef.current.pop() || (customVocabRef.current[0] || CHINESE_HSK_DATA[0]);
    }

    const canvasWidth = canvasRef.current?.width || 800;
    const activeWord = createActiveWord(
      wordItem,
      settings.clozeStyle,
      canvasWidth,
      settings.speedMultiplier,
      settings.spawnMode,
      settings.requireTones,
      settings.playMode
    );

    engineRef.current.spawnWord(activeWord);
  }, [settings, isPaused, isGameOver, refreshShuffledDeck]);

  // Spawning Manager Loop
  useEffect(() => {
    if (isPaused || isGameOver) return;

    if (settings.spawnMode === 'single') {
      const singleCheckTimer = setInterval(() => {
        if (!engineRef.current || isPaused || isGameOver) return;
        if (engineRef.current.activeWords.length === 0 && !engineRef.current.currentBoss) {
          spawnNextWord();
        }
      }, 100);

      return () => clearInterval(singleCheckTimer);
    } else {
      const multiInterval = setInterval(() => {
        if (!engineRef.current || isPaused || isGameOver) return;
        if (engineRef.current.activeWords.length < 4 && !engineRef.current.currentBoss) {
          spawnNextWord();
        }
      }, Math.max(1800, 3200 / settings.speedMultiplier));

      return () => clearInterval(multiInterval);
    }
  }, [settings.spawnMode, settings.speedMultiplier, isPaused, isGameOver, spawnNextWord]);

  const handleTogglePause = () => {
    setIsPaused(prev => {
      const next = !prev;
      if (next) {
        engineRef.current?.stop();
      } else {
        engineRef.current?.start();
      }
      return next;
    });
  };

  // Keyboard Event Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle Pause with Escape key
      if (e.key === 'Escape' && !isGameOver && !isSettingsOpen && !isVocabLibraryOpen) {
        e.preventDefault();
        handleTogglePause();
        return;
      }

      if (isGameOver || isPaused || isSettingsOpen || isVocabLibraryOpen) return;

      if (e.code === 'Space') {
        e.preventDefault();
        engineRef.current?.replayCurrentAudio();
        return;
      }

      // Shift: Activate freeze skill
      if (e.key === 'Shift') {
        e.preventDefault();
        handleActivateFreeze();
        return;
      }

      // Tab: Cycle Target (Đổi mục tiêu trong chế độ rơi nhiều từ)
      if (e.key === 'Tab') {
        e.preventDefault();
        engineRef.current?.cycleTarget();
        return;
      }

      // Backspace: Release current target if player wants to pick another word
      if (e.key === 'Backspace') {
        engineRef.current?.releaseTarget();
      }

      if (settings.inputMode === 'latin') {
        if (e.ctrlKey || e.altKey || e.metaKey) return;
        if (e.key.length === 1) {
          engineRef.current?.handleInput(e.key);
        }
      } else {
        hiddenInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGameOver, isPaused, isSettingsOpen, isVocabLibraryOpen, settings.inputMode, handleActivateFreeze]);

  // Click on Canvas to Target Word directly
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isGameOver || isPaused || isSettingsOpen || isVocabLibraryOpen) return;
    if (!canvasRef.current || !engineRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    engineRef.current.handleClickAt(clickX, clickY);
  };

  // Handle IME Composition Events
  const handleImeInput = (e: React.FormEvent<HTMLInputElement>) => {
    const value = e.currentTarget.value;
    if (value && value.length > 0) {
      for (const char of value) {
        engineRef.current?.handleInput(char);
      }
      e.currentTarget.value = '';
    }
  };

  const handleRestartGame = () => {
    setHp(MAX_HP);
    setIsGameOver(false);
    setIsPaused(false);
    missedQueueRef.current = [];
    setCurrentTarget(null);
    refreshShuffledDeck();
    setStats(prev => ({
      ...prev,
      score: 0,
      combo: 0,
      wordsDefeated: 0,
      bossesDefeated: 0,
      wordsMissed: [],
      totalKeystrokes: 0,
      correctKeystrokes: 0,
    }));

    if (engineRef.current) {
      engineRef.current.activeWords = [];
      engineRef.current.currentTarget = null;
      engineRef.current.currentBoss = null;
      engineRef.current.lasers = [];
      engineRef.current.particles = [];
      engineRef.current.floatingTexts = [];
      engineRef.current.start();
    }
  };

  const handlePracticeMissed = (missed: WordItem[]) => {
    if (missed.length === 0) return;
    setHp(MAX_HP);
    setIsGameOver(false);
    setIsPaused(false);
    setCurrentTarget(null);
    missedQueueRef.current = [...missed];
    shuffledDeckRef.current = [...missed];
    setStats(prev => ({
      ...prev,
      score: 0,
      combo: 0,
      wordsDefeated: 0,
      bossesDefeated: 0,
      wordsMissed: [],
      totalKeystrokes: 0,
      correctKeystrokes: 0,
    }));

    if (engineRef.current) {
      engineRef.current.activeWords = [];
      engineRef.current.currentTarget = null;
      engineRef.current.currentBoss = null;
      engineRef.current.lasers = [];
      engineRef.current.particles = [];
      engineRef.current.floatingTexts = [];
      engineRef.current.start();
    }
  };

  return (
    <div
      className={`relative w-full h-full overflow-hidden select-none bg-[#11100e] ${
        isScreenShaking ? 'shake-active' : ''
      }`}
      onClick={() => {
        if (settings.inputMode === 'ime') {
          hiddenInputRef.current?.focus();
        }
      }}
    >
      {/* Hidden input field for native IME composition support */}
      {settings.inputMode === 'ime' && (
        <input
          ref={hiddenInputRef}
          type="text"
          className="opacity-0 absolute pointer-events-none"
          autoFocus
          onInput={handleImeInput}
          onCompositionEnd={e => {
            const data = (e as unknown as { data: string }).data;
            if (data) {
              for (const char of data) {
                engineRef.current?.handleInput(char);
              }
              if (hiddenInputRef.current) hiddenInputRef.current.value = '';
            }
          }}
        />
      )}

      {/* Heads-Up Display (HUD) */}
      <GameHUD
        hp={hp}
        maxHp={MAX_HP}
        stats={{ ...stats, timeLeft, timeBonusText: timeBonusText || undefined }}
        currentLanguage={settings.language}
        gameMode={settings.gameMode}
        spawnMode={settings.spawnMode}
        vocabSource={settings.vocabSource}
        selectedHsk={settings.selectedHsk}
        selectedLessonNumbers={settings.selectedLessonNumbers}
        selectedLessonNumber={settings.selectedLessonNumber}
        selectedTopic={settings.selectedTopic}
        isPaused={isPaused}
        isSoundMuted={!settings.soundEnabled}
        onToggleMute={handleToggleMute}
        onActivateFreeze={handleActivateFreeze}
        onTogglePause={handleTogglePause}
        onOpenSettings={() => {
          setIsPaused(true);
          engineRef.current?.stop();
          setIsSettingsOpen(true);
        }}
        onOpenVocabLibrary={() => {
          setIsPaused(true);
          engineRef.current?.stop();
          setIsVocabLibraryOpen(true);
        }}
        onReplayAudio={() => engineRef.current?.replayCurrentAudio()}
        onGoHome={onGoHome}
      />

      {/* Game Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="block w-full h-full cursor-crosshair"
      />

      {/* Floating Instructions Bottom */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 text-xs text-stone-400 bg-[#1a1815]/95 border border-[#353028] px-4 py-1.5 rounded-full pointer-events-none flex items-center gap-2.5 shadow-md font-sans">
        <span>Click / <kbd className="px-1.5 py-0.5 bg-[#25221d] border border-[#3a342b] rounded text-stone-300 font-mono text-[11px]">Tab</kbd> chọn từ</span>
        <span className="text-stone-600">•</span>
        <span>Phím <kbd className="px-1.5 py-0.5 bg-[#25221d] border border-[#3a342b] rounded text-stone-300 font-mono text-[11px]">Space</kbd> nghe</span>
        <span className="text-stone-600">•</span>
        <span>Phím <kbd className="px-1.5 py-0.5 bg-[#25221d] border border-[#3a342b] rounded text-stone-300 font-mono text-[11px]">Shift</kbd> đóng băng</span>
        <span className="text-stone-600">•</span>
        <span>Phím <kbd className="px-1.5 py-0.5 bg-[#25221d] border border-[#3a342b] rounded text-stone-300 font-mono text-[11px]">Esc</kbd> dừng</span>
      </div>

      {/* Pause Modal */}
      <PauseModal
        isOpen={isPaused && !isSettingsOpen && !isVocabLibraryOpen && !isGameOver}
        stats={stats}
        hp={hp}
        maxHp={MAX_HP}
        currentTarget={currentTarget}
        onResume={handleTogglePause}
        onRestart={handleRestartGame}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenVocabLibrary={() => setIsVocabLibraryOpen(true)}
        onGoHome={onGoHome}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        settings={settings}
        onUpdateSettings={newS => setSettings(prev => ({ ...prev, ...newS }))}
        onClose={() => {
          setIsSettingsOpen(false);
          setIsPaused(false);
          engineRef.current?.start();
        }}
        customWords={customWords}
        onSetCustomWords={words => {
          if (onSetCustomWords) {
            onSetCustomWords(words);
          } else {
            customVocabRef.current = words;
            refreshShuffledDeck();
          }
          setSettings(prev => ({ ...prev, selectedHsk: 'Tất cả' }));
        }}
        onAddCustomWords={words => {
          if (onAddCustomWords) {
            onAddCustomWords(words);
          } else {
            const updated = [...customVocabRef.current];
            words.forEach(nw => {
              const existingIdx = updated.findIndex(w => w.fullWord === nw.fullWord);
              if (existingIdx !== -1) {
                updated[existingIdx] = nw;
              } else {
                updated.push(nw);
              }
            });
            customVocabRef.current = updated;
            refreshShuffledDeck();
          }
          setSettings(prev => ({ ...prev, selectedHsk: 'Tất cả' }));
        }}
        onSaveCustomWord={(word, targetIndex) => {
          if (onSaveCustomWord) {
            onSaveCustomWord(word, targetIndex);
          } else {
            const updated = [...customVocabRef.current];
            if (targetIndex !== undefined && targetIndex >= 0 && targetIndex < updated.length) {
              updated[targetIndex] = word;
            } else {
              const existingIdx = updated.findIndex(w => w.fullWord === word.fullWord);
              if (existingIdx !== -1) {
                updated[existingIdx] = word;
              } else {
                updated.push(word);
              }
            }
            customVocabRef.current = updated;
            refreshShuffledDeck();
          }
        }}
        onDeleteCustomWord={wordId => {
          if (onDeleteCustomWord) {
            onDeleteCustomWord(wordId);
          } else {
            customVocabRef.current = customVocabRef.current.filter(w => w.id !== wordId);
            refreshShuffledDeck();
          }
        }}
        onClearCustomWords={() => {
          if (onClearCustomWords) {
            onClearCustomWords();
          } else {
            customVocabRef.current = [];
            refreshShuffledDeck();
          }
        }}
      />

      {/* Vocabulary Library Modal */}
      <VocabLibraryModal
        isOpen={isVocabLibraryOpen}
        onClose={() => {
          setIsVocabLibraryOpen(false);
          setIsPaused(false);
          engineRef.current?.start();
        }}
        customWords={customWords}
      />

      {/* Game Over Modal */}
      <GameOverModal
        isOpen={isGameOver}
        stats={stats}
        onRestart={handleRestartGame}
        onChangeSettings={() => {
          setIsGameOver(false);
          setIsSettingsOpen(true);
        }}
        onPracticeMissed={handlePracticeMissed}
      />
    </div>
  );
};
