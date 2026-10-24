export type Language = 'en' | 'ja' | 'zh';

export type InputMode = 'latin' | 'ime';

export type Difficulty = 'easy' | 'medium' | 'hard';

// 4 CHẾ ĐỘ HỌC TẬP CHUYÊN SÂU
export type GamePlayMode = 
  | 'hanzi_to_pinyin'     // 1. Nhìn Chữ Hán ➔ Gõ Pinyin (Nhận diện mặt chữ)
  | 'meaning_to_pinyin'   // 2. Nhớ Nghĩa Tiếng Việt ➔ Gõ Pinyin (Phản xạ giao tiếp)
  | 'listening_to_pinyin' // 3. Nghe Bắt Âm ➔ Gõ Pinyin (Giải mã âm thanh / Luyện tai)
  | 'cloze_practice';     // 4. Luyện Từ Mới (Điền khuyết Pinyin / Ôn từ)

export type ClozeStyle = 
  | 'reveal_on_type'  // Lúc đầu ẩn toàn bộ (_ _   _ _ _), gõ được chữ nào làm hiện chữ đó ra! (Mặc định)
  | 'end_letter'      // Ẩn chữ cái cuối: nǐ  hǎ_ (gõ chữ cuối sẽ hiện ra)
  | 'vowels'          // Ẩn nguyên âm/vận mẫu: n_  h_o (gõ nguyên âm sẽ hiện ra)
  | 'initials'        // Ẩn phụ âm đầu: _ǐ  _ǎo (gõ phụ âm sẽ hiện ra)
  | 'second_syllable' // Ẩn âm tiết sau: nǐ  [ ___ ] (gõ từ sau sẽ hiện ra)
  | 'none';           // Hiện sẵn toàn bộ Pinyin từ đầu

export type SpawnMode = 'single' | 'multi';

export type GameMode = 'arcade' | 'practice';

export type DisplayStyle = 'pinyin_to_hanzi' | 'native_first' | 'latin_first';

export type HskLevel = 'HSK 1' | 'HSK 2' | 'HSK 3' | 'HSK 4' | 'HSK 5' | 'HSK 6' | 'Đời sống' | 'Tất cả';

export interface WordItem {
  id: string;
  language: Language;
  fullWord: string;         // Chữ Hán, ví dụ "你好", "火锅"
  meaning: string;          // Nghĩa tiếng Việt, ví dụ "Xin chào", "Lẩu"
  hanViet?: string;         // Âm Hán-Việt, ví dụ "Nhĩ Hảo", "Hỏa Oa"
  pinyinSpaced: string;     // Pinyin có dấu cách phân tách âm tiết: "nǐ hǎo", "huǒ guō"
  latinInput: string;       // Pinyin không dấu chuẩn: "nihao", "huoguo"
  toneInput?: string;       // Pinyin kèm số thanh điệu: "ni3hao3", "huo3guo1"
  phonetic?: string;
  audioText: string;        // Chữ truyền vào TTS để đọc
  hskLevel?: HskLevel;      // Cấp độ HSK 1 - 6 hoặc Đời sống
  category?: string;        // "Chào hỏi", "Ẩm thực", "Mua sắm", hoặc Từ loại
  meaningEn?: string;       // Nghĩa tiếng Anh
  stt?: number;             // Số thứ tự trong cấp độ
}

export interface WordSyllable {
  hanzi: string;         // Chữ Hán tương ứng, ví dụ "苹"
  pinyin: string;        // Pinyin có dấu, ví dụ "píng"
  latinInput: string;    // Chuỗi gõ không dấu, ví dụ "ping"
  hanViet?: string;      // Âm Hán-Việt tương ứng, ví dụ "Bình"
  startIndex: number;    // Vị trí bắt đầu trong targetLetters
  endIndex: number;      // Vị trí kết thúc (exclusive) trong targetLetters
  isRevealed: boolean;   // Đã gõ xong âm tiết này chưa
}

export interface ActiveWord {
  id: string;
  wordItem: WordItem;
  x: number;
  y: number;
  targetY: number;
  speed: number;
  width: number;
  height: number;
  
  fullPinyinChars: string[];    // Mảng ký tự gốc đầy đủ: e.g. ['n', 'ǐ', ' ', 'h', 'ǎ', 'o']
  displayPinyinChars: string[]; // Trạng thái hiển thị ban đầu
  hiddenPinyinIndices: number[]; // Các vị trí ban đầu bị ẩn
  targetLetters: string[];      // Chuỗi ký tự player cần gõ
  typedCount: number;           // Số ký tự đã gõ đúng
  syllables?: WordSyllable[];   // Bóc tách từng âm tiết và Hán tự tương ứng
  
  isRevealingHanzi: boolean;    // Đang trong 0.5s bừng sáng mặt chữ Hán
  revealStartTime: number;
  
  isTargeted: boolean;
  isDestroyed: boolean;
  spawnTime: number;
  hasPlayedAudio: boolean;
}

export interface BossWordSegment {
  hanzi: string;
  pinyinSpaced: string;
  latinInput: string;
  meaning: string;
  hanViet?: string;
}

export interface BossEnemy {
  id: string;
  name: string;             // Ví dụ: "Chiến Hạm HSK - Trùm Cuối"
  fullSentence: string;     // Ví dụ: "很高兴认识你！"
  meaning: string;          // "Rất vui được gặp bạn!"
  audioText: string;
  segments: BossWordSegment[];
  currentSegmentIndex: number;
  typedInSegment: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;               // Di chuyển qua lại
  hp: number;
  maxHp: number;
  isDestroyed: boolean;
  isRevealing: boolean;
  revealStartTime: number;
}

export interface Laser {
  id: string;
  startX: number;
  startY: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  color: string;
  progress: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  radius: number;
  alpha: number;
  decay: number;
}

export interface FloatingText {
  id: string;
  text: string;
  x: number;
  y: number;
  vy: number;
  alpha: number;
  color: string;
}

export interface GameSettings {
  language: Language;
  inputMode: InputMode;
  playMode: GamePlayMode;      // 4 Chế độ cốt lõi: Nhìn Chữ | Nhớ Nghĩa | Nghe Bắt Âm | Điền Khuyết
  clozeStyle: ClozeStyle;      // Dùng cho chế độ Điền Khuyết (cloze_practice)
  spawnMode: SpawnMode;        // 'single' vs 'multi'
  gameMode: GameMode;          // 'arcade' vs 'practice'
  selectedHsk: HskLevel;       // HSK 1 - 6 hoặc Đời sống
  requireTones: boolean;       // Gõ số thanh điệu (ni3hao3) hay pinyin thường (nihao)
  showHints: boolean;          // BẬT / TẮT GỢI Ý TOÀN PHẦN (Mặc định: TẮT để không tự ý hiện gợi ý)
  showTypingGuide: boolean;    // Hiện chữ cái tiếp theo cần gõ (Mặc định: TẮT)
  showHanViet: boolean;        // Hiện âm Hán-Việt (khi showHints bật)
  showMeaningHint: boolean;    // Hiện nghĩa tiếng Việt (khi showHints bật)
  enableBossFight: boolean;    // BẬT / TẮT ĐẤU BOSS (Sau mỗi 6 từ xuất hiện Trùm mang cả câu)
  repeatMissedWords: boolean;  // Tự động lặp lại từ sai
  speedMultiplier: number;
  soundEnabled: boolean;
  autoPronounce?: boolean;     // Tự động phát âm từ vựng khi xuất hiện
  ttsVolume: number;
  sfxVolume: number;
  ttsRate: number;
}

export interface GameStats {
  score: number;
  highScore: number;
  combo: number;
  maxCombo: number;
  wordsDefeated: number;
  bossesDefeated: number;
  wordsMissed: WordItem[];
  level: number;
  accuracy: number;
  totalKeystrokes: number;
  correctKeystrokes: number;
  energy?: number;             // Thanh Nộ: 0 - 100
  maxEnergy?: number;          // Mặc định 100
  wpm?: number;                // Tốc độ gõ WPM
  isFeverMode?: boolean;       // Bật Fever Mode khi combo cao
  isFrozen?: boolean;          // Trạng thái đóng băng thời gian
}
