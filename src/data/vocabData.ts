import type { WordItem, Language } from '../types/game';
import { HSK30_OFFICIAL_DATA } from './hsk30Data';
import { XIEHANZI_WORDS, XIEHANZI_LESSONS, XIEHANZI_TOPICS, getLessonsByLevel, getTopicsByLevel, filterXiehanziWords } from './xiehanziData';

export { XIEHANZI_WORDS, XIEHANZI_LESSONS, XIEHANZI_TOPICS, getLessonsByLevel, getTopicsByLevel, filterXiehanziWords };

export const CHINESE_LIFE_DATA: WordItem[] = [
  {
    id: 'zh-life-1', language: 'zh', hskLevel: 'Đời sống', category: 'Ẩm thực',
    fullWord: '火锅', pinyinSpaced: 'huǒ guō', latinInput: 'huoguo', toneInput: 'huo3guo1',
    hanViet: 'Hỏa Oa', meaning: 'Lẩu', audioText: '火锅'
  },
  {
    id: 'zh-life-2', language: 'zh', hskLevel: 'Đời sống', category: 'Đồ uống',
    fullWord: '珍珠奶茶', pinyinSpaced: 'zhēn zhū nǎi chá', latinInput: 'zhenzhunaicha', toneInput: 'zhen1zhu1nai3cha2',
    hanViet: 'Trân Châu Nãi Trà', meaning: 'Trà sữa trân châu', audioText: '珍珠奶茶'
  },
  {
    id: 'zh-life-3', language: 'zh', hskLevel: 'Đời sống', category: 'Công nghệ',
    fullWord: '微信', pinyinSpaced: 'wēi xìn', latinInput: 'weixin', toneInput: 'wei1xin4',
    hanViet: 'Vi Tín', meaning: 'WeChat', audioText: '微信'
  },
  {
    id: 'zh-life-4', language: 'zh', hskLevel: 'Đời sống', category: 'Công nghệ',
    fullWord: '支付宝', pinyinSpaced: 'zhī fù bǎo', latinInput: 'zhifubao', toneInput: 'zhi1fu4bao3',
    hanViet: 'Chi Phó Bảo', meaning: 'Alipay', audioText: '支付宝'
  },
  {
    id: 'zh-life-5', language: 'zh', hskLevel: 'Đời sống', category: 'Mua sắm Taobao',
    fullWord: '淘宝', pinyinSpaced: 'táo bǎo', latinInput: 'taobao', toneInput: 'tao2bao3',
    hanViet: 'Đào Bảo', meaning: 'Taobao (sàn thương mại)', audioText: '淘宝'
  },
  {
    id: 'zh-life-6', language: 'zh', hskLevel: 'Đời sống', category: 'Mua sắm Taobao',
    fullWord: '包邮', pinyinSpaced: 'bāo yóu', latinInput: 'baoyou', toneInput: 'bao1you2',
    hanViet: 'Bao Bưu', meaning: 'Miễn phí vận chuyển (Freeship)', audioText: '包邮'
  },
  {
    id: 'zh-life-7', language: 'zh', hskLevel: 'Đời sống', category: 'Mua sắm Taobao',
    fullWord: '优惠券', pinyinSpaced: 'yōu huì quàn', latinInput: 'youhuiquan', toneInput: 'you1hui4quan4',
    hanViet: 'Ưu Huệ Khoán', meaning: 'Phiếu giảm giá (Voucher)', audioText: '优惠券'
  },
  {
    id: 'zh-life-8', language: 'zh', hskLevel: 'Đời sống', category: 'Du lịch Khách sạn',
    fullWord: '预订房间', pinyinSpaced: 'yù dìng fáng jiān', latinInput: 'yudingfangjian', toneInput: 'yu4ding4fang2jian1',
    hanViet: 'Dự Đính Phòng Gian', meaning: 'Đặt phòng khách sạn', audioText: '预订房间'
  },
  {
    id: 'zh-life-9', language: 'zh', hskLevel: 'Đời sống', category: 'Giao thông',
    fullWord: '地铁站', pinyinSpaced: 'dì tiě zhàn', latinInput: 'ditiezhan', toneInput: 'di4tie3zhan4',
    hanViet: 'Địa Thiết Trạm', meaning: 'Ga tàu điện ngầm', audioText: '地铁站'
  },
  {
    id: 'zh-life-10', language: 'zh', hskLevel: 'Đời sống', category: 'Đời sống',
    fullWord: '扫码支付', pinyinSpaced: 'sǎo mǎ zhī fù', latinInput: 'saomazhifu', toneInput: 'sao3ma3zhi1fu4',
    hanViet: 'Tảo Mã Chi Phó', meaning: 'Quét mã QR thanh toán', audioText: '扫码支付'
  }
];

// Dữ liệu HSK 3.0 (5,181 từ)
export const CHINESE_HSK30_DATA: WordItem[] = [
  ...HSK30_OFFICIAL_DATA,
  ...CHINESE_LIFE_DATA
];

// Dữ liệu Giáo trình Chuẩn XieHanzi 146 bài (4,093 từ) kèm từ Đời sống
export const CHINESE_XIEHANZI_DATA: WordItem[] = [
  ...XIEHANZI_WORDS,
  ...CHINESE_LIFE_DATA
];

// Mặc định sử dụng Giáo trình Chuẩn XieHanzi (hỗ trợ phân bài học 146 bài)
export const CHINESE_HSK_DATA: WordItem[] = CHINESE_XIEHANZI_DATA;

export function getChineseVocabByCurriculum(curriculum: 'xiehanzi' | 'hsk30' = 'xiehanzi'): WordItem[] {
  return curriculum === 'hsk30' ? CHINESE_HSK30_DATA : CHINESE_XIEHANZI_DATA;
}

export const VOCABULARY_DATA: Record<Language, WordItem[]> = {
  zh: CHINESE_HSK_DATA,
  en: [
    { id: 'en-1', language: 'en', fullWord: 'apple', latinInput: 'apple', pinyinSpaced: 'apple', phonetic: '/ˈæp.əl/', meaning: 'Quả táo', audioText: 'apple', category: 'Trái cây' },
    { id: 'en-2', language: 'en', fullWord: 'banana', latinInput: 'banana', pinyinSpaced: 'banana', phonetic: '/bəˈnæn.ə/', meaning: 'Quả chuối', audioText: 'banana', category: 'Trái cây' },
    { id: 'en-3', language: 'en', fullWord: 'orange', latinInput: 'orange', pinyinSpaced: 'orange', phonetic: '/ˈɔːr.ɪndʒ/', meaning: 'Quả cam', audioText: 'orange', category: 'Trái cây' },
    { id: 'en-4', language: 'en', fullWord: 'dragon', latinInput: 'dragon', pinyinSpaced: 'dragon', phonetic: '/ˈdræɡ.ən/', meaning: 'Con rồng', audioText: 'dragon', category: 'Sinh vật' },
    { id: 'en-5', language: 'en', fullWord: 'planet', latinInput: 'planet', pinyinSpaced: 'planet', phonetic: '/ˈplæn.ɪt/', meaning: 'Hành tinh', audioText: 'planet', category: 'Vũ trụ' },
    { id: 'en-6', language: 'en', fullWord: 'rocket', latinInput: 'rocket', pinyinSpaced: 'rocket', phonetic: '/ˈrɑː.kɪt/', meaning: 'Tên lửa', audioText: 'rocket', category: 'Vũ trụ' },
    { id: 'en-7', language: 'en', fullWord: 'shield', latinInput: 'shield', pinyinSpaced: 'shield', phonetic: '/ʃiːld/', meaning: 'Khiên bảo vệ', audioText: 'shield', category: 'Chiến đấu' }
  ],
  ja: [
    { id: 'ja-1', language: 'ja', fullWord: 'ねこ', latinInput: 'neko', pinyinSpaced: 'neko', phonetic: 'neko (猫)', meaning: 'Con mèo', audioText: 'ねこ', category: 'Động vật' },
    { id: 'ja-2', language: 'ja', fullWord: 'いぬ', latinInput: 'inu', pinyinSpaced: 'inu', phonetic: 'inu (犬)', meaning: 'Con chó', audioText: '犬', category: 'Động vật' },
    { id: 'ja-3', language: 'ja', fullWord: 'さくら', latinInput: 'sakura', pinyinSpaced: 'sakura', phonetic: 'sakura (桜)', meaning: 'Hoa anh đào', audioText: 'さくら', category: 'Thiên nhiên' },
    { id: 'ja-4', language: 'ja', fullWord: 'みず', latinInput: 'mizu', pinyinSpaced: 'mizu', phonetic: 'mizu (水)', meaning: 'Nước', audioText: '水', category: 'Đồ uống' },
    { id: 'ja-5', language: 'ja', fullWord: 'ひかり', latinInput: 'hikari', pinyinSpaced: 'hikari', phonetic: 'hikari (光)', meaning: 'Ánh sáng', audioText: '光', category: 'Vũ trụ' }
  ]
};
