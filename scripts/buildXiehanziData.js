import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx';

const excelPath = path.resolve('thu_vien_hsk_2_0_xiehanzi.xlsx');
if (!fs.existsSync(excelPath)) {
  console.error('❌ File not found:', excelPath);
  process.exit(1);
}

const workbook = xlsx.readFile(excelPath);

function normalizePinyin(p) {
  if (!p) return '';
  return p
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[üǖǘǚǜ]/g, 'v')
    .replace(/[^a-z0-9]/g, '');
}

function pinyinToToneNumber(pinyinSpaced) {
  if (!pinyinSpaced) return '';
  const toneMap = {
    'ā': ['a', '1'], 'á': ['a', '2'], 'ǎ': ['a', '3'], 'à': ['a', '4'],
    'ē': ['e', '1'], 'é': ['e', '2'], 'ě': ['e', '3'], 'è': ['e', '4'],
    'ī': ['i', '1'], 'í': ['i', '2'], 'ǐ': ['i', '3'], 'ì': ['i', '4'],
    'ō': ['o', '1'], 'ó': ['o', '2'], 'ǒ': ['o', '3'], 'ò': ['o', '4'],
    'ū': ['u', '1'], 'ú': ['u', '2'], 'ǔ': ['u', '3'], 'ù': ['u', '4'],
    'ǖ': ['v', '1'], 'ǘ': ['v', '2'], 'ǚ': ['v', '3'], 'ǜ': ['v', '4'],
    'ü': ['v', '5']
  };
  const syllables = pinyinSpaced.trim().split(/\s+/);
  return syllables.map(syl => {
    let tone = '5';
    let base = '';
    for (const char of syl) {
      if (toneMap[char]) {
        base += toneMap[char][0];
        tone = toneMap[char][1];
      } else if (/[a-zA-Z]/.test(char)) {
        base += char.toLowerCase();
      }
    }
    return base ? base + (tone !== '5' ? tone : '') : '';
  }).join('');
}

// 1. Parse Mục lục 146 Bài học
const lessonsSheet = workbook.Sheets['Mục lục 146 Bài học'];
const rawLessons = xlsx.utils.sheet_to_json(lessonsSheet, { header: 1 });
const lessons = [];

for (let i = 4; i < rawLessons.length; i++) {
  const r = rawLessons[i];
  if (!r || typeof r[0] !== 'number') continue;

  const stt = Number(r[0]);
  const hskLevel = String(r[1] || '').trim();
  const lessonNumber = String(r[2] || '').trim();
  const titleVi = String(r[3] || '').trim();
  const titleZh = String(r[4] || '').trim();
  const pinyin = String(r[5] || '').trim();
  const topic = String(r[6] || '').trim();
  const wordCount = Number(r[7] || 0);
  const url = String(r[9] || '').trim();

  const lvlNum = hskLevel.replace('HSK ', '').trim();
  const lessonId = `hsk${lvlNum}-b${lessonNumber.replace(/[^0-9]/g, '').padStart(2, '0')}`;

  lessons.push({
    id: lessonId,
    stt,
    hskLevel,
    lessonNumber,
    titleVi,
    titleZh,
    pinyin,
    topic,
    wordCount,
    url,
  });
}

console.log(`✅ Extracted ${lessons.length} lessons from Mục lục.`);

// 2. Parse Từ vựng theo Chủ đề
const topicsSheet = workbook.Sheets['Từ vựng theo Chủ đề'];
const rawTopics = xlsx.utils.sheet_to_json(topicsSheet, { header: 1 });
const topics = [];

for (let i = 4; i < rawTopics.length; i++) {
  const r = rawTopics[i];
  if (!r || typeof r[0] !== 'number') continue;

  const stt = Number(r[0]);
  const hskLevel = String(r[1] || '').trim();
  const topicName = String(r[2] || '').trim();
  const lessonsText = String(r[3] || '').trim();
  const lessonCount = Number(r[4] || 1);
  const wordCount = Number(r[5] || 0);
  const url = String(r[8] || '').trim();

  topics.push({
    id: `topic-${stt}`,
    stt,
    hskLevel,
    topicName,
    lessonsText,
    lessonCount,
    wordCount,
    url,
  });
}

console.log(`✅ Extracted ${topics.length} topics from Từ vựng theo Chủ đề.`);

// 3. Parse 6 Cấp độ HSK 1 - HSK 6
const hskSheets = ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6'];
const allWords = [];

hskSheets.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.warn(`⚠️ Sheet ${sheetName} not found!`);
    return;
  }
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  let sheetWordCount = 0;

  for (let i = 4; i < rawRows.length; i++) {
    const r = rawRows[i];
    if (!r || typeof r[0] !== 'number' || !r[7]) continue;

    const stt = Number(r[0]);
    const hskLevel = String(r[1] || sheetName).trim();
    const lessonNumber = String(r[2] || '').trim();
    const lessonTitleVi = String(r[3] || '').trim();
    const lessonTitleZh = String(r[4] || '').trim();
    const topic = String(r[5] || '').trim();
    const sttInLesson = Number(r[6] || 1);
    const hanziRaw = String(r[7] || '').trim();
    const pinyinRaw = String(r[8] || '').trim();
    const category = String(r[9] || 'Chung').trim();
    const meaning = String(r[10] || '').trim();
    const url = String(r[11] || '').trim();

    // Clean hanzi for audio TTS (remove parentheses)
    const audioText = hanziRaw.replace(/[()（）]/g, '').trim();

    // Primary pinyin if there's a slash like 'shéi / shuí'
    const primaryPinyin = pinyinRaw.split('/')[0].trim();
    const latin = normalizePinyin(primaryPinyin);
    const tone = pinyinToToneNumber(primaryPinyin);

    const lvlNum = hskLevel.replace('HSK ', '').trim();
    const bNum = lessonNumber.replace(/[^0-9]/g, '').padStart(2, '0');
    const wordId = `zh-xhz-h${lvlNum}-b${bNum}-${sttInLesson}`;

    const item = {
      id: wordId,
      language: 'zh',
      hskLevel,
      lessonNumber,
      lessonTitleVi,
      lessonTitleZh,
      topic,
      sttInLesson,
      category,
      fullWord: hanziRaw,
      pinyinSpaced: pinyinRaw,
      latinInput: latin,
      toneInput: tone,
      meaning: meaning || hanziRaw,
      audioText: audioText || hanziRaw,
      lessonUrl: url,
      stt,
    };

    allWords.push(item);
    sheetWordCount++;
  }

  console.log(`✅ Extracted ${sheetWordCount} words from sheet ${sheetName}`);
});

console.log(`🎉 Total extracted XieHanzi words: ${allWords.length}`);

// 4. Save JSON data files
const dataDir = path.resolve('src/data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(path.join(dataDir, 'xiehanzi_lessons.json'), JSON.stringify(lessons, null, 2), 'utf8');
console.log('✅ Wrote src/data/xiehanzi_lessons.json');

fs.writeFileSync(path.join(dataDir, 'xiehanzi_topics.json'), JSON.stringify(topics, null, 2), 'utf8');
console.log('✅ Wrote src/data/xiehanzi_topics.json');

fs.writeFileSync(path.join(dataDir, 'xiehanzi_words.json'), JSON.stringify(allWords), 'utf8');
console.log('✅ Wrote src/data/xiehanzi_words.json (', (fs.statSync(path.join(dataDir, 'xiehanzi_words.json')).size / 1024).toFixed(1), 'KB )');

// 5. Generate TypeScript file
const tsCode = `import type { WordItem, LessonItem, TopicItem } from '../types/game';
import rawWords from './xiehanzi_words.json';
import rawLessons from './xiehanzi_lessons.json';
import rawTopics from './xiehanzi_topics.json';

export const XIEHANZI_WORDS: WordItem[] = rawWords as unknown as WordItem[];
export const XIEHANZI_LESSONS: LessonItem[] = rawLessons as unknown as LessonItem[];
export const XIEHANZI_TOPICS: TopicItem[] = rawTopics as unknown as TopicItem[];

/**
 * Lấy danh sách bài học thuộc một cấp độ HSK
 */
export function getLessonsByLevel(level: string): LessonItem[] {
  if (level === 'Tất cả') return XIEHANZI_LESSONS;
  return XIEHANZI_LESSONS.filter(l => l.hskLevel === level);
}

/**
 * Lấy danh sách chủ đề thuộc một cấp độ HSK
 */
export function getTopicsByLevel(level: string): TopicItem[] {
  if (level === 'Tất cả') return XIEHANZI_TOPICS;
  return XIEHANZI_TOPICS.filter(t => t.hskLevel === level);
}

/**
 * Lọc từ vựng linh hoạt theo Cấp độ, Bài học, hoặc Chủ đề
 */
export function filterXiehanziWords(params: {
  hskLevel?: string;
  lessonNumber?: string;
  topic?: string;
}): WordItem[] {
  return XIEHANZI_WORDS.filter(w => {
    if (params.hskLevel && params.hskLevel !== 'Tất cả' && w.hskLevel !== params.hskLevel) {
      return false;
    }
    if (params.lessonNumber && params.lessonNumber !== 'all' && w.lessonNumber !== params.lessonNumber) {
      return false;
    }
    if (params.topic && params.topic !== 'all' && w.topic !== params.topic) {
      return false;
    }
    return true;
  });
}
`;

fs.writeFileSync(path.join(dataDir, 'xiehanziData.ts'), tsCode, 'utf8');
console.log('✅ Wrote src/data/xiehanziData.ts');

// 6. Ensure public/data directory exists & copy excel
const publicDataDir = path.resolve('public/data');
if (!fs.existsSync(publicDataDir)) {
  fs.mkdirSync(publicDataDir, { recursive: true });
}
fs.copyFileSync(excelPath, path.join(publicDataDir, 'thu_vien_hsk_2_0_xiehanzi.xlsx'));
console.log('✅ Copied Excel to public/data/thu_vien_hsk_2_0_xiehanzi.xlsx');
