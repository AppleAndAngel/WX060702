import type {
  DualDreamTheater,
  DualDreamScene,
  DualDreamer,
  DualDreamMergeResult,
  DualDreamGenerateOptions,
  DreamOwner,
  MergeStrategy,
} from '@/types';
import type { DreamTheater, DreamScene, Entity } from '@/types';
import type { RuleSet } from '@/types';
import { generateId, createEmptyPixelData, randomChoice } from '@/utils/pixelUtils';
import { createLayoutSystem } from './layoutSystem';
import { createEncyclopediaGenerator } from './encyclopediaGenerator';

interface DreamerWithTheater extends DualDreamer {
  theater: DreamTheater;
}

export class DualDreamMerger {
  private ruleSet: RuleSet;

  constructor(ruleSet: RuleSet) {
    this.ruleSet = ruleSet;
  }

  updateRuleSet(ruleSet: RuleSet): void {
    this.ruleSet = ruleSet;
  }

  mergeDreams(
    player1: DreamerWithTheater,
    player2: DreamerWithTheater,
    options: DualDreamGenerateOptions
  ): DualDreamMergeResult {
    const { sceneCount, mergeStrategy, defaultDuration, fps } = options;

    const mergedScenes: DualDreamScene[] = [];
    let player1Count = 0;
    let player2Count = 0;
    let sharedCount = 0;

    for (let i = 0; i < sceneCount; i++) {
      const p1Scene = player1.theater.scenes[i] || player1.theater.scenes[player1.theater.scenes.length - 1];
      const p2Scene = player2.theater.scenes[i] || player2.theater.scenes[player2.theater.scenes.length - 1];

      const mergedScene = this.mergeScenes(
        p1Scene,
        p2Scene,
        player1,
        player2,
        i + 1,
        mergeStrategy,
        defaultDuration
      );

      mergedScene.entities.forEach(entity => {
        if (entity.owner === 'player1') player1Count++;
        else if (entity.owner === 'player2') player2Count++;
        else if (entity.owner === 'shared') sharedCount++;
      });

      mergedScenes.push(mergedScene);
    }

    const totalDuration = mergedScenes.reduce((sum, scene) => sum + scene.duration, 0);

    const mergedTheater: DualDreamTheater = {
      id: generateId(),
      originalDream: `${player1.dreamText} | ${player2.dreamText}`,
      title: this.generateMergedTitle(player1, player2),
      scenes: mergedScenes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalDuration,
      currentSceneIndex: 0,
      isPlaying: false,
      fps,
      ruleSetId: this.ruleSet.id,
      player1: {
        id: player1.id,
        name: player1.name,
        dreamText: player1.dreamText,
        color: player1.color,
      },
      player2: {
        id: player2.id,
        name: player2.name,
        dreamText: player2.dreamText,
        color: player2.color,
      },
      player1Theater: player1.theater,
      player2Theater: player2.theater,
      currentViewMode: 'merged',
      mergeStrategy,
      isDualDream: true,
    };

    const encyclopediaGenerator = createEncyclopediaGenerator();
    mergedTheater.encyclopedia = encyclopediaGenerator.generateEncyclopedia(mergedTheater);

    return {
      mergedTheater,
      player1Theater: player1.theater,
      player2Theater: player2.theater,
      elementStats: {
        player1Count,
        player2Count,
        sharedCount,
      },
    };
  }

  private mergeScenes(
    p1Scene: DreamScene,
    p2Scene: DreamScene,
    player1: DualDreamer,
    player2: DualDreamer,
    actNumber: number,
    strategy: MergeStrategy,
    defaultDuration: number
  ): DualDreamScene {
    const p1Entities = this.tagEntitiesWithOwner(p1Scene.entities, 'player1', player1.color);
    const p2Entities = this.tagEntitiesWithOwner(p2Scene.entities, 'player2', player2.color);

    const { shared, p1Only, p2Only } = this.identifySharedElements(p1Entities, p2Entities);

    let mergedEntities: Entity[] = [];
    let sceneOwner: DreamOwner = 'shared';

    switch (strategy) {
      case 'overlay':
        mergedEntities = this.mergeOverlay(p1Only, p2Only, shared);
        break;
      case 'split':
        mergedEntities = this.mergeSplit(p1Only, p2Only, shared, actNumber);
        sceneOwner = actNumber % 2 === 1 ? 'player1' : 'player2';
        break;
      case 'alternate':
        mergedEntities = this.mergeAlternate(p1Only, p2Only, shared, actNumber);
        sceneOwner = actNumber % 2 === 1 ? 'player1' : 'player2';
        break;
    }

    const layoutSystem = createLayoutSystem(
      this.ruleSet.gridSize.width,
      this.ruleSet.gridSize.height,
      this.ruleSet.background,
      this.ruleSet.palette
    );

    const pixelData = layoutSystem.renderEntitiesToPixelData(mergedEntities);

    const frame = {
      id: generateId(),
      index: 0,
      entities: mergedEntities,
      pixelData,
      background: this.ruleSet.background,
      timestamp: Date.now(),
    };

    return {
      id: generateId(),
      actNumber,
      title: this.generateSceneTitle(p1Scene.title, p2Scene.title, actNumber, strategy),
      description: this.generateSceneDescription(p1Scene, p2Scene, actNumber),
      prompt: `${p1Scene.prompt} | ${p2Scene.prompt}`,
      entities: mergedEntities,
      frame,
      duration: defaultDuration,
      isGenerating: false,
      owner: sceneOwner,
      player1Entities: p1Only,
      player2Entities: p2Only,
    };
  }

  private tagEntitiesWithOwner(
    entities: Entity[],
    owner: DreamOwner,
    ownerColor: string
  ): Entity[] {
    return entities.map(entity => ({
      ...entity,
      id: `${owner}-${entity.id}`,
      owner,
      color: this.adjustColor(entity.color, ownerColor, owner),
      properties: {
        ...entity.properties,
        ownerColor,
        originalColor: entity.color,
      },
    }));
  }

  private adjustColor(originalColor: string, ownerColor: string, owner: DreamOwner): string {
    if (owner === 'shared') return originalColor;

    const mixRatio = 0.3;
    return this.mixColors(originalColor, ownerColor, mixRatio);
  }

  private mixColors(color1: string, color2: string, ratio: number): string {
    const hex = (c: string) => parseInt(c, 16);
    const r1 = hex(color1.slice(1, 3));
    const g1 = hex(color1.slice(3, 5));
    const b1 = hex(color1.slice(5, 7));
    const r2 = hex(color2.slice(1, 3));
    const g2 = hex(color2.slice(3, 5));
    const b2 = hex(color2.slice(5, 7));

    const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
    const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
    const b = Math.round(b1 * (1 - ratio) + b2 * ratio);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private identifySharedElements(p1Entities: Entity[], p2Entities: Entity[]) {
    const shared: Entity[] = [];
    const p1Only: Entity[] = [];
    const p2Only: Entity[] = [];

    const p2Types = new Set(p2Entities.map(e => e.type));

    p1Entities.forEach(p1Entity => {
      const matchingP2 = p2Entities.find(
        p2 => p2.type === p1Entity.type && Math.abs(p2.x - p1Entity.x) < 8 && Math.abs(p2.y - p1Entity.y) < 8
      );

      if (matchingP2) {
        shared.push({
          ...p1Entity,
          id: `shared-${p1Entity.id}`,
          owner: 'shared',
          color: this.mixColors(p1Entity.color, matchingP2.color, 0.5),
          properties: {
            ...p1Entity.properties,
            isShared: true,
            player1Original: { ...p1Entity },
            player2Original: { ...matchingP2 },
          },
        });
      } else {
        p1Only.push(p1Entity);
      }
    });

    p2Entities.forEach(p2Entity => {
      const hasMatch = p1Entities.some(
        p1 => p1.type === p2Entity.type && Math.abs(p1.x - p2Entity.x) < 8 && Math.abs(p1.y - p2Entity.y) < 8
      );
      if (!hasMatch) {
        p2Only.push(p2Entity);
      }
    });

    return { shared, p1Only, p2Only };
  }

  private mergeOverlay(p1Only: Entity[], p2Only: Entity[], shared: Entity[]): Entity[] {
    const width = this.ruleSet.gridSize.width;
    const height = this.ruleSet.gridSize.height;

    const adjustedP1 = p1Only.map(e => ({
      ...e,
      x: Math.max(0, Math.min(width - e.width, e.x - Math.floor(width * 0.15))),
    }));

    const adjustedP2 = p2Only.map(e => ({
      ...e,
      x: Math.max(0, Math.min(width - e.width, e.x + Math.floor(width * 0.15))),
    }));

    const adjustedShared = shared.map(e => ({
      ...e,
      x: Math.floor(width / 2 - e.width / 2),
    }));

    return [...adjustedP1, ...adjustedP2, ...adjustedShared];
  }

  private mergeSplit(
    p1Only: Entity[],
    p2Only: Entity[],
    shared: Entity[],
    actNumber: number
  ): Entity[] {
    const width = this.ruleSet.gridSize.width;
    const height = this.ruleSet.gridSize.height;
    const halfWidth = Math.floor(width / 2);

    if (actNumber % 2 === 1) {
      const adjustedP1 = p1Only.map(e => ({
        ...e,
        x: Math.max(0, Math.min(halfWidth - e.width, e.x)),
      }));
      const adjustedP2 = p2Only.map(e => ({
        ...e,
        x: Math.max(halfWidth, Math.min(width - e.width, e.x + halfWidth)),
        opacity: 0.6,
      }));
      const adjustedShared = shared.map(e => ({
        ...e,
        x: Math.floor(width / 2 - e.width / 2),
      }));
      return [...adjustedP1, ...adjustedP2, ...adjustedShared];
    } else {
      const adjustedP1 = p1Only.map(e => ({
        ...e,
        x: Math.max(0, Math.min(halfWidth - e.width, e.x)),
        opacity: 0.6,
      }));
      const adjustedP2 = p2Only.map(e => ({
        ...e,
        x: Math.max(halfWidth, Math.min(width - e.width, e.x + halfWidth)),
      }));
      const adjustedShared = shared.map(e => ({
        ...e,
        x: Math.floor(width / 2 - e.width / 2),
      }));
      return [...adjustedP1, ...adjustedP2, ...adjustedShared];
    }
  }

  private mergeAlternate(
    p1Only: Entity[],
    p2Only: Entity[],
    shared: Entity[],
    actNumber: number
  ): Entity[] {
    if (actNumber % 3 === 1) {
      return [
        ...p1Only.map(e => ({ ...e, properties: { ...e.properties, pulsing: true } })),
        ...p2Only.map(e => ({ ...e, opacity: 0.4 })),
        ...shared,
      ];
    } else if (actNumber % 3 === 2) {
      return [
        ...p1Only.map(e => ({ ...e, opacity: 0.4 })),
        ...p2Only.map(e => ({ ...e, properties: { ...e.properties, pulsing: true } })),
        ...shared,
      ];
    } else {
      return [...p1Only, ...p2Only, ...shared];
    }
  }

  private generateMergedTitle(player1: DualDreamer, player2: DualDreamer): string {
    const titles = [
      `《${player1.name}与${player2.name}的共梦》`,
      `《双梦交织：${player1.name}×${player2.name}》`,
      `《梦境交汇：${player1.name}与${player2.name}》`,
      `《${player1.name}·${player2.name}：共梦之旅》`,
    ];
    return randomChoice(titles);
  }

  private generateSceneTitle(
    p1Title: string,
    p2Title: string,
    actNumber: number,
    strategy: MergeStrategy
  ): string {
    const strategyPrefix: Record<MergeStrategy, string> = {
      overlay: '交融',
      split: '分镜',
      alternate: '轮转',
    };

    const prefix = strategyPrefix[strategy];
    return `第${actNumber}幕·${prefix}：${p1Title} × ${p2Title}`;
  }

  private generateSceneDescription(p1Scene: DreamScene, p2Scene: DreamScene, actNumber: number): string {
    return `【${p1Scene.description}】与【${p2Scene.description}】在此交汇，梦境开始融合...`;
  }

  filterEntitiesByViewMode(
    entities: Entity[],
    viewMode: 'merged' | 'player1' | 'player2' | 'diff'
  ): Entity[] {
    switch (viewMode) {
      case 'merged':
        return entities;
      case 'player1':
        return entities.filter(e => e.owner === 'player1' || e.owner === 'shared');
      case 'player2':
        return entities.filter(e => e.owner === 'player2' || e.owner === 'shared');
      case 'diff':
        return entities.map(e => ({
          ...e,
          properties: {
            ...e.properties,
            highlightDiff: true,
          },
        }));
      default:
        return entities;
    }
  }

  generateDiffPixelData(
    p1Entities: Entity[],
    p2Entities: Entity[],
    mergedEntities: Entity[]
  ): {
    player1: string[][];
    player2: string[][];
    merged: string[][];
    diff: string[][];
  } {
    const layoutSystem = createLayoutSystem(
      this.ruleSet.gridSize.width,
      this.ruleSet.gridSize.height,
      this.ruleSet.background,
      this.ruleSet.palette
    );

    const p1Data = layoutSystem.renderEntitiesToPixelData(p1Entities);
    const p2Data = layoutSystem.renderEntitiesToPixelData(p2Entities);
    const mergedData = layoutSystem.renderEntitiesToPixelData(mergedEntities);

    const { width, height } = p1Data;
    const diffPixels: string[][] = [];

    for (let y = 0; y < height; y++) {
      diffPixels[y] = [];
      for (let x = 0; x < width; x++) {
        const p1Color = p1Data.pixels[y][x];
        const p2Color = p2Data.pixels[y][x];

        if (p1Color === p2Color && p1Color === this.ruleSet.background) {
          diffPixels[y][x] = this.ruleSet.background;
        } else if (p1Color === p2Color) {
          diffPixels[y][x] = '#FFD700';
        } else if (p1Color !== this.ruleSet.background && p2Color === this.ruleSet.background) {
          diffPixels[y][x] = '#FF6B6B';
        } else if (p2Color !== this.ruleSet.background && p1Color === this.ruleSet.background) {
          diffPixels[y][x] = '#4ECDC4';
        } else {
          diffPixels[y][x] = '#9B59B6';
        }
      }
    }

    return {
      player1: p1Data.pixels,
      player2: p2Data.pixels,
      merged: mergedData.pixels,
      diff: diffPixels,
    };
  }
}

export const createDualDreamMerger = (ruleSet: RuleSet): DualDreamMerger => {
  return new DualDreamMerger(ruleSet);
};
