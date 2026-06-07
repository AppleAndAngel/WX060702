import type { DreamScene } from './dream';
import type { Entity } from './entity';
import type { PixelData } from './animation';

export interface MapNode {
  id: string;
  sceneId: string;
  actNumber: number;
  title: string;
  description: string;
  x: number;
  y: number;
  width: number;
  height: number;
  entities: Entity[];
  thumbnail: PixelData;
  background: string;
  isVisited: boolean;
  isCurrent: boolean;
}

export interface MapConnection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  pathPoints: { x: number; y: number }[];
  style: 'solid' | 'dashed' | 'dotted';
  color: string;
}

export interface DreamMap {
  id: string;
  theaterId: string;
  title: string;
  originalDream: string;
  nodes: MapNode[];
  connections: MapConnection[];
  width: number;
  height: number;
  gridSize: number;
  background: string;
  createdAt: number;
}

export interface MapGenerateOptions {
  nodeWidth: number;
  nodeHeight: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  padding: number;
  gridSize: number;
}

export interface MapPlaybackState {
  isPlaying: boolean;
  currentNodeIndex: number;
  progress: number;
  speed: number;
}

export type MapViewMode = 'explore' | 'playback';
