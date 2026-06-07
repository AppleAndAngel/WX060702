import type { EntityRule } from './entity';

export interface GridSize {
  width: number;
  height: number;
}

export interface RuleSet {
  id: string;
  name: string;
  description: string;
  entityRules: EntityRule[];
  palette: string[];
  background: string;
  gridSize: GridSize;
  isCustom: boolean;
}

export interface RuleSetImportData {
  name: string;
  description: string;
  entityRules: EntityRule[];
  palette: string[];
  background: string;
  gridSize?: GridSize;
}
