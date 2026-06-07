import type { DreamTheater, DreamScene, DreamEncyclopedia } from './dream';
import type { Entity } from './entity';
import type { AnimationFrame } from './animation';

export type DreamOwner = 'player1' | 'player2' | 'shared';

export type ViewMode = 'merged' | 'player1' | 'player2' | 'diff';

export type MergeStrategy = 'overlay' | 'split' | 'alternate';

export interface DualDreamer {
  id: string;
  name: string;
  dreamText: string;
  color: string;
}

export interface DualDreamScene extends DreamScene {
  owner: DreamOwner;
  player1Entities: Entity[];
  player2Entities: Entity[];
}

export interface DualDreamFrame extends AnimationFrame {
  player1Entities: Entity[];
  player2Entities: Entity[];
}

export interface DualDreamTheater extends DreamTheater {
  player1: DualDreamer;
  player2: DualDreamer;
  scenes: DualDreamScene[];
  player1Theater: DreamTheater;
  player2Theater: DreamTheater;
  currentViewMode: ViewMode;
  mergeStrategy: MergeStrategy;
  isDualDream: true;
}

export interface DualDreamMergeResult {
  mergedTheater: DualDreamTheater;
  player1Theater: DreamTheater;
  player2Theater: DreamTheater;
  elementStats: {
    player1Count: number;
    player2Count: number;
    sharedCount: number;
  };
}

export interface DualDreamDiff {
  sceneIndex: number;
  player1Only: Entity[];
  player2Only: Entity[];
  shared: Entity[];
  diffPixelData?: {
    player1: string[][];
    player2: string[][];
    merged: string[][];
    diff: string[][];
  };
}

export interface DualDreamGenerateOptions {
  sceneCount: number;
  defaultDuration: number;
  fps: number;
  mergeStrategy: MergeStrategy;
}

declare module './entity' {
  interface Entity {
    owner?: DreamOwner;
  }
}
