import type { WordItem, LessonItem, TopicItem } from '../types/game';
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
