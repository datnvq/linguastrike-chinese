import type { BossEnemy } from '../types/game';

export const BOSS_PRESETS: Omit<BossEnemy, 'id' | 'x' | 'y' | 'width' | 'height' | 'vx' | 'currentSegmentIndex' | 'typedInSegment' | 'isDestroyed' | 'isRevealing' | 'revealStartTime'>[] = [
  {
    name: 'Chiến Hạm Chào Hỏi (Boss 1)',
    fullSentence: '你好吗？',
    meaning: 'Bạn có khỏe không?',
    audioText: '你好吗',
    hp: 100,
    maxHp: 100,
    segments: [
      { hanzi: '你好', pinyinSpaced: 'nǐ hǎo', latinInput: 'nihao', meaning: 'Chào bạn', hanViet: 'Nhĩ Hảo' },
      { hanzi: '吗', pinyinSpaced: 'ma', latinInput: 'ma', meaning: 'không?', hanViet: 'Ma' }
    ]
  },
  {
    name: 'Pháo Đài Giao Tiếp (Boss 2)',
    fullSentence: '很高兴认识你！',
    meaning: 'Rất vui được quen biết bạn!',
    audioText: '很高兴认识你',
    hp: 100,
    maxHp: 100,
    segments: [
      { hanzi: '很', pinyinSpaced: 'hěn', latinInput: 'hen', meaning: 'Rất', hanViet: 'Hẩn' },
      { hanzi: '高兴', pinyinSpaced: 'gāo xìng', latinInput: 'gaoxing', meaning: 'Vui vẻ', hanViet: 'Cao Hứng' },
      { hanzi: '认识', pinyinSpaced: 'rèn shi', latinInput: 'renshi', meaning: 'Quen biết', hanViet: 'Nhận Thức' },
      { hanzi: '你', pinyinSpaced: 'nǐ', latinInput: 'ni', meaning: 'Bạn', hanViet: 'Nhĩ' }
    ]
  },
  {
    name: 'Tàu Mẹ Mua Sắm (Boss 3)',
    fullSentence: '这个多少钱？',
    meaning: 'Cái này bao nhiêu tiền?',
    audioText: '这个多少钱',
    hp: 100,
    maxHp: 100,
    segments: [
      { hanzi: '这个', pinyinSpaced: 'zhè ge', latinInput: 'zhege', meaning: 'Cái này', hanViet: 'Giá Cá' },
      { hanzi: '多少', pinyinSpaced: 'duō shao', latinInput: 'duoshao', meaning: 'Bao nhiêu', hanViet: 'Đa Thiểu' },
      { hanzi: '钱', pinyinSpaced: 'qián', latinInput: 'qian', meaning: 'Tiền', hanViet: 'Tiền' }
    ]
  },
  {
    name: 'Soái Hạm Du Lịch (Boss 4)',
    fullSentence: '我想去中国旅游。',
    meaning: 'Tôi muốn đi du lịch Trung Quốc.',
    audioText: '我想去中国旅游',
    hp: 100,
    maxHp: 100,
    segments: [
      { hanzi: '我想', pinyinSpaced: 'wǒ xiǎng', latinInput: 'woxiang', meaning: 'Tôi muốn', hanViet: 'Ngã Tưởng' },
      { hanzi: '去', pinyinSpaced: 'qù', latinInput: 'qu', meaning: 'Đi đến', hanViet: 'Khứ' },
      { hanzi: '中国', pinyinSpaced: 'zhōng guó', latinInput: 'zhongguo', meaning: 'Trung Quốc', hanViet: 'Trung Quốc' },
      { hanzi: '旅游', pinyinSpaced: 'lǚ yóu', latinInput: 'lvyou', meaning: 'Du lịch', hanViet: 'Lữ Du' }
    ]
  },
  {
    name: 'Cự Hạm Tri Ân (Boss 5)',
    fullSentence: '谢谢你的帮助！',
    meaning: 'Cảm ơn sự giúp đỡ của bạn!',
    audioText: '谢谢你的帮助',
    hp: 100,
    maxHp: 100,
    segments: [
      { hanzi: '谢谢', pinyinSpaced: 'xiè xie', latinInput: 'xiexie', meaning: 'Cảm ơn', hanViet: 'Tạ Tạ' },
      { hanzi: '你的', pinyinSpaced: 'nǐ de', latinInput: 'nide', meaning: 'Của bạn', hanViet: 'Nhĩ Đích' },
      { hanzi: '帮助', pinyinSpaced: 'bāng zhù', latinInput: 'bangzhu', meaning: 'Giúp đỡ', hanViet: 'Bang Trợ' }
    ]
  }
];

export function createBossEnemy(bossIndex: number, canvasWidth: number): BossEnemy {
  const preset = BOSS_PRESETS[bossIndex % BOSS_PRESETS.length];
  const bossWidth = Math.min(canvasWidth - 60, Math.max(340, preset.segments.length * 95 + 100));
  const bossHeight = 115;

  return {
    ...preset,
    id: `boss-${Date.now()}-${bossIndex}`,
    x: (canvasWidth - bossWidth) / 2,
    y: -bossHeight - 20, // Enters from top
    width: bossWidth,
    height: bossHeight,
    vx: 0.6,
    currentSegmentIndex: 0,
    typedInSegment: 0,
    isDestroyed: false,
    isRevealing: false,
    revealStartTime: 0,
  };
}
