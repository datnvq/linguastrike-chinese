import type { ClozeStyle, WordItem, ActiveWord, SpawnMode, GamePlayMode, WordSyllable } from '../types/game';

export function buildWordSyllables(
  wordItem: WordItem,
  targetInputStr: string,
  requireTones: boolean
): WordSyllable[] {
  const hanziChars = Array.from(wordItem.fullWord);
  const pinyinSyllables = wordItem.pinyinSpaced.trim().split(/\s+/);
  const hanVietWords = wordItem.hanViet ? wordItem.hanViet.trim().split(/\s+/) : [];

  if (pinyinSyllables.length === 0 || hanziChars.length === 0) {
    return [{
      hanzi: wordItem.fullWord,
      pinyin: wordItem.pinyinSpaced,
      latinInput: targetInputStr,
      hanViet: wordItem.hanViet,
      startIndex: 0,
      endIndex: targetInputStr.length,
      isRevealed: false
    }];
  }

  let toneSyllables: string[] = [];
  if (requireTones && wordItem.toneInput) {
    const matches = wordItem.toneInput.match(/[a-z]+[1-5]?/gi);
    if (matches && matches.length === pinyinSyllables.length) {
      toneSyllables = matches;
    }
  }

  const syllables: WordSyllable[] = [];
  let currentIndex = 0;

  for (let i = 0; i < pinyinSyllables.length; i++) {
    const pinyin = pinyinSyllables[i];
    const hanzi = hanziChars[i] || (i === pinyinSyllables.length - 1 ? hanziChars.slice(i).join('') : '');
    const hanViet = hanVietWords[i];

    let sylInput = '';
    if (requireTones && toneSyllables[i]) {
      sylInput = toneSyllables[i].toLowerCase();
    } else {
      sylInput = pinyin
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/ü/gi, 'v')
        .replace(/[^a-z0-9]/gi, '')
        .toLowerCase();
    }

    const start = currentIndex;
    let end = start + sylInput.length;
    if (i === pinyinSyllables.length - 1) {
      end = Math.max(end, targetInputStr.length);
    } else {
      end = Math.min(end, targetInputStr.length);
    }
    currentIndex = end;

    syllables.push({
      hanzi: hanzi || '?',
      pinyin,
      latinInput: sylInput,
      hanViet,
      startIndex: start,
      endIndex: end,
      isRevealed: false
    });
  }

  return syllables;
}

export function createActiveWord(
  wordItem: WordItem,
  clozeStyle: ClozeStyle,
  canvasWidth: number,
  speedMultiplier: number,
  _spawnMode: SpawnMode = 'single',
  requireTones: boolean = false,
  playMode: GamePlayMode = 'hanzi_to_pinyin'
): ActiveWord {
  // Use spaced pinyin (e.g. "nǐ hǎo") for visual rendering
  const spacedStr = wordItem.pinyinSpaced;
  const chars = spacedStr.split('');

  // Target input string that player must type (without space)
  const targetInputStr = requireTones && wordItem.toneInput
    ? wordItem.toneInput.toLowerCase()
    : wordItem.latinInput.toLowerCase();

  const targetLetters = targetInputStr.split('');

  // Determine hidden indices in display pinyin
  const hiddenIndices: number[] = [];
  const vowelRegex = /[aeiouüāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/i;

  if (playMode === 'hanzi_to_pinyin' || playMode === 'meaning_to_pinyin' || playMode === 'listening_to_pinyin') {
    // 3 chế độ chuyên sâu: ban đầu ẩn toàn bộ pinyin slot (_ _   _ _ _), gõ đến đâu bung sáng chữ đó!
    chars.forEach((c, i) => {
      if (c !== ' ') hiddenIndices.push(i);
    });
  } else {
    // Chế độ 4: cloze_practice (dựa theo clozeStyle)
    if (clozeStyle === 'reveal_on_type') {
      chars.forEach((c, i) => {
        if (c !== ' ') hiddenIndices.push(i);
      });
    } else if (clozeStyle === 'none') {
      // Hiện sẵn toàn bộ
    } else if (clozeStyle === 'vowels') {
      chars.forEach((c, i) => {
        if (vowelRegex.test(c)) hiddenIndices.push(i);
      });
      if (hiddenIndices.length === 0) hiddenIndices.push(chars.length - 1);
    } else if (clozeStyle === 'initials') {
      let isStartOfSyllable = true;
      chars.forEach((c, i) => {
        if (c === ' ') {
          isStartOfSyllable = true;
        } else if (isStartOfSyllable && !vowelRegex.test(c)) {
          hiddenIndices.push(i);
          isStartOfSyllable = false;
        } else {
          isStartOfSyllable = false;
        }
      });
      if (hiddenIndices.length === 0) hiddenIndices.push(0);
    } else if (clozeStyle === 'second_syllable') {
      const spaceIdx = chars.indexOf(' ');
      if (spaceIdx !== -1) {
        for (let i = spaceIdx + 1; i < chars.length; i++) {
          if (chars[i] !== ' ') hiddenIndices.push(i);
        }
      } else {
        hiddenIndices.push(chars.length - 1);
      }
    } else if (clozeStyle === 'end_letter') {
      for (let i = chars.length - 1; i >= 0; i--) {
        if (chars[i] !== ' ') {
          hiddenIndices.push(i);
          break;
        }
      }
    }
  }

  // Create masked display array
  const displayPinyinChars = chars.map((char, idx) => {
    if (char === ' ') return '  ';
    return hiddenIndices.includes(idx) ? '_' : char;
  });

  const syllables = buildWordSyllables(wordItem, targetInputStr, requireTones);

  // Calculate block dimensions tailored to playMode
  let blockWidth = Math.max(200, chars.length * 20 + 80);
  let blockHeight = 82;

  if (playMode === 'meaning_to_pinyin') {
    blockWidth = Math.max(blockWidth, wordItem.meaning.length * 10 + 70, syllables.length * 58 + 60);
    blockHeight = 98; // Spacious height for Meaning + Hanzi [ ? ] row + Pinyin slots
  } else if (playMode === 'listening_to_pinyin') {
    blockWidth = Math.max(blockWidth, syllables.length * 58 + 70);
    blockHeight = 94;
  } else if (playMode === 'hanzi_to_pinyin') {
    blockWidth = Math.max(blockWidth, wordItem.fullWord.length * 36 + 60);
  } else if (playMode === 'cloze_practice') {
    blockHeight = 88;
  }

  // Spawn randomly across screen width (both single and multi modes)
  const margin = 28;
  const maxX = Math.max(margin, canvasWidth - blockWidth - margin);
  const x = margin + Math.random() * (maxX - margin);

  const y = -blockHeight - 10;

  // Snappy falling speed (slightly more relaxed in meaning_to_pinyin so brain has recall time)
  const speedAdjust = playMode === 'meaning_to_pinyin' ? 0.88 : 1.0;
  const baseSpeed = (0.75 + Math.random() * 0.25) * speedMultiplier * speedAdjust;

  return {
    id: `active-${wordItem.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    wordItem,
    x,
    y,
    targetY: y,
    speed: baseSpeed,
    width: blockWidth,
    height: blockHeight,
    fullPinyinChars: chars,
    displayPinyinChars,
    hiddenPinyinIndices: hiddenIndices,
    targetLetters,
    typedCount: 0,
    syllables,
    isRevealingHanzi: false,
    revealStartTime: 0,
    isTargeted: false,
    isDestroyed: false,
    spawnTime: Date.now(),
    hasPlayedAudio: false,
  };
}
