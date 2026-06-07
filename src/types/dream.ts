import type { Entity } from './entity';
import type { AnimationFrame } from './animation';
import type { DreamEncyclopedia } from './encyclopedia';

export interface DreamScene {
  id: string;
  actNumber: number;
  title: string;
  description: string;
  prompt: string;
  entities: Entity[];
  frame: AnimationFrame;
  duration: number;
  isGenerating: boolean;
  error?: string;
}

export interface DreamTheater {
  id: string;
  originalDream: string;
  title: string;
  scenes: DreamScene[];
  createdAt: number;
  updatedAt: number;
  totalDuration: number;
  currentSceneIndex: number;
  isPlaying: boolean;
  fps: number;
  ruleSetId: string;
  encyclopedia?: DreamEncyclopedia;
}

export interface SceneSplitResult {
  actNumber: number;
  title: string;
  description: string;
  prompt: string;
}

export interface DreamGenerateOptions {
  minActs: number;
  maxActs: number;
  defaultActs: number;
  defaultDuration: number;
  fps: number;
}
