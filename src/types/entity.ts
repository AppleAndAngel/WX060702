export interface Entity {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  spriteId?: string;
  properties: Record<string, unknown>;
}

export interface EntityRule {
  type: string;
  name: string;
  keywords: string[];
  minCount: number;
  maxCount: number;
  defaultColor: string;
  width: number;
  height: number;
  properties: Record<string, unknown>;
}
