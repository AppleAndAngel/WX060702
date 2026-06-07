import type { DreamTheater, DreamScene, AnimationFrame } from './dream';
import type { DreamEncyclopedia } from './encyclopedia';

export type EndingVariant = 'ending-a' | 'ending-b' | 'ending-c';

export interface EndingTheme {
  id: EndingVariant;
  name: string;
  description: string;
  mood: string;
  color: string;
  promptModifier: string;
}

export interface EndingBranch {
  id: string;
  variant: EndingVariant;
  theme: EndingTheme;
  theater: DreamTheater;
  keyFrames: AnimationFrame[];
  summary: string;
  isSelected: boolean;
  isGenerating: boolean;
  generationProgress: number;
  error?: string;
}

export interface BranchingEndingsTheater {
  id: string;
  originalDream: string;
  title: string;
  baseTheater: DreamTheater;
  endings: EndingBranch[];
  selectedEndingId: string | null;
  createdAt: number;
  updatedAt: number;
  isBranchingEndings: true;
}

export interface BranchingEndingsGenerateOptions {
  endingCount: number;
  baseSceneCount: number;
  endingSceneCount: number;
  defaultDuration: number;
  fps: number;
  keyFrameCount: number;
}

export const ENDING_THEMES: EndingTheme[] = [
  {
    id: 'ending-a',
    name: '温暖治愈',
    description: '一切都会好起来的',
    mood: '温馨、感动、希望',
    color: '#FFD93D',
    promptModifier: '温暖治愈的结局，充满希望与感动，阳光洒下，一切归于美好',
  },
  {
    id: 'ending-b',
    name: '神秘悬疑',
    description: '真相隐藏在迷雾之中',
    mood: '神秘、悬疑、反转',
    color: '#6C63FF',
    promptModifier: '神秘悬疑的结局，出人意料的反转，迷雾重重，真相浮出水面',
  },
  {
    id: 'ending-c',
    name: '壮烈史诗',
    description: '英雄的传说将永远流传',
    mood: '壮烈、史诗、永恒',
    color: '#FF6B6B',
    promptModifier: '壮烈史诗的结局，宏大的场面，命运的抉择，传说就此诞生',
  },
];
