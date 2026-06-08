import type { DreamTheater, DreamScene, AnimationFrame } from './dream';
import type { DreamEncyclopedia } from './encyclopedia';

export interface PurificationTheme {
  id: string;
  name: string;
  description: string;
  mood: string;
  color: string;
  promptModifier: string;
}

export interface PurifiedDreamTheater {
  id: string;
  originalDream: string;
  title: string;
  originalTheater: DreamTheater;
  purifiedTheater: DreamTheater;
  selectedTheme: PurificationTheme;
  comparisonFrames: {
    original: AnimationFrame;
    purified: AnimationFrame;
  }[];
  summary: string;
  createdAt: number;
  updatedAt: number;
  isPurified: true;
}

export interface NightmarePurifierGenerateOptions {
  sceneCount: number;
  defaultDuration: number;
  fps: number;
  keyFrameCount: number;
}

export const PURIFICATION_THEMES: PurificationTheme[] = [
  {
    id: 'healing-light',
    name: '治愈之光',
    description: '温暖的光芒驱散阴霾',
    mood: '温暖、治愈、希望',
    color: '#FFD93D',
    promptModifier: '被温暖的金色光芒包围，所有恐惧都化为平和，心灵得到治愈',
  },
  {
    id: 'courage-face',
    name: '勇气直面',
    description: '鼓起勇气面对一切',
    mood: '勇敢、坚定、释然',
    color: '#6C63FF',
    promptModifier: '鼓起勇气直视恐惧，发现它并不可怕，内心变得强大而坚定',
  },
  {
    id: 'gentle-awakening',
    name: '温柔苏醒',
    description: '从噩梦中温柔醒来',
    mood: '温柔、安心、放松',
    color: '#4ECDC4',
    promptModifier: '在温柔的晨光中缓缓醒来，发现这只是一场梦，现实安全而美好',
  },
  {
    id: 'transcend-dream',
    name: '超越梦境',
    description: '在梦中获得掌控力',
    mood: '超然、掌控、自由',
    color: '#FF6B6B',
    promptModifier: '意识到这是梦境，获得清醒梦的力量，自由地创造和改变一切',
  },
];
