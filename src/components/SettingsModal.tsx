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
  FileDown
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { GameSettings, ClozeStyle, HskLevel, WordItem } from '../types/game';
import { soundManager } from '../game/SoundManager';

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

  // Helper to process parsed rows
  const processRowsIntoWords = (rows: Record<string, unknown>[], defaultLevel: string): WordItem[] => {
    const newWords: WordItem[] = [];

    rows.forEach((r, idx) => {
      const hanzi = (r['Hán tự'] || r['Hanzi'] || r['hanzi'] || r['Từ'] || r['Word'] || r['0'] || '').toString().trim();
      const pinyin = (r['Pinyin'] || r['pinyin'] || r['Phiên âm'] || r['1'] || '').toString().trim();
      const category = (r['Từ loại'] || r['Category'] || r['type'] || r['2'] || '').toString().trim();
      const meaning = (r['Nghĩa tiếng Việt'] || r['Nghĩa'] || r['nghia'] || r['Meaning'] || r['3'] || '').toString().trim();
      const hanViet = (r['Âm Hán-Việt'] || r['Hán-Việt'] || r['Hán Việt'] || r['hanViet'] || r['han_viet'] || '').toString().trim();
      const meaningEn = (r['Nghĩa tiếng Anh'] || r['MeaningEn'] || r['4'] || '').toString().trim();
      const levelCol = (r['Cấp độ'] || r['Level'] || r['hsk'] || '').toString().trim();

      if (hanzi && pinyin) {
        let level: HskLevel = 'Đời sống';
        if (defaultLevel !== 'auto' && defaultLevel !== 'Tất cả') {
          level = defaultLevel as HskLevel;
        } else if (levelCol && hskLevels.includes(levelCol as HskLevel)) {
          level = levelCol as HskLevel;
        }

        newWords.push({
          id: `custom-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
          language: 'zh',
          hskLevel: level,
          category: category || 'Tự nhập',
          fullWord: hanzi,
          pinyinSpaced: pinyin,
          latinInput: normalizePinyin(pinyin),
          meaning: meaning || hanzi,
          hanViet: hanViet || undefined,
          meaningEn: meaningEn || '',
          audioText: hanzi,
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

      if (newWords.length > 0 && onAddCustomWords) {
        onAddCustomWords(newWords);
        setCustomImportSuccess(`Đã xử lý ${newWords.length} từ: các từ trùng được ghi đè tại vị trí cũ, từ mới được đẩy vào cuối.`);
        setTimeout(() => setCustomImportSuccess(null), 3500);
        setCustomText('');
      } else {
        setImportError('Không tìm thấy dòng từ vựng hợp lệ. Vui lòng kiểm tra định dạng.');
      }
    } catch (err: unknown) {
      setImportError(`Lỗi xử lý dữ liệu: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  // Handle File Upload (.xlsx, .xls, .csv) - Ghi đè file mới luôn!
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
          // Ghi đè file mới luôn theo yêu cầu
          if (onSetCustomWords) {
            onSetCustomWords(newWords);
          } else if (onAddCustomWords) {
            onAddCustomWords(newWords);
          }
          setCustomImportSuccess(`Đã nạp file mới "${file.name}" thành công (${newWords.length} từ). Đã thay thế toàn bộ danh sách cũ.`);
          setTimeout(() => setCustomImportSuccess(null), 4000);
          handleCancelEdit();
        } else {
          setImportError('Không tìm thấy cột "Hán tự" và "Pinyin" trong file.');
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

            {/* 1. NẠP FILE MỚI (Ghi đè file mới luôn) */}
            <div className="border border-dashed border-[#3a342b] hover:border-amber-500/50 rounded-xl p-4 text-center bg-[#151412]/80 transition-colors">
              <Upload className="w-5 h-5 text-amber-400 mx-auto mb-1.5" />
              <div className="font-bold text-stone-200 text-xs">
                Tải lên file Excel (.xlsx) hoặc CSV mới
              </div>
              <p className="text-[11px] text-stone-400 mt-0.5">
                💡 Khi đẩy file, hệ thống sẽ <strong className="text-amber-400">ghi đè và tạo bộ từ mới hoàn toàn</strong> (thay thế toàn bộ file cũ).
              </p>
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
                <span>Chọn file từ máy tính (Ghi đè file mới)</span>
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
                placeholder={`Hán tự, Pinyin, Nghĩa tiếng Việt\n你好, ni hao, xin chào\n谢谢, xie xie, cảm ơn`}
                className="w-full bg-[#151412] border border-[#2c2822] rounded-xl p-2.5 text-xs font-mono text-stone-200 focus:outline-none focus:border-amber-500/60 custom-scrollbar"
              />
              <button
                type="button"
                onClick={handleImportCustomVocab}
                className="w-full mt-1.5 bg-[#25221d] hover:bg-[#322d26] border border-[#3a342b] text-stone-200 font-medium py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Nạp danh sách từ này (từ trùng sẽ ghi đè vị trí cũ, từ mới đẩy xuống cuối)
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
                            onClick={() => soundManager.speak(w.audioText, 'zh', true)}
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
