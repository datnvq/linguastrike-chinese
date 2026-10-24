import fs from 'node:fs';
import path from 'node:path';
import xlsx from 'xlsx';

const excelPath = path.resolve('HSK3.0_1-6_tu_vung_nghia_Viet.xlsx');
const workbook = xlsx.readFile(excelPath);

function normalizePinyin(p) {
  return p
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/ü/g, 'v')
    .replace(/[^a-z0-9]/g, '');
}

const levels = ['HSK 1', 'HSK 2', 'HSK 3', 'HSK 4', 'HSK 5', 'HSK 6'];
const allWords = [];

// Prepare CSV rows
const csvRows = [
  'STT,Hán tự,Pinyin,Từ loại,Nghĩa tiếng Việt,Nghĩa tiếng Anh,Cấp độ'
];

for (const lvl of levels) {
  const sheet = workbook.Sheets[lvl];
  const rows = xlsx.utils.sheet_to_json(sheet);
  rows.forEach((r, idx) => {
    const stt = r['STT'] || (idx + 1);
    const hanzi = (r['Hán tự'] || '').toString().trim();
    const pinyin = (r['Pinyin'] || '').toString().trim();
    const category = (r['Từ loại'] || '').toString().trim();
    const meaning = (r['Nghĩa tiếng Việt'] || '').toString().trim();
    const meaningEn = (r['Nghĩa tiếng Anh'] || '').toString().trim();
    const latin = normalizePinyin(pinyin);

    const item = {
      id: `zh-hsk${lvl.replace('HSK ', '')}-${stt}`,
      language: 'zh',
      hskLevel: lvl,
      category: category || 'Chung',
      fullWord: hanzi,
      pinyinSpaced: pinyin,
      latinInput: latin,
      meaning: meaning || hanzi,
      meaningEn: meaningEn || '',
      audioText: hanzi,
      stt: Number(stt),
    };

    allWords.push(item);

    // Escape CSV fields
    const escapeCsv = (val) => {
      const s = String(val || '');
      if (s.includes(',') || s.includes('"') || s.includes('\n')) {
        return `"${s.replace(/"/g, '""')}"`;
      }
      return s;
    };

    csvRows.push([
      escapeCsv(stt),
      escapeCsv(hanzi),
      escapeCsv(pinyin),
      escapeCsv(category),
      escapeCsv(meaning),
      escapeCsv(meaningEn),
      escapeCsv(lvl),
    ].join(','));
  });
}

// 1. Write src/data/hsk30_data.json
fs.writeFileSync(path.resolve('src/data/hsk30_data.json'), JSON.stringify(allWords), 'utf8');
console.log('✅ Wrote src/data/hsk30_data.json (', (fs.statSync('src/data/hsk30_data.json').size / 1024).toFixed(1), 'KB )');

// 2. Write src/data/hsk30Data.ts
const tsContent = `import type { WordItem } from '../types/game';
import rawData from './hsk30_data.json';

export const HSK30_OFFICIAL_DATA: WordItem[] = rawData as unknown as WordItem[];
`;
fs.writeFileSync(path.resolve('src/data/hsk30Data.ts'), tsContent, 'utf8');
console.log('✅ Wrote src/data/hsk30Data.ts');

// 3. Ensure public/data directory exists
const publicDataDir = path.resolve('public/data');
if (!fs.existsSync(publicDataDir)) {
  fs.mkdirSync(publicDataDir, { recursive: true });
}

// 4. Copy original Excel file to public/data/HSK3.0_1-6_tu_vung_nghia_Viet.xlsx
fs.copyFileSync(excelPath, path.join(publicDataDir, 'HSK3.0_1-6_tu_vung_nghia_Viet.xlsx'));
console.log('✅ Copied original Excel to public/data/HSK3.0_1-6_tu_vung_nghia_Viet.xlsx');

// 5. Write public/data/hsk_30_vocabulary_official.csv (with UTF-8 BOM)
const bom = '\uFEFF';
fs.writeFileSync(path.join(publicDataDir, 'hsk_30_vocabulary_official.csv'), bom + csvRows.join('\r\n'), 'utf8');
console.log('✅ Wrote public/data/hsk_30_vocabulary_official.csv');

// 6. Write public/data/mau_nhap_tu_vung_hsk.csv (Clean template file for user)
const templateCsvContent = bom + [
  'STT,Hán tự,Pinyin,Từ loại,Nghĩa tiếng Việt,Nghĩa tiếng Anh,Đã thuộc',
  '1,你好,nǐ hǎo,thán từ,xin chào,hello,0',
  '2,谢谢,xiè xie,động từ,cảm ơn,thank you,0',
  '3,再见,zài jiàn,động từ,tạm biệt,goodbye,0',
  '4,苹果,píng guǒ,danh từ,quả táo,apple,0',
  '5,喝水,hē shuǐ,động từ,uống nước,drink water,0',
].join('\r\n');

fs.writeFileSync(path.join(publicDataDir, 'mau_nhap_tu_vung_hsk.csv'), templateCsvContent, 'utf8');
console.log('✅ Wrote template public/data/mau_nhap_tu_vung_hsk.csv');

// 7. Generate template Excel file: public/data/mau_nhap_tu_vung_hsk.xlsx
const templateWb = xlsx.utils.book_new();
const sampleData = [
  ['STT', 'Hán tự', 'Pinyin', 'Từ loại', 'Nghĩa tiếng Việt', 'Nghĩa tiếng Anh', 'Đã thuộc'],
  [1, '你好', 'nǐ hǎo', 'thán từ', 'xin chào', 'hello', 0],
  [2, '谢谢', 'xiè xie', 'động từ', 'cảm ơn', 'thank you', 0],
  [3, '再见', 'zài jiàn', 'động từ', 'tạm biệt', 'goodbye', 0],
  [4, '苹果', 'píng guǒ', 'danh từ', 'quả táo', 'apple', 0],
  [5, '喝水', 'hē shuǐ', 'động từ', 'uống nước', 'drink water', 0],
];
const templateWs = xlsx.utils.aoa_to_sheet(sampleData);
xlsx.utils.book_append_sheet(templateWb, templateWs, 'Từ mới nhập');
xlsx.writeFile(templateWb, path.join(publicDataDir, 'mau_nhap_tu_vung_hsk.xlsx'));
console.log('✅ Wrote template Excel public/data/mau_nhap_tu_vung_hsk.xlsx');

console.log('🎉 Done! 5,181 official HSK 3.0 words ready.');
