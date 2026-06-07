import type { Entity } from './entity';

export type ElementCategory = 'character' | 'item' | 'scene' | 'emotion';

export interface EncyclopediaElement {
  id: string;
  category: ElementCategory;
  name: string;
  type: string;
  description: string;
  color: string;
  appearances: EncyclopediaAppearance[];
  tags: string[];
}

export interface EncyclopediaAppearance {
  sceneId: string;
  actNumber: number;
  sceneTitle: string;
  entities: Entity[];
  frameIndex: number;
}

export interface EncyclopediaTag {
  id: string;
  name: string;
  category: ElementCategory;
  count: number;
}

export interface DreamEncyclopedia {
  id: string;
  theaterId: string;
  title: string;
  elements: EncyclopediaElement[];
  tags: EncyclopediaTag[];
  emotionAnalysis: EmotionAnalysis;
  generatedAt: number;
}

export interface EmotionAnalysis {
  primaryEmotion: string;
  secondaryEmotions: string[];
  intensity: number;
  keywords: string[];
  description: string;
}

export interface EncyclopediaFilter {
  categories: ElementCategory[];
  tags: string[];
  searchQuery: string;
}
