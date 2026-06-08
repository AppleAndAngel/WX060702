import type { DreamTheater, DreamScene, AnimationFrame } from './dream';
import type { DreamEncyclopedia } from './encyclopedia';

export interface RewriteBranch {
  id: string;
  name: string;
  branchPointSceneIndex: number;
  newAction: string;
  newOutcome: string;
  rewrittenScenes: DreamScene[];
  fullTheater: DreamTheater;
  keyFrames: AnimationFrame[];
  summary: string;
  isSelected: boolean;
  isGenerating: boolean;
  generationProgress: number;
  error?: string;
  createdAt: number;
}

export interface LucidDreamRewriteTheater {
  id: string;
  originalDream: string;
  title: string;
  originalTheater: DreamTheater;
  branches: RewriteBranch[];
  selectedBranchId: string | null;
  previewMode: 'original' | 'rewritten';
  createdAt: number;
  updatedAt: number;
  isLucidDreamRewrite: true;
}

export interface LucidDreamRewriteGenerateOptions {
  rewriteSceneCount: number;
  defaultDuration: number;
  fps: number;
  keyFrameCount: number;
}

export const REWRITE_PROMPT_TEMPLATES = [
  {
    id: 'change-action',
    name: '改变行动',
    description: '重新选择在这一幕中的行动',
    prompt: '我决定{action}，结果{outcome}，故事因此改变。',
  },
  {
    id: 'avoid-disaster',
    name: '规避灾祸',
    description: '让事情向更好的方向发展',
    prompt: '我及时意识到危险，选择{action}，成功{outcome}，避免了悲剧。',
  },
  {
    id: 'seize-opportunity',
    name: '抓住机遇',
    description: '不错过任何机会',
    prompt: '我鼓起勇气{action}，幸运地{outcome}，命运从此不同。',
  },
  {
    id: 'reveal-truth',
    name: '揭示真相',
    description: '发现隐藏的秘密',
    prompt: '我决定{action}，意外发现{outcome}，真相终于浮出水面。',
  },
];
