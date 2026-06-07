import type { Entity, EntityRule, RuleSet } from '@/types';
import { generateId, randomInt, randomChoice } from '@/utils/pixelUtils';

export class RuleEngine {
  private ruleSet: RuleSet;

  constructor(ruleSet: RuleSet) {
    this.ruleSet = ruleSet;
  }

  updateRuleSet(ruleSet: RuleSet): void {
    this.ruleSet = ruleSet;
  }

  extractKeywords(text: string): string[] {
    const keywords: string[] = [];
    const lowerText = text.toLowerCase();

    for (const rule of this.ruleSet.entityRules) {
      for (const keyword of rule.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          keywords.push(keyword);
          break;
        }
      }
    }

    return keywords;
  }

  matchEntityRules(text: string): EntityRule[] {
    const matchedRules: EntityRule[] = [];
    const lowerText = text.toLowerCase();

    for (const rule of this.ruleSet.entityRules) {
      for (const keyword of rule.keywords) {
        if (lowerText.includes(keyword.toLowerCase())) {
          matchedRules.push(rule);
          break;
        }
      }
    }

    for (const rule of this.ruleSet.entityRules) {
      if (!matchedRules.includes(rule) && rule.minCount > 0) {
        matchedRules.push(rule);
      }
    }

    return matchedRules;
  }

  generateEntitiesFromText(text: string, gridWidth: number, gridHeight: number): Entity[] {
    const entities: Entity[] = [];
    const matchedRules = this.matchEntityRules(text);
    const usedPositions: { x: number; y: number; width: number; height: number }[] = [];

    for (const rule of matchedRules) {
      const count = randomInt(rule.minCount, Math.min(rule.maxCount, rule.minCount + 2));

      for (let i = 0; i < count; i++) {
        const color = this.ruleSet.palette.includes(rule.defaultColor)
          ? rule.defaultColor
          : randomChoice(this.ruleSet.palette);

        let position = this.findValidPosition(
          rule.width,
          rule.height,
          gridWidth,
          gridHeight,
          usedPositions
        );

        if (!position) {
          position = {
            x: randomInt(0, Math.max(0, gridWidth - rule.width)),
            y: randomInt(0, Math.max(0, gridHeight - rule.height)),
          };
        }

        const entity: Entity = {
          id: generateId(),
          type: rule.type,
          name: rule.name,
          x: position.x,
          y: position.y,
          width: rule.width,
          height: rule.height,
          color,
          properties: { ...rule.properties },
        };

        entities.push(entity);
        usedPositions.push({
          x: position.x,
          y: position.y,
          width: rule.width,
          height: rule.height,
        });
      }
    }

    return entities;
  }

  private findValidPosition(
    width: number,
    height: number,
    gridWidth: number,
    gridHeight: number,
    usedPositions: { x: number; y: number; width: number; height: number }[]
  ): { x: number; y: number } | null {
    const maxAttempts = 50;
    const padding = 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = randomInt(padding, Math.max(padding, gridWidth - width - padding));
      const y = randomInt(padding, Math.max(padding, gridHeight - height - padding));

      let valid = true;
      for (const used of usedPositions) {
        if (this.checkOverlap(
          x, y, width, height,
          used.x - padding, used.y - padding,
          used.width + padding * 2, used.height + padding * 2
        )) {
          valid = false;
          break;
        }
      }

      if (valid) {
        return { x, y };
      }
    }

    return null;
  }

  private checkOverlap(
    x1: number, y1: number, w1: number, h1: number,
    x2: number, y2: number, w2: number, h2: number
  ): boolean {
    return !(
      x1 + w1 <= x2 ||
      x2 + w2 <= x1 ||
      y1 + h1 <= y2 ||
      y2 + h2 <= y1
    );
  }

  getPalette(): string[] {
    return this.ruleSet.palette;
  }

  getBackground(): string {
    return this.ruleSet.background;
  }

  getGridSize(): { width: number; height: number } {
    return this.ruleSet.gridSize;
  }
}

export const createRuleEngine = (ruleSet: RuleSet): RuleEngine => {
  return new RuleEngine(ruleSet);
};
