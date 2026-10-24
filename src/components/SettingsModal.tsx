import React, { useState, useRef } from 'react';
import {
  X,
  Download,
  Upload,
  Trash2,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle2,
  Play
} from 'lucide-react';
import * as XLSX from 'xlsx';
import type { GameSettings, ClozeStyle, HskLevel, WordItem } from '../types/game';
import { soundManager } from '../game/SoundManager';
import { CHINESE_HSK_DATA } from '../data/vocabData';

interface SettingsModalProps {
  isOpen: boolean;
  settings: GameSettings;
  onUpdateSettings: (newSettings: Partial<GameSettings>) => void;
  onClose: () => void;
  customWords?: WordItem[];
  onAddCustomWords?: (words: WordItem[]) => void;
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
  onAddCustomWords,
  onClearCustomWords,
}) => {
  const [activeTab, setActiveTab] = useState<'game' | 'audio' | 'vocab'>('game');
  const [customText, setCustomText] = useState<string>('');
  const [targetLevel, setTargetLevel] = useState<string>('auto');
  const [customImportSuccess, setCustomImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

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
          meaningEn: meaningEn || '',
          audioText: hanzi,
        });
      }
    });

    return newWords;
  };

  // Parse Text Area Input
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
        setCustomImportSuccess(`Đã thêm thành công ${newWords.length} từ vựng mới.`);
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

        if (newWords.length > 0 && onAddCustomWords) {
          onAddCustomWords(newWords);
          setCustomImportSuccess(`Đã nạp thành công ${newWords.length} từ từ file "${file.name}".`);
          setTimeout(() => setCustomImportSuccess(null), 3500);
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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Cài đặt"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150 select-none font-sans text-[#ede7dc]"
    >
      <div className="bg-[#1c1a17] border-2 border-[#2f2b25] w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
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
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 font-display tracking-wider ${
                activeTab === 'vocab'
                  ? 'bg-amber-500/20 border border-amber-500/50 text-amber-400 font-bold shadow-sm'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              <span>Thêm từ vựng</span>
              {customWords.length > 0 && (
                <span className="px-1.5 py-0.2 bg-amber-500 text-stone-950 text-[10px] rounded-full font-bold font-mono">
                  {customWords.length}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer hover:bg-[#25221d]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab 1: Game Settings */}
        {activeTab === 'game' && (
          <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
            {/* HSK Level Selection */}
            <div>
              <label className="text-slate-300 font-medium block mb-2">
                Cấp độ HSK:
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {hskLevels.map(lvl => {
                  const count = lvl === 'Tất cả' 
                    ? (CHINESE_HSK_DATA.length + customWords.length) 
                    : (CHINESE_HSK_DATA.filter(w => w.hskLevel === lvl).length + customWords.filter(w => w.hskLevel === lvl).length);
                  const isSelected = settings.selectedHsk === lvl;
                  return (
                    <button
                      key={lvl}
                      onClick={() => onUpdateSettings({ selectedHsk: lvl })}
                      className={`p-2 rounded-xl border text-center transition-colors cursor-pointer ${
                        isSelected
                          ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-300 font-semibold'
                          : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-semibold">{lvl}</div>
                      <div className="text-[10px] text-slate-400">{count} từ</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Falling Speed Slider */}
            <div className="bg-slate-950/50 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Tốc độ rơi</span>
                <span className="text-cyan-400 font-mono font-bold text-sm">
                  {settings.speedMultiplier.toFixed(1)}x
                </span>
              </div>
              <input
                type="range"
                min="0.8"
                max="2.5"
                step="0.1"
                value={settings.speedMultiplier}
                onChange={e => onUpdateSettings({ speedMultiplier: parseFloat(e.target.value) })}
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.8x (Chậm)</span>
                <span>1.2x (Chuẩn)</span>
                <span>2.5x (Nhanh)</span>
              </div>
            </div>

            {/* Spawn Mode */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onUpdateSettings({ spawnMode: 'single' })}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  settings.spawnMode === 'single'
                    ? 'bg-slate-800 border-cyan-500/50 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-semibold text-slate-200">Rơi từng từ một</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Gõ xong từ này sẽ rơi từ tiếp theo</div>
              </button>

              <button
                type="button"
                onClick={() => onUpdateSettings({ spawnMode: 'multi' })}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  settings.spawnMode === 'multi'
                    ? 'bg-slate-800 border-cyan-500/50 text-white'
                    : 'bg-slate-950/60 border-slate-800 text-slate-400'
                }`}
              >
                <div className="font-semibold text-slate-200">Rơi nhiều từ</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Nhiều từ rơi cùng lúc trên màn hình</div>
              </button>
            </div>

            {/* Hint and Boss Toggles */}
            <div className="space-y-2">
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-200">Gợi ý nghĩa & âm Hán-Việt</div>
                  <div className="text-[11px] text-slate-400">Hiển thị nghĩa để hỗ trợ khi học từ mới</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.showHints}
                  onChange={e => onUpdateSettings({ showHints: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-200">Thử thách Boss ghép câu</div>
                  <div className="text-[11px] text-slate-400">Xuất hiện câu giao tiếp sau mỗi 6 từ bị tiêu diệt</div>
                </div>
                <input
                  type="checkbox"
                  checked={settings.enableBossFight}
                  onChange={e => onUpdateSettings({ enableBossFight: e.target.checked })}
                  className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Cloze Style Config */}
            <div>
              <span className="text-slate-300 font-medium block mb-1.5">
                Kiểu ẩn ký tự (Chế độ Điền khuyết):
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {clozeStyles.map(c => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => onUpdateSettings({ clozeStyle: c.id })}
                    className={`p-2.5 rounded-xl border text-left transition-colors cursor-pointer ${
                      settings.clozeStyle === c.id
                        ? 'bg-slate-800 border-amber-500/50 text-amber-300'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div className="font-medium text-slate-200">{c.name}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">{c.example}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Audio Settings */}
        {activeTab === 'audio' && (
          <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-200">Hiệu ứng âm thanh (SFX)</div>
                <div className="text-[11px] text-slate-400">Âm thanh bắn đạn laser, nốt nhạc và combo</div>
              </div>
              <input
                type="checkbox"
                checked={settings.soundEnabled}
                onChange={e => onUpdateSettings({ soundEnabled: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
              />
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between">
              <div>
                <div className="font-medium text-slate-200">Tự động phát âm từ vựng</div>
                <div className="text-[11px] text-slate-400">Đọc phát âm từ vựng khi vừa xuất hiện rơi xuống</div>
              </div>
              <input
                type="checkbox"
                checked={settings.autoPronounce !== false}
                onChange={e => onUpdateSettings({ autoPronounce: e.target.checked })}
                className="w-4 h-4 accent-cyan-400 rounded cursor-pointer"
              />
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-300 font-medium">Tốc độ phát âm (TTS)</span>
                <span className="text-cyan-400 font-mono font-bold text-sm">
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
                className="w-full accent-cyan-400 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500">
                <span>0.6x (Chậm)</span>
                <span>0.95x (Tự nhiên)</span>
                <span>1.3x (Nhanh)</span>
              </div>
            </div>

            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 space-y-2">
              <span className="text-slate-300 font-medium block">Nghe thử giọng phát âm:</span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleTestTTS('你好，欢迎学习汉语！')}
                  className="flex-1 p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-cyan-400" />
                  <span>"你好，欢迎学习汉语！"</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTestTTS('苹果很好吃。')}
                  className="flex-1 p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Play className="w-3.5 h-3.5 text-cyan-400" />
                  <span>"苹果很好吃。"</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Custom Vocabulary */}
        {activeTab === 'vocab' && (
          <div className="p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1 text-xs">
            {/* Download Templates Banner */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-300 font-medium">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                <span>File mẫu & file dữ liệu gốc</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Định dạng các cột: <code className="text-slate-300 font-mono">Hán tự, Pinyin, Từ loại, Nghĩa tiếng Việt</code>
              </p>
              <div className="flex flex-wrap gap-2 pt-1">
                <a
                  href="/data/HSK3.0_1-6_tu_vung_nghia_Viet.xlsx"
                  download="HSK3.0_1-6_tu_vung_nghia_Viet.xlsx"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tải file gốc Excel (5,181 từ)</span>
                </a>
                <a
                  href="/data/mau_nhap_tu_vung_hsk.xlsx"
                  download="mau_nhap_tu_vung_hsk.xlsx"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-medium transition-colors"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Tải file mẫu Excel</span>
                </a>
              </div>
            </div>

            {/* Target Level */}
            <div>
              <span className="text-slate-300 font-medium block mb-1.5">
                Phân loại từ vựng nạp vào cấp độ:
              </span>
              <div className="flex flex-wrap gap-1">
                {['auto', 'HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6', 'Đời sống'].map(lvl => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setTargetLevel(lvl)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                      targetLevel === lvl
                        ? 'bg-slate-800 text-white border-cyan-500/50'
                        : 'bg-slate-950/60 text-slate-400 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    {lvl === 'auto' ? 'Tự động' : lvl}
                  </button>
                ))}
              </div>
            </div>

            {/* File Upload Box */}
            <div className="border border-dashed border-slate-800 hover:border-slate-700 rounded-xl p-4 text-center bg-slate-950/40 transition-colors">
              <Upload className="w-5 h-5 text-slate-400 mx-auto mb-1.5" />
              <div className="font-medium text-slate-300 text-xs">
                Tải lên file Excel (.xlsx) hoặc CSV
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
                className="inline-flex items-center gap-1.5 mt-2 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-lg text-xs cursor-pointer transition-colors"
              >
                <span>Chọn file từ máy tính</span>
              </label>
            </div>

            {/* Direct Paste */}
            <div>
              <label className="text-slate-300 font-medium block mb-1">
                Hoặc dán trực tiếp danh sách từ:
              </label>
              <textarea
                rows={4}
                value={customText}
                onChange={e => setCustomText(e.target.value)}
                placeholder={`Hán tự, Pinyin, Nghĩa\n你好, ni hao, xin chào\n谢谢, xie xie, cảm ơn`}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-500/60 custom-scrollbar"
              />
              <button
                type="button"
                onClick={handleImportCustomVocab}
                className="w-full mt-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Thêm danh sách từ này
              </button>
            </div>

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

            {customWords.length > 0 && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                <span className="text-slate-400">
                  Đang có <strong className="text-slate-200">{customWords.length}</strong> từ tự thêm.
                </span>
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
            )}
          </div>
        )}

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-950/60 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
