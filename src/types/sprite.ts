export interface Sprite {
  id: string;
  name: string;
  width: number;
  height: number;
  pixels: number[][];
  palette: string[];
}

export interface SpriteMapping {
  entityType: string;
  spriteId: string;
}
