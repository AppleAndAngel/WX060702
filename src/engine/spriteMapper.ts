import type { Sprite, SpriteMapping } from '@/types';
import { builtinSprites } from '@/data/sprites';

export class SpriteMapper {
  private sprites: Sprite[];
  private mappings: SpriteMapping[];

  constructor() {
    this.sprites = [...builtinSprites];
    this.mappings = [];
    this.initializeDefaultMappings();
  }

  private initializeDefaultMappings(): void {
    this.mappings = [
      { entityType: 'protagonist', spriteId: 'human-simple' },
      { entityType: 'human', spriteId: 'human-simple' },
      { entityType: 'star', spriteId: 'star' },
      { entityType: 'tree', spriteId: 'tree-simple' },
      { entityType: 'castle', spriteId: 'castle' },
      { entityType: 'moon', spriteId: 'moon' },
      { entityType: 'cloud', spriteId: 'cloud' },
    ];
  }

  getAllSprites(): Sprite[] {
    return this.sprites;
  }

  getSpriteById(id: string): Sprite | undefined {
    return this.sprites.find(s => s.id === id);
  }

  addSprite(sprite: Sprite): void {
    if (!this.sprites.find(s => s.id === sprite.id)) {
      this.sprites.push(sprite);
    }
  }

  removeSprite(id: string): void {
    const index = this.sprites.findIndex(s => s.id === id);
    if (index !== -1) {
      this.sprites.splice(index, 1);
      this.mappings = this.mappings.filter(m => m.spriteId !== id);
    }
  }

  getMapping(entityType: string): SpriteMapping | undefined {
    return this.mappings.find(m => m.entityType === entityType);
  }

  setMapping(entityType: string, spriteId: string): void {
    const existing = this.mappings.find(m => m.entityType === entityType);
    if (existing) {
      existing.spriteId = spriteId;
    } else {
      this.mappings.push({ entityType, spriteId });
    }
  }

  getSpriteForEntityType(entityType: string): Sprite | undefined {
    const mapping = this.getMapping(entityType);
    if (mapping) {
      return this.getSpriteById(mapping.spriteId);
    }
    return undefined;
  }

  getAllMappings(): SpriteMapping[] {
    return [...this.mappings];
  }

  clearMappings(): void {
    this.mappings = [];
  }
}

export const createSpriteMapper = (): SpriteMapper => {
  return new SpriteMapper();
};
