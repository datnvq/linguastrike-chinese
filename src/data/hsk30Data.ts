import type { WordItem } from '../types/game';
import rawData from './hsk30_data.json';

export const HSK30_OFFICIAL_DATA: WordItem[] = rawData as unknown as WordItem[];
