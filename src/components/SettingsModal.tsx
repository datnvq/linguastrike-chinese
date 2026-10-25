import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Plus,
  Pencil,
  Volume2,
  Search,
  FileDown,
  RefreshCw,
  Coffee,
  Zap,
  Timer,
  Swords,
  BookOpen
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { GameSettings, ClozeStyle, HskLevel, WordItem } from '../types/game';
import { soundManager } from '../game/SoundManager';
import { getLessonsByLevel, getTopicsByLevel } from '../data/vocabData';

interface SettingsModalProps {
  isOpen: boolean;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
  customWords?: WordItem[];
  onSetCustomWords?: (words: WordItem[]) => void;
  onAddCustomWords?: (words: WordItem[]) => void;
  onSaveCustomWord?: (word: WordItem, targetIndex?: number) => void;
  onDeleteCustomWord?: (wordId: string) => void;
  onClearCustomWords?: () => void;
}

function normalizePinyin(p: string): string {
  return p
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  settings,
  onUpdateSettings,
  onClose,
  customWords = [],
  onSetCustomWords,
  onAddCustomWords,
  onSaveCustomWord,
  onDeleteCustomWord,
  onClearCustomWords,
}) => {
  const [activeTab, setActiveTab] = useState<'game' | 'audio' | 'vocab'>('game');
  const [customText, setCustomText] = useState<string>('');
  const [targetLevel, setTargetLevel] = useState<string>('auto');
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [customImportSuccess, setCustomImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Single Word Form State (Thêm hoặc Sửa từ)
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [formHanzi, setFormHanzi] = useState<string>('');
  const [formPinyin, setFormPinyin] = useState<string>('');
  const [formMeaning, setFormMeaning] = useState<string>('');
  const [formHanViet, setFormHanViet] = useState<string>('');
  const [formLevel, setFormLevel] = useState<HskLevel>('Đời sống');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [customListFilter, setCustomListFilter] = useState<string>('Tất cả');

  if (!isOpen) return null;

  const hskLevels: HskLevel[] = ['Tất cả', 'HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'Đời sống'];

  const clozeStyles: { id: ClozeStyle; name: string; example: string }[] = [
    { id: 'reveal_on_type', name: 'Hiện ký tự khi gõ trúng', example: '_ _  _ _ ➔ nǐ hǎo' },
    { id: 'none', name: 'Hiện đầy đủ Pinyin ban đầu', example: 'nǐ  hǎo' },
    { id: 'end_letter', name: 'Ẩn ký tự cuối', example: 'nǐ  hǎ _' },
    { id: 'vowels', name: 'Ẩn nguyên âm', example: 'n _   h _ o' },
    { id: 'initials', name: 'Ẩn phụ âm đầu', example: '_ ǐ   _ ǎo' },
  ];

  const handleTestTTS = (phrase = '你好，欢迎来到汉语学习游戏！') => {
    soundManager.speak(phrase, 'zh', true);
  };

  // Helper to process parsed rows (Hỗ trợ đa ngôn ngữ: Trung, Anh, Nhật)
  const processRowsIntoWords = (rows: Record<string, unknown>[], defaultLevel: string): WordItem[] => {
    const newWords: WordItem[] = [];

    rows.forEach((r, idx) => {
      // 1. Nhận diện mặt chữ (Hán tự / Word / Từ vựng / Kanji)
      const wordText = (
        r['Hán tự'] || r['Hanzi'] || r['hanzi'] ||
        r['Từ'] || r['Từ vựng'] || r['Word'] || r['word'] || r['Vocabulary'] ||
        r['Kanji'] || r['0'] || ''
      ).toString().trim();

      // 2. Nhận diện phiên âm / Pinyin / IPA / Reading / Romaji
      const phoneticText = (
        r['Pinyin'] || r['pinyin'] ||
        r['Phiên âm'] || r['phien_am'] ||
        r['IPA'] || r['ipa'] ||
        r['Reading'] || r['reading'] ||
        r['Romaji'] || r['romaji'] ||
        r['1'] || ''
      ).toString().trim();

      // 3. Nhận diện nghĩa
      const meaning = (
        r['Nghĩa tiếng Việt'] || r['Nghĩa'] || r['nghia'] ||
        r['Meaning'] || r['meaning'] || r['Definition'] ||
        r['3'] || ''
      ).toString().trim();

      // 4. Các thông tin bổ trợ khác
      const category = (r['Từ loại'] || r['Category'] || r['category'] || r['type'] || r['2'] || '').toString().trim();
      const hanViet = (r['Âm Hán-Việt'] || r['Hán-Việt'] || r['Hán Việt'] || r['hanViet'] || r['han_viet'] || '').toString().trim();
      const meaningEn = (r['Nghĩa tiếng Anh'] || r['MeaningEn'] || r['4'] || '').toString().trim();
      const levelCol = (r['Cấp độ'] || r['Level'] || r['level'] || r['hsk'] || '').toString().trim();

      if (wordText) {
        // Tự động nhận diện ngôn ngữ
        let lang: 'en' | 'ja' | 'zh' = 'zh';
        if (/[ぁ-んァ-ン]/.test(wordText) || /[ぁ-んァ-ン]/.test(phoneticText)) {
          lang = 'ja';
        } else if (/^[a-zA-Z0-9\s\-',.?!]+$/.test(wordText)) {
          lang = 'en';
        } else if (/[一-龥]/.test(wordText)) {
          lang = 'zh';
        }

        // Tạo chuỗi gõ latinInput
        let latinInput = '';
        let pinyinSpaced = phoneticText;

        if (lang === 'en') {
          // Tiếng Anh: gõ chữ cái của từ đó (vd: "apple" -> gõ "apple")
          latinInput = wordText.toLowerCase().replace(/[^a-z0-9]/g, '');
          pinyinSpaced = phoneticText || wordText;
        } else if (lang === 'ja') {
          // Tiếng Nhật: gõ Romaji
          latinInput = normalizePinyin(phoneticText || wordText);
          pinyinSpaced = phoneticText || wordText;
        } else {
          // Tiếng Trung: gõ Pinyin chuẩn
          const pinyinVal = phoneticText || wordText;
          latinInput = normalizePinyin(pinyinVal);
          pinyinSpaced = pinyinVal;
        }

        let level: HskLevel = 'Đời sống';
        if (defaultLevel !== 'auto' && defaultLevel !== 'Tất cả') {
          level = defaultLevel as HskLevel;
        } else if (levelCol && hskLevels.includes(levelCol as HskLevel)) {
          level = levelCol as HskLevel;
        }

        newWords.push({
          id: `custom-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          language: lang,
          hskLevel: level,
          category: category || (lang === 'en' ? 'Tiếng Anh' : lang === 'ja' ? 'Tiếng Nhật' : 'Tự nhập'),
          fullWord: wordText,
          pinyinSpaced: pinyinSpaced,
          latinInput: latinInput || wordText.toLowerCase().replace(/[^a-z0-9]/g, ''),
          meaning: meaning || wordText,
          hanViet: hanViet || undefined,
          meaningEn: meaningEn || '',
          audioText: wordText,
        });
      }
    });

    return newWords;
  };

  // Handle Form Edit Word
  const handleStartEditWord = (word: WordItem, idx: number) => {
    setEditingIndex(idx);
    setFormHanzi(word.fullWord);
    setFormPinyin(word.pinyinSpaced);
    setFormMeaning(word.meaning);
    setFormHanViet(word.hanViet || '');
    setFormLevel(word.hskLevel || 'Đời sống');
    setImportError(null);
  };

  const handleCancelEdit = () => {
    setEditingIndex(null);
    setFormHanzi('');
    setFormPinyin('');
    setFormMeaning('');
    setFormHanViet('');
  };

  // Check if current formHanzi matches any word in customWords
  const existingWordIndex = formHanzi.trim()
    ? customWords.findIndex(w => w.fullWord.trim() === formHanzi.trim())
    : -1;

  // Save single word (Add or Overwrite at index)
  const handleSaveWordForm = () => {
    setImportError(null);
    const hanzi = formHanzi.trim();
    const pinyin = formPinyin.trim();
    const meaning = formMeaning.trim();
    const hanViet = formHanViet.trim();

    if (!hanzi || !pinyin) {
      setImportError('Vui lòng nhập đầy đủ chữ Hán tự và Pinyin.');
      return;
    }

    const wordItem: WordItem = {
      id: editingIndex !== null && customWords[editingIndex]
        ? customWords[editingIndex].id
        : `custom-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      language: 'zh',
      fullWord: hanzi,
      pinyinSpaced: pinyin,
      latinInput: normalizePinyin(pinyin),
      meaning: meaning || hanzi,
      hanViet: hanViet || undefined,
      hskLevel: formLevel,
      category: 'Tự thêm',
      audioText: hanzi
    };

    if (onSaveCustomWord) {
      const targetIdx = editingIndex !== null ? editingIndex : (existingWordIndex !== -1 ? existingWordIndex : undefined);
      onSaveCustomWord(wordItem, targetIdx);

      if (editingIndex !== null) {
        setCustomImportSuccess(`Đã ghi đè thay thế từ "${hanzi}" tại vị trí #${editingIndex + 1}.`);
      } else if (existingWordIndex !== -1) {
        setCustomImportSuccess(`Hán tự "${hanzi}" đã có sẵn. Đã ghi đè thay thế tại vị trí #${existingWordIndex + 1}.`);
      } else {
        setCustomImportSuccess(`Đã thêm từ mới "${hanzi}" vào cuối danh sách (vị trí #${customWords.length + 1}).`);
      }

      setTimeout(() => setCustomImportSuccess(null), 3500);
      handleCancelEdit();
    }
  };

  // Parse Text Area Input (Paste multiple words)
  const handleImportCustomVocab = () => {
    setImportError(null);
    if (!customText.trim()) {
      setImportError('Vui lòng nhập hoặc dán danh sách từ vựng.');
      return;
    }

    try {
      const lines = customText.split('\n').filter(l => l.trim().length > 0);
      const rows: Record<string, string>[] = [];

      lines.forEach(line => {
        if (line.includes('Hán tự') || line.includes('Hanzi') || line.includes('STT')) return;

        const parts = line.split(/[,，\t]/).map(p => p.trim());
        if (parts.length >= 2) {
          let hanzi = parts[0];
          let pinyin = parts[1];
          let category = parts[2] || '';
          let meaning = parts[3] || '';
          let meaningEn = parts[4] || '';

          if (/^\d+$/.test(parts[0]) && parts.length >= 3) {
            hanzi = parts[1];
            pinyin = parts[2];
            category = parts[3] || '';
            meaning = parts[4] || '';
            meaningEn = parts[5] || '';
          }

          rows.push({
            'Hán tự': hanzi,
            'Pinyin': pinyin,
            'Từ loại': category,
            'Nghĩa tiếng Việt': meaning,
            'Nghĩa tiếng Anh': meaningEn,
          });
        }
      });

      const newWords = processRowsIntoWords(rows, targetLevel);

      if (newWords.length > 0) {
        if (importMode === 'replace') {
          if (onSetCustomWords) {
            onSetCustomWords(newWords);
          } else if (onAddCustomWords) {
            onAddCustomWords(newWords);
          }
          setCustomImportSuccess(`Đã nạp mới ${newWords.length} từ (Ghi đè thay thế toàn bộ danh sách cũ).`);
        } else {
          if (onAddCustomWords) {
            onAddCustomWords(newWords);
          }
          setCustomImportSuccess(`Đã cộng thêm ${newWords.length} từ vào danh sách hiện tại (Tổng: ${customWords.length + newWords.length} từ).`);
        }
        setTimeout(() => setCustomImportSuccess(null), 3500);
        setCustomText('');
      } else {
        setImportError('Không tìm thấy dòng từ vựng hợp lệ. Vui lòng kiểm tra định dạng.');
      }
    } catch (err: unknown) {
      setImportError(`Lỗi xử lý dữ liệu: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Handle File Upload (.xlsx, .xls, .csv)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setImportError(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });

        const allRows: Record<string, unknown>[] = [];
        wb.SheetNames.forEach(sheetName => {
          const ws = wb.Sheets[sheetName];
          const data = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);
          if (data && data.length > 0) {
            allRows.push(...data);
          }
        });

        const newWords = processRowsIntoWords(allRows, targetLevel);

        if (newWords.length > 0) {
          if (importMode === 'replace') {
            if (onSetCustomWords) {
              onSetCustomWords(newWords);
            } else if (onAddCustomWords) {
              onAddCustomWords(newWords);
            }
            setCustomImportSuccess(`Đã nạp file "${file.name}" (${newWords.length} từ) thành công! Đã thay thế toàn bộ danh sách cũ.`);
          } else {
            if (onAddCustomWords) {
              onAddCustomWords(newWords);
            }
            setCustomImportSuccess(`Đã cộng thêm ${newWords.length} từ từ file "${file.name}" vào danh sách hiện tại.`);
          }
          setTimeout(() => setCustomImportSuccess(null), 4000);
          handleCancelEdit();
        } else {
          setImportError('Không tìm thấy cột từ vựng hợp lệ trong file (Hán tự / Word / Từ, Pinyin / Phiên âm).');
        }
      } catch (err: unknown) {
        setImportError(`Lỗi đọc file: ${err instanceof Error ? err.message : String(err)}`);
      }
    };
    reader.readAsBinaryString(file);
    e.target.value = '';
  };

  // Export current custom words to Excel
  const handleExportExcel = () => {
    if (customWords.length === 0) return;
    try {
      const exportData = customWords.map((w, idx) => ({
        'STT': idx + 1,
        'Cấp độ': w.hskLevel || 'Đời sống',
        'Hán tự': w.fullWord,
        'Pinyin': w.pinyinSpaced,
        'Âm Hán-Việt': w.hanViet || '',
        'Nghĩa tiếng Việt': w.meaning,
        'Nghĩa tiếng Anh': w.meaningEn || '',
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Từ vựng của tôi');
      XLSX.writeFile(wb, `tu_vung_custom_${new Date().toISOString().slice(0, 10)}.xlsx`);
    } catch (e) {
      console.warn('Export excel error', e);
    }
  };

  const filteredCustomWords = customWords.filter(w => {
    const matchesLevel =
      customListFilter === 'Tất cả' || (w.hskLevel || 'Đời sống') === customListFilter;
    if (!matchesLevel) return false;
    if (!searchTerm.trim()) return true;
    const s = searchTerm.trim().toLowerCase();
    return (
      w.fullWord.includes(s) ||
      w.pinyinSpaced.toLowerCase().includes(s) ||
      w.meaning.toLowerCase().includes(s) ||
      (w.hanViet && w.hanViet.toLowerCase().includes(s))
    );
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cài đặt"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none font-sans text-[#ede7dc]"
    >
      <div className="bg-[#1c1a17] border-2 border-[#2f2b25] w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Navigation Tabs */}
        <div className="px-5 py-3 border-b border-[#2f2b25] flex items-center justify-between bg-[#141311]">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActiveTab('game')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer font-display tracking-wider ${
                activeTab === 'game'
                  ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Trò chơi
            </button>
            <button
              onClick={() => setActiveTab('audio')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer font-display tracking-wider ${
                activeTab === 'audio'
                  ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Âm thanh
            </button>
            <button
              onClick={() => setActiveTab('vocab')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer font-display tracking-wider flex items-center gap-1.5 ${
                activeTab === 'vocab'
                  ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span>Từ vựng của tôi</span>
              {customWords.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500/30 text-amber-300 rounded-md text-[10px] font-mono">
                  {customWords.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-200 p-1.5 hover:bg-[#25221d] rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab 1: Game Settings */}
        {activeTab === 'game' && (
          <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
            {/* Game Mode: 4 Modes */}
            <div>
              <span className="text-stone-300 font-medium block mb-1.5">
                Phong cách trải nghiệm & Thử thách:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ gameMode: 'practice' })}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                    settings.gameMode === 'practice'
                      ? 'bg-emerald-500/15 border-emerald-500 text-emerald-300 font-bold ring-1 ring-emerald-500/30'
                      : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Coffee className="w-4 h-4 text-emerald-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">☕ Zen Thư Giãn</div>
                      <div className="text-[10px] text-stone-400">Không Game Over, không trừ máu</div>
                    </div>
                  </div>
                  {settings.gameMode === 'practice' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500 text-black font-bold">
                      BẬT
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSettings({ gameMode: 'arcade' })}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                    settings.gameMode === 'arcade'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold ring-1 ring-amber-500/30'
                      : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">🚀 Arcade Chiến Binh</div>
                      <div className="text-[10px] text-stone-400">Thanh Máu, Boss, Fever x2</div>
                    </div>
                  </div>
                  {settings.gameMode === 'arcade' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500 text-black font-bold">
                      BẬT
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSettings({ gameMode: 'time_attack' })}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                    settings.gameMode === 'time_attack'
                      ? 'bg-cyan-500/15 border-cyan-500 text-cyan-300 font-bold ring-1 ring-cyan-500/30'
                      : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Timer className="w-4 h-4 text-cyan-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">⏱️ Đua Thời Gian (60s)</div>
                      <div className="text-[10px] text-stone-400">Đếm ngược, gõ đúng +2s, combo +5s</div>
                    </div>
                  </div>
                  {settings.gameMode === 'time_attack' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-cyan-500 text-black font-bold">
                      BẬT
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => onUpdateSettings({ gameMode: 'boss_rush' })}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between ${
                    settings.gameMode === 'boss_rush'
                      ? 'bg-rose-500/15 border-rose-500 text-rose-300 font-bold ring-1 ring-rose-500/30'
                      : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Swords className="w-4 h-4 text-rose-400" />
                    <div>
                      <div className="text-xs font-semibold text-white">🥊 Đại Chiến Trùm</div>
                      <div className="text-[10px] text-stone-400">Liên hoàn câu giao tiếp hoàn chỉnh</div>
                    </div>
                  </div>
                  {settings.gameMode === 'boss_rush' && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500 text-black font-bold">
                      BẬT
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Scope: Lesson & Topic if HSK 1 - 6 */}
            {settings.selectedHsk !== 'Đời sống' && settings.selectedHsk !== 'Tự nạp' && (
              <div className="p-3 bg-[#151412] border border-[#2c2822] rounded-xl space-y-2">
                <div className="flex items-center justify-between text-stone-300 font-medium">
                  <span className="flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                    <span>Bài học đang chọn ({settings.selectedHsk}):</span>
                  </span>
                  {(settings.selectedLessonNumber !== 'all' || settings.selectedTopic !== 'all') && (
                    <button
                      type="button"
                      onClick={() => onUpdateSettings({ selectedLessonNumber: 'all', selectedTopic: 'all' })}
                      className="text-[10px] text-amber-400 hover:underline cursor-pointer"
                    >
                      Học toàn bộ bài
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] text-stone-500 block mb-1">Theo Bài học:</label>
                    <select
                      value={settings.selectedLessonNumber || 'all'}
                      onChange={e => onUpdateSettings({ selectedLessonNumber: e.target.value, selectedTopic: 'all' })}
                      className="w-full bg-[#1c1a17] border border-[#353028] text-stone-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="all">-- Toàn bộ bài học --</option>
                      {getLessonsByLevel(settings.selectedHsk).map(l => (
                        <option key={l.id} value={l.lessonNumber}>
                          {l.lessonNumber}: {l.titleVi} ({l.wordCount} từ)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-stone-500 block mb-1">Hoặc theo Chủ đề:</label>
                    <select
                      value={settings.selectedTopic || 'all'}
                      onChange={e => onUpdateSettings({ selectedTopic: e.target.value, selectedLessonNumber: 'all' })}
                      className="w-full bg-[#1c1a17] border border-[#353028] text-stone-200 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      <option value="all">-- Tất cả chủ đề --</option>
                      {getTopicsByLevel(settings.selectedHsk).map(t => (
                        <option key={t.id} value={t.topicName}>
                          {t.topicName} ({t.wordCount} từ)
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Play Mode */}
            <div>
              <span className="text-stone-300 font-medium block mb-1.5">
                Chế độ chơi (Play Mode):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { id: 'hanzi_to_pinyin', name: 'Nhìn chữ Hán ➔ Gõ Pinyin', desc: 'Luyện nhận diện mặt chữ' },
                  { id: 'meaning_to_pinyin', name: 'Nhớ nghĩa tiếng Việt ➔ Gõ Pinyin', desc: 'Phản xạ giao tiếp & mở Hán tự' },
                  { id: 'listening_to_pinyin', name: 'Nghe bắt âm ➔ Gõ Pinyin', desc: 'Luyện nghe & bắt vần' },
                  { id: 'cloze_practice', name: 'Luyện điền khuyết Pinyin', desc: 'Ôn tập từ mới' },
                  { id: 'random_mix', name: 'Thử Thách Hỗn Hợp (Mix)', desc: 'Mỗi từ rơi ngẫu nhiên đổi kiểu hiển thị' },
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    onClick={() => onUpdateSettings({ playMode: mode.id as any })}
                    className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                      settings.playMode === mode.id
                        ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                        : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35]'
                    }`}
                  >
                    <div className="text-xs font-semibold">{mode.name}</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">{mode.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Cloze Style */}
            {settings.playMode === 'cloze_practice' && (
              <div>
                <span className="text-stone-300 font-medium block mb-1.5">
                  Kiểu ẩn Pinyin:
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {clozeStyles.map(cs => (
                    <button
                      key={cs.id}
                      type="button"
                      onClick={() => onUpdateSettings({ clozeStyle: cs.id })}
                      className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                        settings.clozeStyle === cs.id
                          ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                          : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35]'
                      }`}
                    >
                      <div className="text-xs font-semibold">{cs.name}</div>
                      <div className="text-[10px] text-stone-500 mt-0.5 font-mono">{cs.example}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Spawn Mode */}
            <div>
              <span className="text-stone-300 font-medium block mb-1.5">
                Chế độ rơi từ:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ spawnMode: 'single' })}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    settings.spawnMode === 'single'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                      : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35]'
                  }`}
                >
                  <div className="text-xs font-semibold">Từng từ một (Single)</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">Tập trung, rơi ngẫu nhiên</div>
                </button>
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ spawnMode: 'multi' })}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer ${
                    settings.spawnMode === 'multi'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold'
                      : 'bg-[#151412] border-[#2c2822] text-stone-400 hover:border-[#443e35]'
                  }`}
                >
                  <div className="text-xs font-semibold">Nhiều từ rơi (Multi)</div>
                  <div className="text-[10px] text-stone-500 mt-0.5">Click/Tab để nhắm mục tiêu</div>
                </button>
              </div>
            </div>

            {/* Speed Multiplier */}
            <div className="bg-[#151412] border border-[#2c2822] rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-stone-300 font-medium">Tốc độ rơi</span>
                <span className="text-amber-400 font-mono font-bold text-sm">
                  {settings.speedMultiplier}x
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="2.5"
                step="0.1"
                value={settings.speedMultiplier}
                onChange={e => onUpdateSettings({ speedMultiplier: parseFloat(e.target.value) })}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-2">
              <div className="bg-[#151412] border border-[#2c2822] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-stone-200">Đấu Boss câu dài</div>
                  <div className="text-[11px] text-stone-400">Xuất hiện chiến hạm sau mỗi 6 từ</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableBossFight}
                  onChange={e => onUpdateSettings({ enableBossFight: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              <div className="bg-[#151412] border border-[#2c2822] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-stone-200">Lặp lại từ bị rơi chạm đáy</div>
                  <div className="text-[11px] text-stone-400">Tự động đẩy vào hàng đợi ôn lại</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.repeatMissedWords}
                  onChange={e => onUpdateSettings({ repeatMissedWords: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>

              <div className="bg-[#151412] border border-[#2c2822] rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-stone-200">Hiển thị gợi ý nghĩa & Hán-Việt</div>
                  <div className="text-[11px] text-stone-400">Hiện manh mối khi chơi</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showHints}
                  onChange={e => onUpdateSettings({ showHints: e.target.checked })}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Audio Settings */}
        {activeTab === 'audio' && (
          <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
            <div className="bg-[#151412] border border-[#2c2822] rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-stone-200">Hiệu ứng âm thanh (SFX)</div>
                <div className="text-[11px] text-stone-400">Âm thanh bắn đạn laser, nốt nhạc và combo</div>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={e => onUpdateSettings({ soundEnabled: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            <div className="bg-[#151412] border border-[#2c2822] rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-stone-200">Tự động phát âm từ vựng</div>
                <div className="text-[11px] text-stone-400">Đọc phát âm từ vựng khi vừa xuất hiện rơi xuống</div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPronounce !== false}
                onChange={e => onUpdateSettings({ autoPronounce: e.target.checked })}
                className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
              />
            </div>

            <div className="bg-[#151412] border border-[#2c2822] rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-stone-300 font-medium">Tốc độ phát âm (TTS)</span>
                <span className="text-amber-400 font-mono font-bold text-sm">
                  {settings.ttsRate || 0.95}x
                </span>
              </div>
              <input
                type="range"
                min="0.6"
                max="1.3"
                step="0.05"
                value={settings.ttsRate || 0.95}
                onChange={e => {
                  const rate = parseFloat(e.target.value);
                  onUpdateSettings({ ttsRate: rate });
                  soundManager.setTtsRate(rate);
                }}
                className="w-full accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="bg-[#151412] border border-[#2c2822] rounded-xl p-3.5 flex items-center justify-between">
              <div>
                <div className="font-medium text-stone-200">Thử giọng đọc tiếng Trung</div>
                <div className="text-[11px] text-stone-400">Kiểm tra giọng Web Speech Native</div>
              </div>
              <button
                type="button"
                onClick={() => handleTestTTS('你好，欢迎学习汉语！')}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25221d] hover:bg-[#322d26] border border-[#3a342b] text-stone-200 rounded-lg transition-colors cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Nghe thử</span>
              </button>
            </div>
          </div>
        )}

        {/* Tab 3: Custom Vocabulary */}
        {activeTab === 'vocab' && (
          <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
            {/* Template Banner */}
            <div className="bg-[#151412] border border-[#2c2822] rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-stone-300 font-medium">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>File mẫu & Tải dữ liệu gốc HSK 3.0</span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Định dạng các cột: <code className="text-stone-300 font-mono">Hán tự, Pinyin, Âm Hán-Việt, Nghĩa tiếng Việt</code>
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="/data/HSK3.0_1-6_tu_vung_nghia_Viet.xlsx"
                  download="HSK3.0_1-6_tu_vung_nghia_Viet.xlsx"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25221d] hover:bg-[#322d26] border border-[#3a342b] text-stone-200 rounded-lg font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tải file gốc Excel (5,181 từ)</span>
                </a>
                <a
                  href="/data/mau_nhap_tu_vung_hsk.xlsx"
                  download="mau_nhap_tu_vung_hsk.xlsx"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#25221d] hover:bg-[#322d26] border border-[#3a342b] text-stone-200 rounded-lg font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tải file mẫu Excel</span>
                </a>
              </div>
            </div>

            {/* Chế độ nạp dữ liệu: Ghi đè vs Cộng thêm */}
            <div className="bg-[#151412] border border-[#2c2822] rounded-xl p-3">
              <span className="text-stone-300 font-semibold block mb-2 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                <span>Chế độ nạp file / danh sách từ:</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setImportMode('replace')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    importMode === 'replace'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-sm'
                      : 'bg-[#1c1a17] border-[#2f2b25] text-stone-400 hover:border-[#443e35]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                    <span>Ghi đè làm mới (Thay thế toàn bộ)</span>
                  </div>
                  <p className="text-[10px] text-stone-400 font-normal mt-1 leading-relaxed">
                    Xóa sạch từ cũ, biến file mới thành bộ từ duy nhất để học.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setImportMode('append')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    importMode === 'append'
                      ? 'bg-amber-500/15 border-amber-500 text-amber-300 font-bold shadow-sm'
                      : 'bg-[#1c1a17] border-[#2f2b25] text-stone-400 hover:border-[#443e35]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs">
                    <Plus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Cộng thêm vào đuôi (Append)</span>
                  </div>
                  <p className="text-[10px] text-stone-400 font-normal mt-1 leading-relaxed">
                    Giữ nguyên các từ cũ, bổ sung từ mới vào dưới; cập nhật nếu trùng.
                  </p>
                </button>
              </div>
            </div>

            {/* Phân loại cấp độ khi nạp file */}
            <div>
              <span className="text-stone-300 font-medium block mb-1.5">
                Phân loại cấp độ khi nạp file:
              </span>
              <div className="flex flex-wrap gap-1">
                {['auto', 'HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'Đời sống'].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setTargetLevel(lvl)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      targetLevel === lvl
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                        : 'bg-[#151412] text-stone-400 border-[#2c2822] hover:border-[#443e35]'
                    }`}
                  >
                    {lvl === 'auto' ? 'Tự động' : lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* 1. NẠP FILE */}
            <div className="border border-dashed border-[#3a342b] hover:border-amber-500/50 rounded-xl p-4 text-center bg-[#151412]/80 transition-colors">
              <Upload className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
              <div className="font-bold text-stone-200 text-xs">
                Tải lên file Excel (.xlsx, .xls) hoặc CSV
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                Hỗ trợ đa ngôn ngữ: tiếng Trung (Hán tự, Pinyin), tiếng Anh (Word, IPA/Nghĩa), tiếng Nhật (Kanji, Romaji).
              </p>
              <div className="mt-1 text-[11px] font-medium text-amber-400">
                Chế độ áp dụng: {importMode === 'replace' ? '🔄 Ghi đè (Thay thế toàn bộ)' : '➕ Cộng thêm vào danh sách cũ'}
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".xlsx, .xls, .csv"
                className="hidden"
                id="vocab-file-input"
              />
              <label
                htmlFor="vocab-file-input"
                className="inline-flex items-center gap-1.5 mt-2.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs cursor-pointer transition-colors"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>{importMode === 'replace' ? 'Chọn file để ghi đè làm mới' : 'Chọn file để cộng thêm vào đuôi'}</span>
              </label>
            </div>

            {/* 2. FORM THÊM / SỬA TỪ VỰNG (Điền thêm hoặc ghi đè tại vị trí) */}
            <div className="bg-[#151412] border border-[#2c2822] rounded-xl p-3.5 space-y-3">
              <div className="flex items-center justify-between border-b border-[#2c2822] pb-2">
                <span className="font-bold text-xs text-stone-200 flex items-center gap-1.5">
                  {editingIndex !== null ? (
                    <>
                      <Pencil className="w-3.5 h-3.5 text-amber-400" />
                      <span>Đang sửa từ tại vị trí #{editingIndex + 1}: <strong className="text-amber-300 font-mono">{customWords[editingIndex]?.fullWord}</strong></span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Điền thêm từ mới hoặc sửa từ bị sai</span>
                    </>
                  )}
                </span>
                {editingIndex !== null && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-[11px] text-stone-400 hover:text-stone-200 underline cursor-pointer"
                  >
                    Hủy sửa
                  </button>
                )}
              </div>

              {/* Form Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">
                    Chữ Hán (Hán tự) <span className="text-rose-400">*</span>:
                  </label>
                  <input
                    type="text"
                    value={formHanzi}
                    onChange={e => setFormHanzi(e.target.value)}
                    placeholder="Ví dụ: 苹果 hoặc 你好"
                    className="w-full bg-[#1c1a17] border border-[#2f2b25] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">
                    Pinyin (phiên âm) <span className="text-rose-400">*</span>:
                  </label>
                  <input
                    type="text"
                    value={formPinyin}
                    onChange={e => setFormPinyin(e.target.value)}
                    placeholder="Ví dụ: píng guǒ hoặc ni hao"
                    className="w-full bg-[#1c1a17] border border-[#2f2b25] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">
                    Nghĩa tiếng Việt:
                  </label>
                  <input
                    type="text"
                    value={formMeaning}
                    onChange={e => setFormMeaning(e.target.value)}
                    placeholder="Ví dụ: Quả táo hoặc Xin chào"
                    className="w-full bg-[#1c1a17] border border-[#2f2b25] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div>
                  <label className="text-[11px] text-stone-400 block mb-1">
                    Âm Hán-Việt (tùy chọn):
                  </label>
                  <input
                    type="text"
                    value={formHanViet}
                    onChange={e => setFormHanViet(e.target.value)}
                    placeholder="Ví dụ: Bình Quả hoặc Nhĩ Hảo"
                    className="w-full bg-[#1c1a17] border border-[#2f2b25] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[11px] text-stone-400 block mb-1">
                    Cấp độ phân loại:
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'Đời sống'].map(lvl => (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setFormLevel(lvl as HskLevel)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                          formLevel === lvl
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                            : 'bg-[#1c1a17] text-stone-400 border-[#2f2b25] hover:border-[#443e35]'
                        }`}
                      >
                        {lvl}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Duplicate Notice */}
              {editingIndex === null && existingWordIndex !== -1 && (
                <div className="p-2 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-300 text-[11px] flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  <span>
                    Chữ Hán <strong>"{formHanzi}"</strong> đã có sẵn ở vị trí <strong>#{existingWordIndex + 1}</strong>. Bấm Lưu sẽ <strong>ghi đè và thay thế</strong> tại vị trí đó!
                  </span>
                </div>
              )}

              {/* Form Action Button */}
              <div className="flex justify-end gap-2 pt-1">
                {editingIndex !== null ? (
                  <button
                    type="button"
                    onClick={handleSaveWordForm}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg text-xs cursor-pointer transition-colors flex items-center gap-1.5"
                  >
                    <span>Lưu & Ghi đè vào vị trí #{editingIndex + 1}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveWordForm}
                    className={`px-4 py-2 font-bold rounded-lg text-xs cursor-pointer transition-colors flex items-center gap-1.5 ${
                      existingWordIndex !== -1
                        ? 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                        : 'bg-[#25221d] hover:bg-[#322d26] border border-[#3a342b] text-stone-200'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>
                      {existingWordIndex !== -1
                        ? `Ghi đè thay thế vào vị trí #${existingWordIndex + 1}`
                        : 'Thêm từ mới vào cuối danh sách'}
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* 3. DÁN DANH SÁCH NHIỀU TỪ */}
            <div>
              <label className="text-stone-300 font-medium block mb-1">
                Hoặc dán nhanh danh sách nhiều từ (mỗi dòng 1 từ):
              </label>
              <textarea
                rows={3}
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder={`Mỗi dòng 1 từ (Định dạng: Từ, Phiên âm, Nghĩa)\nVí dụ Tiếng Trung: 你好, ni hao, xin chào\nVí dụ Tiếng Anh: apple, /ˈæp.əl/, quả táo\nVí dụ Tiếng Nhật: 桜, sakura, hoa anh đào`}
                className="w-full bg-[#151412] border border-[#2c2822] rounded-xl p-2.5 text-xs font-mono text-stone-200 focus:outline-none focus:border-amber-500/60 custom-scrollbar"
              />
              <button
                type="button"
                onClick={handleImportCustomVocab}
                className="w-full mt-1.5 bg-[#25221d] hover:bg-[#322d26] border border-[#3a342b] text-stone-200 font-medium py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                {importMode === 'replace' 
                  ? 'Ghi đè làm mới bằng danh sách này (Thay thế toàn bộ)' 
                  : 'Cộng thêm danh sách này vào đuôi'}
              </button>
            </div>

            {/* Notifications */}
            {customImportSuccess && (
              <div className="p-2.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{customImportSuccess}</span>
              </div>
            )}

            {importError && (
              <div className="p-2.5 bg-rose-950/60 border border-rose-500/40 rounded-xl text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{importError}</span>
              </div>
            )}

            {/* 4. DANH SÁCH TỪ ĐÃ THÊM */}
            {customWords.length > 0 && (
              <div className="pt-3 border-t border-[#2c2822] space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="font-bold text-xs text-stone-200 flex items-center gap-1.5">
                    <span>Danh sách từ hiện có: <strong className="text-amber-400">{customWords.length}</strong> từ</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      title="Xuất file Excel để lưu trữ"
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#25221d] hover:bg-[#322d26] border border-[#3a342b] rounded-lg text-stone-300 text-xs transition-colors cursor-pointer"
                    >
                      <FileDown className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Xuất Excel</span>
                    </button>
                    {onClearCustomWords && (
                      <button
                        type="button"
                        onClick={onClearCustomWords}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 rounded-lg text-rose-300 text-xs transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa toàn bộ</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Level Filter Tabs for Custom Words */}
                <div className="flex flex-wrap gap-1">
                  {['Tất cả', 'HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'Đời sống'].map(lvl => {
                    const cnt =
                      lvl === 'Tất cả'
                        ? customWords.length
                        : customWords.filter(w => (w.hskLevel || 'Đời sống') === lvl).length;
                    const isSelected = customListFilter === lvl;
                    return (
                      <button
                        key={lvl}
                        type="button"
                        onClick={() => setCustomListFilter(lvl)}
                        className={`px-2 py-0.5 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                            : cnt === 0
                            ? 'text-stone-600 border-[#22201c] bg-[#121110]'
                            : 'text-stone-400 hover:text-stone-200 border-[#2c2822] bg-[#151412]'
                        }`}
                      >
                        {lvl} ({cnt})
                      </button>
                    );
                  })}
                </div>

                {/* Search in custom list */}
                {customWords.length > 5 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-stone-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      placeholder="Tìm kiếm trong danh sách từ tự thêm..."
                      className="w-full bg-[#151412] border border-[#2c2822] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500/60"
                    />
                  </div>
                )}

                {/* Words Scrollable Table/List */}
                <div className="max-h-56 overflow-y-auto custom-scrollbar border border-[#2c2822] rounded-xl bg-[#151412] divide-y divide-[#25221d]">
                  {filteredCustomWords.map((w) => {
                    const originalIndex = customWords.indexOf(w);
                    const isBeingEdited = editingIndex === originalIndex;
                    return (
                      <div
                        key={w.id}
                        className={`p-2.5 flex items-center justify-between gap-2 transition-colors ${
                          isBeingEdited ? 'bg-amber-500/10 border-l-2 border-amber-500' : 'hover:bg-[#1a1815]'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <span className="text-[10px] text-stone-500 font-mono w-6 shrink-0 text-center">
                            #{originalIndex + 1}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#25221d] text-amber-400 border border-amber-500/30 shrink-0">
                            {w.hskLevel || 'Đời sống'}
                          </span>
                          <span className="font-bold text-base text-white font-mono shrink-0">
                            {w.fullWord}
                          </span>
                          <span className="text-xs text-amber-400 font-mono shrink-0">
                            [{w.pinyinSpaced}]
                          </span>
                          {w.hanViet && (
                            <span className="text-[11px] text-stone-400 hidden sm:inline truncate">
                              • {w.hanViet}
                            </span>
                          )}
                          <span className="text-xs text-stone-300 truncate">
                            - {w.meaning}
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => soundManager.speak(w.audioText, w.language || 'zh', true)}
                            title="Nghe phát âm"
                            className="p-1 text-stone-400 hover:text-white rounded hover:bg-[#25221d] transition-colors cursor-pointer"
                          >
                            <Volume2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEditWord(w, originalIndex)}
                            title="Chỉnh sửa từ này tại vị trí này"
                            className={`p-1 rounded transition-colors cursor-pointer flex items-center gap-0.5 text-xs ${
                              isBeingEdited
                                ? 'bg-amber-500 text-stone-950 font-bold px-1.5'
                                : 'text-stone-400 hover:text-amber-400 hover:bg-[#25221d]'
                            }`}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            <span className="text-[10px]">Sửa</span>
                          </button>
                          {onDeleteCustomWord && (
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteCustomWord(w.id);
                                if (editingIndex === originalIndex) handleCancelEdit();
                              }}
                              title="Xóa từ này"
                              className="p-1 text-stone-400 hover:text-rose-400 rounded hover:bg-[#25221d] transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 bg-[#141311] border-t border-[#2f2b25] flex justify-end">
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
