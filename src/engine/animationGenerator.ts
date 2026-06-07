import type { Entity, AnimationFrame, Animation, DreamScene, DreamTheater, PixelData } from '@/types';
import { generateId, createEmptyPixelData, randomChoice, randomInt } from '@/utils/pixelUtils';
import { createRuleEngine } from './ruleEngine';
import { createLayoutSystem } from './layoutSystem';
import { createEncyclopediaGenerator } from './encyclopediaGenerator';
import type { RuleSet } from '@/types';

export class AnimationGenerator {
  private ruleSet: RuleSet;

  constructor(ruleSet: RuleSet) {
    this.ruleSet = ruleSet;
  }

  updateRuleSet(ruleSet: RuleSet): void {
    this.ruleSet = ruleSet;
  }

  generateAnimationFrame(
    entities: Entity[],
    index: number,
    background?: string
  ): AnimationFrame {
    const layoutSystem = createLayoutSystem(
      this.ruleSet.gridSize.width,
      this.ruleSet.gridSize.height,
      background || this.ruleSet.background,
      this.ruleSet.palette
    );

    const pixelData = layoutSystem.renderEntitiesToPixelData(entities);

    return {
      id: generateId(),
      index,
      entities: [...entities],
      pixelData,
      background: background || this.ruleSet.background,
      timestamp: Date.now(),
    };
  }

  generateAnimation(
    entities: Entity[],
    frameCount: number,
    fps: number
  ): Animation {
    const ruleEngine = createRuleEngine(this.ruleSet);
    const layoutSystem = createLayoutSystem(
      this.ruleSet.gridSize.width,
      this.ruleSet.gridSize.height,
      this.ruleSet.background,
      this.ruleSet.palette
    );

    const frames: AnimationFrame[] = [];

    for (let i = 0; i < frameCount; i++) {
      const progress = i / frameCount;
      const animatedEntities = entities.map(entity => {
        const animated = { ...entity };

        if (entity.properties.floating as boolean) {
          animated.y = entity.y + Math.sin(progress * Math.PI * 2) * 1;
        }
        if (entity.properties.twinkling as boolean) {
          animated.properties = {
            ...animated.properties,
            opacity: 0.5 + Math.sin(progress * Math.PI * 4) * 0.5,
          };
        }
        if (entity.properties.falling as boolean) {
          animated.y = (entity.y + progress * this.ruleSet.gridSize.height) % this.ruleSet.gridSize.height;
        }
        if (entity.properties.flowing as boolean) {
          animated.x = (entity.x + progress * 2) % this.ruleSet.gridSize.width;
        }
        if (entity.properties.pulsing as boolean) {
          const scale = 1 + Math.sin(progress * Math.PI * 2) * 0.1;
          animated.width = Math.max(1, Math.round(entity.width * scale));
          animated.height = Math.max(1, Math.round(entity.height * scale));
        }

        return animated;
      });

      const pixelData = layoutSystem.renderEntitiesToPixelData(animatedEntities);

      frames.push({
        id: generateId(),
        index: i,
        entities: animatedEntities,
        pixelData,
        background: this.ruleSet.background,
        timestamp: Date.now(),
      });
    }

    return {
      id: generateId(),
      frames,
      fps,
      width: this.ruleSet.gridSize.width,
      height: this.ruleSet.gridSize.height,
      currentFrameIndex: 0,
      isPlaying: false,
      selectedSprite: null,
    };
  }

  generateDreamScene(
    prompt: string,
    actNumber: number,
    duration: number
  ): DreamScene {
    const ruleEngine = createRuleEngine(this.ruleSet);
    const entities = ruleEngine.generateEntitiesFromText(
      prompt,
      this.ruleSet.gridSize.width,
      this.ruleSet.gridSize.height
    );

    const frame = this.generateAnimationFrame(entities, 0);

    const titles = [
      '序幕开启',
      '神秘降临',
      '幻境深处',
      '命运转折',
      '终章回响',
      '迷雾之中',
      '星光指引',
      '暗影浮现',
    ];

    const descriptions = [
      '一切故事从这里开始...',
      '空气中弥漫着神秘的气息',
      '未知的冒险在等待着你',
      '命运的齿轮开始转动',
      '真相即将揭晓',
      '穿越迷雾，寻找光明',
      '星辰指引着前进的方向',
      '黑暗中隐藏着什么秘密',
    ];

    return {
      id: generateId(),
      actNumber,
      title: titles[(actNumber - 1) % titles.length],
      description: descriptions[(actNumber - 1) % descriptions.length],
      prompt,
      entities,
      frame,
      duration,
      isGenerating: false,
    };
  }

  regenerateScene(scene: DreamScene, newPrompt?: string): DreamScene {
    const prompt = newPrompt || scene.prompt;
    const ruleEngine = createRuleEngine(this.ruleSet);
    const entities = ruleEngine.generateEntitiesFromText(
      prompt,
      this.ruleSet.gridSize.width,
      this.ruleSet.gridSize.height
    );

    const frame = this.generateAnimationFrame(entities, scene.frame.index);

    return {
      ...scene,
      prompt,
      entities,
      frame,
      isGenerating: false,
    };
  }

  regenerateEncyclopedia(theater: DreamTheater): DreamTheater {
    const encyclopediaGenerator = createEncyclopediaGenerator();
    theater.encyclopedia = encyclopediaGenerator.generateEncyclopedia(theater);
    theater.updatedAt = Date.now();
    return theater;
  }

  splitDreamIntoScenes(
    dreamText: string,
    minActs: number = 3,
    maxActs: number = 5,
    defaultDuration: number = 3000
  ): DreamScene[] {
    const sentences = dreamText.split(/[。！？!?；;]+/).filter(s => s.trim().length > 0);
    const sceneCount = Math.min(Math.max(minActs, sentences.length), maxActs);

    const scenes: DreamScene[] = [];
    const keywords = this.extractDreamThemes(dreamText);

    for (let i = 0; i < sceneCount; i++) {
      const progress = i / Math.max(1, sceneCount - 1);
      const scenePrompt = this.generateScenePrompt(dreamText, keywords, progress, i + 1, sceneCount);
      const scene = this.generateDreamScene(scenePrompt, i + 1, defaultDuration);
      scenes.push(scene);
    }

    return scenes;
  }

  private extractDreamThemes(text: string): string[] {
    const themeKeywords = [
      '奇幻', '魔法', '冒险', '恐惧', '快乐', '悲伤',
      '神秘', '未来', '过去', '现在', '爱情', '友情',
      '战斗', '和平', '探索', '发现', '逃离', '追逐',
      '飞翔', '坠落', '游泳', '奔跑', '隐藏', '寻找',
    ];

    const foundThemes: string[] = [];
    const lowerText = text.toLowerCase();

    for (const theme of themeKeywords) {
      if (lowerText.includes(theme)) {
        foundThemes.push(theme);
      }
    }

    if (foundThemes.length === 0) {
      foundThemes.push('奇幻', '神秘', '冒险');
    }

    return foundThemes;
  }

  private generateScenePrompt(
    originalDream: string,
    themes: string[],
    progress: number,
    actNumber: number,
    totalActs: number
  ): string {
    const basePrompt = originalDream;

    if (actNumber === 1) {
      return `${basePrompt}，故事的开始，${themes[0]}的氛围，场景建立`;
    } else if (actNumber === totalActs) {
      return `${basePrompt}，故事的结局，${themes[themes.length - 1]}的氛围，高潮与收尾`;
    } else {
      const midTheme = themes[actNumber % themes.length];
      const intensity = Math.round(progress * 100);
      return `${basePrompt}，故事发展中，${midTheme}的氛围，紧张度${intensity}%`;
    }
  }

  createDreamTheater(
    dreamText: string,
    scenes: DreamScene[],
    fps: number
  ): DreamTheater {
    const totalDuration = scenes.reduce((sum, scene) => sum + scene.duration, 0);

    const theater: DreamTheater = {
      id: generateId(),
      originalDream: dreamText,
      title: this.generateTheaterTitle(dreamText),
      scenes,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      totalDuration,
      currentSceneIndex: 0,
      isPlaying: false,
      fps,
      ruleSetId: this.ruleSet.id,
    };

    const encyclopediaGenerator = createEncyclopediaGenerator();
    theater.encyclopedia = encyclopediaGenerator.generateEncyclopedia(theater);

    return theater;
  }

  private generateTheaterTitle(dreamText: string): string {
    const prefixes = ['《', '梦境：', '幻影：', '迷梦：', '奇幻之旅：'];
    const suffixes = ['》', '的梦境', '的幻想', '的冒险', ''];

    const prefix = randomChoice(prefixes);
    const suffix = randomChoice(suffixes);

    const shortDream = dreamText.length > 10
      ? dreamText.substring(0, 10) + '...'
      : dreamText;

    return `${prefix}${shortDream}${suffix}`;
  }

  createTransitionFrame(
    fromFrame: AnimationFrame,
    toFrame: AnimationFrame,
    progress: number
  ): PixelData {
    const { width, height } = fromFrame.pixelData;
    const pixels: string[][] = [];

    for (let y = 0; y < height; y++) {
      pixels[y] = [];
      for (let x = 0; x < width; x++) {
        const fromColor = fromFrame.pixelData.pixels[y][x];
        const toColor = toFrame.pixelData.pixels[y][x];

        if (progress < 0.33) {
          pixels[y][x] = fromColor;
        } else if (progress < 0.66) {
          const noiseColor = randomChoice(this.ruleSet.palette);
          pixels[y][x] = Math.random() > 0.5 ? fromColor : noiseColor;
        } else {
          pixels[y][x] = toColor;
        }
      }
    }

    return { width, height, pixels };
  }

  interpolateEntities(
    fromEntities: Entity[],
    toEntities: Entity[],
    progress: number
  ): Entity[] {
    return fromEntities.map((fromEntity, index) => {
      const toEntity = toEntities[index] || fromEntity;

      return {
        ...fromEntity,
        x: Math.round(fromEntity.x + (toEntity.x - fromEntity.x) * progress),
        y: Math.round(fromEntity.y + (toEntity.y - fromEntity.y) * progress),
        width: Math.round(fromEntity.width + (toEntity.width - fromEntity.width) * progress),
        height: Math.round(fromEntity.height + (toEntity.height - fromEntity.height) * progress),
      };
    });
  }
}

export const createAnimationGenerator = (ruleSet: RuleSet): AnimationGenerator => {
  return new AnimationGenerator(ruleSet);
};
