import type { Entity } from './entity';

export interface PixelData {
  width: number;
  height: number;
  pixels: string[][];
}

export interface AnimationFrame {
  id: string;
  index: number;
  entities: Entity[];
  pixelData: PixelData;
  background: string;
  timestamp: number;
}

export interface Animation {
  id: string;
  frames: AnimationFrame[];
  fps: number;
  width: number;
  height: number;
  currentFrameIndex: number;
  isPlaying: boolean;
  selectedSprite: string | null;
}

export interface AnimationGenerateOptions {
  frameCount: number;
  fps: number;
  width: number;
  height: number;
}
