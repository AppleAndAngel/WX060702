import type { DreamTheater, DreamScene, DreamEncyclopedia } from './dream';
import type { Entity } from './entity';

export type PurifyViewMode = 'original' | 'purified' | 'compare';

export type PurifyIntensity = 'mild' | 'moderate' | 'strong';

export interface PurifiedScene extends DreamScene {
  originalScene: DreamScene;
  purificationNotes: string;
  colorTransform: {
    original: string;
    purified: string;
  }[];
}

export interface PurifiedDreamTheater extends DreamTheater {
  isPurified: true;
  originalTheater: DreamTheater;
  scenes: PurifiedScene[];
  purificationIntensity: PurifyIntensity;
  currentViewMode: PurifyViewMode;
  transformationStats: {
    colorsTransformed: number;
    entitiesSoftened: number;
    descriptionsRewritten: number;
    durationAdjusted: number;
  };
}

export interface PurificationOptions {
  intensity: PurifyIntensity;
  keepEntityStructure: boolean;
  adjustDuration: boolean;
  rewriteDescriptions: boolean;
  transformColors: boolean;
}

export interface ScenePurificationResult {
  originalScene: DreamScene;
  purifiedScene: PurifiedScene;
  notes: string;
}

export interface DreamPurificationResult {
  originalTheater: DreamTheater;
  purifiedTheater: PurifiedDreamTheater;
  totalDuration: number;
  transformationStats: {
    colorsTransformed: number;
    entitiesSoftened: number;
    descriptionsRewritten: number;
    durationAdjusted: number;
  };
}

export interface ColorMapping {
  from: string;
  to: string;
  reason: string;
}

export interface EntitySofteningRule {
  originalType: string;
  softeningType: string;
  softeningName: string;
  keywords: string[];
}
