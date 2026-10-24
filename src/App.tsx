import React, { useState } from 'react';
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
  BookMarked
} from 'lucide-react';
import { soundManager } from './game/SoundManager';
import type { GameSettings, HskLevel, GamePlayMode, WordItem } from './types/game';

export const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState<boolean>(false);
  const [isHomeSettingsOpen, setIsHomeSettingsOpen] = useState<boolean>(false);
  const [isVocabLibraryOpen, setIsVocabLibraryOpen] = useState<boolean>(false);
  const [isPlayingTestVoice, setIsPlayingTestVoice] = useState<boolean>(false);

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

  const handleAddCustomWords = (newWords: WordItem[]) => {
    setCustomWords(prev => {
      const updated = [...prev, ...newWords];
      try {
        localStorage.setItem('linguastrike_custom_words', JSON.stringify(updated));
      } catch (e) {
        console.warn('Could not save custom words to localStorage', e);
      }
      return updated;
    });
  };

  const handleClearCustomWords = () => {
    setCustomWords([]);
    try {
      localStorage.removeItem('linguastrike_custom_words');
    } catch (e) {
      console.warn(e);
    }
  };

  const [configuredSettings, setConfiguredSettings] = useState<GameSettings>({
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
  });

  const hskPills: { level: HskLevel; count: string }[] = [
    { level: 'HSK 1', count: '500 từ' },
    { level: 'HSK 2', count: '772 từ' },
    { level: 'HSK 3', count: '973 từ' },
    { level: 'HSK 4', count: '1,000 từ' },
    { level: 'HSK 5', count: '1,071 từ' },
    { level: 'HSK 6', count: '1,140 từ' },
    { level: 'Đời sống', count: 'Hội thoại' },
    { level: 'Tất cả', count: '5,181 từ' },
  ];

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
        onAddCustomWords={handleAddCustomWords}
        onClearCustomWords={handleClearCustomWords}
      />
    );
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#11100e] flex items-center justify-center select-none p-4 font-sans text-[#ece6da]">
      {/* Background ambient warm subtle pattern */}
      <div className="absolute inset-0 opacity-15 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#d97706 1px, transparent 1px)', backgroundSize: '28px 28px' }} />

      {/* Container */}
      <div className="relative z-10 w-full max-w-3xl p-5 sm:p-7 bg-[#1a1815] border-2 border-[#2c2822] rounded-2xl shadow-2xl flex flex-col max-h-[95vh] overflow-y-auto custom-scrollbar">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-[#2c2822]">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#fbf8f3] font-display">
                LinguaStrike
              </h1>
              <span className="font-hanzi text-amber-500 font-bold text-sm border border-amber-500/40 px-2 py-0.5 rounded-lg bg-amber-500/10">
                擊字
              </span>
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-[#25221d] border border-[#353028] text-stone-300 font-mono">
                HSK 3.0 • 5,181 từ
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-1">
              Luyện gõ Pinyin và phản xạ từ vựng tiếng Trung
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
              <span>Kho từ ({5181 + customWords.length})</span>
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
          <div className="mb-4 px-3.5 py-2 bg-[#141311] border border-[#2c2822] rounded-xl flex items-center justify-between text-xs">
            <span className="text-stone-400 flex items-center gap-1.5">
              <span>🏆</span>
              <span>Điểm cao nhất của bạn:</span>
            </span>
            <span className="font-mono font-bold text-amber-400 tracking-wider">{highScore.toLocaleString()} PTS</span>
          </div>
        )}

        {/* 1. Chế độ học tập */}
        <div className="mb-4 text-left">
          <label className="text-xs font-display font-bold uppercase tracking-wider text-stone-400 block mb-2">
            1. Chọn chế độ luyện tập:
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {playModeOptions.map(m => {
              const isSelected = configuredSettings.playMode === m.id;
              return (
                <button
                  key={m.id}
                  onClick={() => setConfiguredSettings(prev => ({ ...prev, playMode: m.id }))}
                  className={`p-3.5 rounded-xl border text-left transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-[#25211c] border-amber-500 text-white shadow-md'
                      : 'bg-[#151412] border-[#2c2822] text-stone-300 hover:border-[#443e35]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2.5">
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

        {/* 2. Cấp độ HSK */}
        <div className="mb-4 text-left">
          <label className="text-xs font-display font-bold uppercase tracking-wider text-stone-400 block mb-2">
            2. Cấp độ HSK:
          </label>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
            {hskPills.map(item => {
              const isSelected = configuredSettings.selectedHsk === item.level;
              return (
                <button
                  key={item.level}
                  onClick={() => setConfiguredSettings(prev => ({ ...prev, selectedHsk: item.level }))}
                  className={`py-2 px-1 rounded-xl text-xs font-mono border transition-all cursor-pointer text-center ${
                    isSelected
                      ? 'bg-amber-500/15 border-amber-500 text-amber-400 font-bold shadow-sm'
                      : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35] hover:text-stone-200'
                  }`}
                >
                  <div className="leading-tight">{item.level}</div>
                  <div className="text-[9px] opacity-70 mt-0.5">
                    {item.count}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Tùy chọn nhanh */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-5 text-left">
          <button
            type="button"
            onClick={() => setConfiguredSettings(prev => ({ ...prev, showHints: !prev.showHints }))}
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
              configuredSettings.showHints
                ? 'bg-[#25211c] border-amber-500/60 text-white'
                : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35]'
            }`}
          >
            <div>
              <div className="text-xs font-semibold text-stone-200">Gợi ý nghĩa tiếng Việt</div>
              <div className="text-[11px] text-stone-400">
                {configuredSettings.showHints ? 'Đang bật' : 'Đang tắt'}
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
            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
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

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={() => setIsHomeSettingsOpen(true)}
            style={{ '--shadow-color': '#201d18' } as React.CSSProperties}
            className="tactile-btn bg-[#25221d] hover:bg-[#322d26] border border-[#3a342b] text-stone-300 font-semibold py-3 px-4 rounded-xl cursor-pointer text-xs sm:text-sm flex items-center justify-center gap-2"
          >
            <FileText className="w-4 h-4 text-stone-400" />
            <span>Nạp từ vựng</span>
          </button>

          <button
            onClick={handleStartGame}
            style={{ '--shadow-color': '#92400e' } as React.CSSProperties}
            className="tactile-btn flex-1 bg-amber-500 hover:bg-amber-400 border border-amber-400 text-stone-950 font-black py-3.5 px-6 rounded-xl flex items-center justify-center gap-2 text-sm sm:text-base cursor-pointer uppercase tracking-wider font-display"
          >
            <Play className="w-4 h-4 fill-stone-950" />
            <span>Bắt đầu chơi</span>
            <span className="text-xs font-mono font-normal opacity-75 hidden sm:inline">[Enter]</span>
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
        onAddCustomWords={handleAddCustomWords}
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
