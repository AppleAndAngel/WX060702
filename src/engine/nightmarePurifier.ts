import type {
  DreamTheater,
  DreamScene,
  Entity,
  PurifiedDreamTheater,
  PurifiedScene,
  PurificationOptions,
  DreamPurificationResult,
  PurifyIntensity,
} from '@/types';
import { generateId } from '@/utils/pixelUtils';
import { createAnimationGenerator } from './animationGenerator';
import { createEncyclopediaGenerator } from './encyclopediaGenerator';
import { healingSanctuary } from '@/data/ruleSets/healingSanctuary';

const nightmareColorToHealing: Record<string, { color: string; reason: string }> = {
  '#0a0a0a': { color: '#fff5e6', reason: '深邃黑暗 → 温暖米白' },
  '#0a0a0f': { color: '#fff5e6', reason: '压抑黑 → 治愈米白' },
  '#12121a': { color: '#ffe4c4', reason: '暗紫黑 → 柔和桃色' },
  '#1a1a2e': { color: '#ffd4a3', reason: '暗蓝紫 → 温暖橘色' },
  '#16213e': { color: '#ffc080', reason: '深蓝 → 柔和橘黄' },
  '#0f3460': { color: '#a8e6cf', reason: '深海蓝 → 薄荷绿' },
  '#533483': { color: '#88d8b0', reason: '深紫 → 柔和青绿' },
  '#e94560': { color: '#ff6b6b', reason: '血红 → 柔和粉红' },
  '#ef4444': { color: '#ff6b6b', reason: '亮红 → 治愈粉红' },
  '#ff0000': { color: '#ff6b6b', reason: '纯红 → 柔和粉红' },
  '#8b0000': { color: '#ff8a80', reason: '暗红 → 浅粉红' },
  '#000000': { color: '#fff5e6', reason: '纯黑 → 温暖米白' },
  '#2a2a3a': { color: '#ffe4c4', reason: '暗灰 → 柔和米色' },
  '#4a0000': { color: '#ffab91', reason: '血暗红 → 柔和橘红' },
  '#00ff00': { color: '#a8e6cf', reason: '诡异绿 → 柔和薄荷绿' },
  '#00fff5': { color: '#48dbfb', reason: '霓虹青 → 天空蓝' },
  '#ff00ff': { color: '#ffb366', reason: '诡异紫 → 温暖橘' },
  '#ffff00': { color: '#feca57', reason: '刺眼黄 → 柔和金黄' },
};

const entitySofteningMap: Record<string, { type: string; name: string; reason: string }> = {
  monster: { type: 'animal_friend', name: '毛绒小伙伴', reason: '怪物 → 可爱动物伙伴' },
  demon: { type: 'animal_friend', name: '温柔精灵', reason: '恶魔 → 温柔精灵' },
  ghost: { type: 'cloud', name: '棉花糖云', reason: '鬼魂 → 柔软云朵' },
  robot: { type: 'animal_friend', name: '机械小宠物', reason: '机器人 → 可爱机械宠物' },
  drone: { type: 'star', name: '闪耀星光', reason: '无人机 → 闪烁星光' },
  weapon: { type: 'flower', name: '治愈花朵', reason: '武器 → 美丽花朵' },
  barrier: { type: 'rainbow', name: '彩虹桥', reason: '能量屏障 → 彩虹桥' },
  data_stream: { type: 'flower', name: '光粒花雨', reason: '数据流 → 花雨' },
  alien: { type: 'animal_friend', name: '星际小精灵', reason: '外星人 → 可爱星际精灵' },
  villain: { type: 'protagonist', name: '迷途旅人', reason: '反派 → 需要帮助的旅人' },
  darkness: { type: 'sun', name: '暖阳', reason: '黑暗 → 温暖阳光' },
  fog: { type: 'cloud', name: '棉花糖云', reason: '迷雾 → 柔软云朵' },
  blood: { type: 'flower', name: '红色花朵', reason: '血迹 → 美丽红花' },
  corpse: { type: 'flower', name: '纪念花束', reason: '尸体 → 纪念花束' },
  chains: { type: 'rainbow', name: '彩虹丝带', reason: '锁链 → 彩虹丝带' },
  fire: { type: 'candle', name: '温暖烛光', reason: '烈火 → 柔和烛光' },
  storm: { type: 'cloud', name: '温柔云朵', reason: '暴风雨 → 柔和云朵' },
};

const descriptionSofteningPatterns: { pattern: RegExp; replacement: string; note: string }[] = [
  { pattern: /恐怖的|可怕的|惊悚的|吓人的|令人恐惧的/g, replacement: '神秘的', note: '消除恐怖形容词' },
  { pattern: /追杀|追逐|逃跑|逃离/g, replacement: '漫步', note: '紧张追逐 → 悠闲漫步' },
  { pattern: /尖叫|大喊|哭泣|恐惧|害怕/g, replacement: '微笑', note: '恐惧情绪 → 温暖微笑' },
  { pattern: /黑暗|漆黑|阴暗|阴沉/g, replacement: '温暖', note: '黑暗 → 温暖' },
  { pattern: /血|流血|尸体|死亡|被杀/g, replacement: '花朵', note: '死亡意象 → 花朵' },
  { pattern: /怪物|恶魔|鬼魂|幽灵|妖怪/g, replacement: '小伙伴', note: '鬼怪 → 小伙伴' },
  { pattern: /攻击|打斗|战斗|伤害|威胁/g, replacement: '拥抱', note: '攻击 → 拥抱' },
  { pattern: /被困|囚禁|无法逃脱/g, replacement: '安然休憩', note: '被困 → 休憩' },
  { pattern: /冰冷|寒冷|刺骨/g, replacement: '温暖', note: '冰冷 → 温暖' },
  { pattern: /破碎|毁灭|崩塌|坍塌/g, replacement: '盛开', note: '毁灭 → 盛开' },
  { pattern: /噩梦|恶梦/g, replacement: '美梦', note: '噩梦 → 美梦' },
  { pattern: /诡异|怪异|反常/g, replacement: '奇妙', note: '诡异 → 奇妙' },
  { pattern: /压抑|窒息|喘不过气/g, replacement: '放松', note: '压抑 → 放松' },
  { pattern: /孤独|孤单|寂寞/g, replacement: '被陪伴', note: '孤独 → 陪伴' },
  { pattern: /绝望|无助|崩溃/g, replacement: '充满希望', note: '绝望 → 希望' },
];

const healingTitles = [
  '温暖晨曦',
  '治愈之光',
  '宁静港湾',
  '柔软时光',
  '安然梦境',
  '希望之花',
  '温柔拥抱',
  '星光伴行',
];

const healingDescriptions = [
  '温暖的阳光洒落，一切都变得柔软而美好...',
  '在治愈的光芒中，心灵得到了安息...',
  '温柔的力量包围着你，带来平安与宁静...',
  '花朵在微风中轻舞，诉说着美好的故事...',
  '星光闪烁，指引着通往温暖的道路...',
  '柔软的云朵轻轻簇拥，带来安详的梦境...',
  '彩虹横跨天际，连接着希望与美好...',
  '小动物们围绕在身边，带来纯真的快乐...',
];

export class NightmarePurifier {
  private healingColorPalette: string[];

  constructor() {
    this.healingColorPalette = healingSanctuary.palette;
  }

  purifyDream(
    theater: DreamTheater,
    options: PurificationOptions
  ): DreamPurificationResult {
    const purifiedScenes: PurifiedScene[] = [];
    let colorsTransformed = 0;
    let entitiesSoftened = 0;
    let descriptionsRewritten = 0;
    let durationAdjusted = 0;

    for (const scene of theater.scenes) {
      const result = this.purifyScene(scene, options, theater.scenes.length);
      purifiedScenes.push(result.purifiedScene);

      colorsTransformed += result.purifiedScene.colorTransform.length;
      if (result.purifiedScene.description !== scene.description) {
        descriptionsRewritten++;
      }
      if (result.purifiedScene.duration !== scene.duration) {
        durationAdjusted++;
      }
      entitiesSoftened += this.countSoftenedEntities(scene.entities, result.purifiedScene.entities);
    }

    const totalDuration = purifiedScenes.reduce((sum, s) => sum + s.duration, 0);

    const purifiedTheater: PurifiedDreamTheater = {
      ...theater,
      id: generateId(),
      scenes: purifiedScenes,
      originalDream: theater.originalDream,
      title: this.generateHealingTitle(theater.title),
      isPurified: true,
      originalTheater: theater,
      purificationIntensity: options.intensity,
      currentViewMode: 'purified',
      totalDuration,
      ruleSetId: healingSanctuary.id,
      updatedAt: Date.now(),
      transformationStats: {
        colorsTransformed,
        entitiesSoftened,
        descriptionsRewritten,
        durationAdjusted,
      },
    };

    const encyclopediaGenerator = createEncyclopediaGenerator();
    purifiedTheater.encyclopedia = encyclopediaGenerator.generateEncyclopedia(purifiedTheater);

    return {
      originalTheater: theater,
      purifiedTheater,
      totalDuration,
      transformationStats: {
        colorsTransformed,
        entitiesSoftened,
        descriptionsRewritten,
        durationAdjusted,
      },
    };
  }

  purifyScene(
    scene: DreamScene,
    options: PurificationOptions,
    totalScenes: number
  ): { purifiedScene: PurifiedScene; notes: string } {
    const colorTransform: { original: string; purified: string }[] = [];
    const purificationNotes: string[] = [];

    let purifiedEntities = [...scene.entities];

    if (options.keepEntityStructure) {
      purifiedEntities = scene.entities.map(entity => {
        const softened = this.softenEntity(entity);
        if (softened.type !== entity.type) {
          purificationNotes.push(`「${entity.name}」→「${softened.name}」`);
        }
        return softened;
      });
    }

    if (options.transformColors) {
      purifiedEntities = purifiedEntities.map(entity => {
        const transformed = this.transformEntityColor(entity, options.intensity);
        if (transformed.color !== entity.color) {
          colorTransform.push({
            original: entity.color,
            purified: transformed.color,
          });
        }
        return transformed;
      });
    }

    const purifiedEntitiesWithHealingProps = purifiedEntities.map(entity => ({
      ...entity,
      properties: {
        ...entity.properties,
        glowing: true,
        friendly: true,
      },
    }));

    const animationGenerator = createAnimationGenerator(healingSanctuary);
    const frame = animationGenerator.generateAnimationFrame(
      purifiedEntitiesWithHealingProps,
      scene.frame.index,
      healingSanctuary.background
    );

    let purifiedDescription = scene.description;
    if (options.rewriteDescriptions) {
      purifiedDescription = this.rewriteDescription(scene.description, scene.actNumber, totalScenes);
      if (purifiedDescription !== scene.description) {
        purificationNotes.push('描述文本已净化');
      }
    }

    let purifiedDuration = scene.duration;
    if (options.adjustDuration) {
      const durationMultiplier = this.getDurationMultiplier(options.intensity);
      purifiedDuration = Math.round(scene.duration * durationMultiplier);
      if (purifiedDuration !== scene.duration) {
        purificationNotes.push(`节奏调整：${(durationMultiplier * 100).toFixed(0)}%`);
      }
    }

    const purifiedTitle = this.generateHealingSceneTitle(scene.actNumber);

    const purifiedScene: PurifiedScene = {
      ...scene,
      id: generateId(),
      title: purifiedTitle,
      description: purifiedDescription,
      entities: purifiedEntitiesWithHealingProps,
      frame,
      duration: purifiedDuration,
      originalScene: scene,
      purificationNotes: purificationNotes.join('；'),
      colorTransform,
    };

    return {
      purifiedScene,
      notes: purificationNotes.join('；'),
    };
  }

  private softenEntity(entity: Entity): Entity {
    const lowerType = entity.type.toLowerCase();

    for (const [key, softening] of Object.entries(entitySofteningMap)) {
      if (lowerType.includes(key) || entity.name.includes(softening.name.replace(/小伙伴|精灵|云朵/g, ''))) {
        return {
          ...entity,
          type: softening.type,
          name: softening.name,
          properties: {
            ...entity.properties,
            friendly: true,
            cute: true,
            originalType: entity.type,
            originalName: entity.name,
          },
        };
      }
    }

    return entity;
  }

  private transformEntityColor(entity: Entity, intensity: PurifyIntensity): Entity {
    const color = entity.color.toLowerCase();
    const mapping = nightmareColorToHealing[color];

    if (mapping) {
      return {
        ...entity,
        color: mapping.color,
        properties: {
          ...entity.properties,
          originalColor: entity.color,
          colorTransformReason: mapping.reason,
        },
      };
    }

    if (this.isDarkOrViolentColor(color)) {
      const softenedColor = this.softenColor(color, intensity);
      return {
        ...entity,
        color: softenedColor,
        properties: {
          ...entity.properties,
          originalColor: entity.color,
          colorTransformReason: '暗色调 → 柔和色调',
        },
      };
    }

    return entity;
  }

  private isDarkOrViolentColor(color: string): boolean {
    if (!color.startsWith('#') || color.length < 7) return false;

    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    const brightness = (r * 299 + g * 587 + b * 114) / 1000;

    if (brightness < 60) return true;

    if (r > 150 && g < 80 && b < 80) return true;

    return false;
  }

  private softenColor(color: string, intensity: PurifyIntensity): string {
    if (!color.startsWith('#') || color.length < 7) {
      return this.healingColorPalette[Math.floor(Math.random() * 3)];
    }

    let r = parseInt(color.slice(1, 3), 16);
    let g = parseInt(color.slice(3, 5), 16);
    let b = parseInt(color.slice(5, 7), 16);

    const intensityFactor = {
      mild: 0.3,
      moderate: 0.5,
      strong: 0.7,
    }[intensity];

    r = Math.round(r + (255 - r) * intensityFactor * 0.6);
    g = Math.round(g + (200 - g) * intensityFactor * 0.5);
    b = Math.round(b + (180 - b) * intensityFactor * 0.4);

    r = Math.min(255, Math.max(200, r));
    g = Math.min(255, Math.max(150, g));
    b = Math.min(255, Math.max(120, b));

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private rewriteDescription(original: string, actNumber: number, totalScenes: number): string {
    let result = original;
    const appliedNotes: string[] = [];

    for (const pattern of descriptionSofteningPatterns) {
      if (pattern.pattern.test(result)) {
        result = result.replace(pattern.pattern, pattern.replacement);
        appliedNotes.push(pattern.note);
      }
    }

    if (result === original) {
      const healingDescIndex = (actNumber - 1) % healingDescriptions.length;
      const baseHealing = healingDescriptions[healingDescIndex];

      if (actNumber === 1) {
        result = `梦境的开始，${baseHealing}`;
      } else if (actNumber === totalScenes) {
        result = `梦境的终章，${baseHealing}，一切都归于美好与安宁...`;
      } else {
        const progress = Math.round((actNumber / totalScenes) * 100);
        result = `${baseHealing}（净化进度 ${progress}%）`;
      }
      appliedNotes.push('使用治愈描述模板');
    }

    return result;
  }

  private getDurationMultiplier(intensity: PurifyIntensity): number {
    switch (intensity) {
      case 'mild':
        return 1.2;
      case 'moderate':
        return 1.5;
      case 'strong':
        return 2.0;
      default:
        return 1.5;
    }
  }

  private generateHealingTitle(originalTitle: string): string {
    const cleanedTitle = originalTitle.replace(/噩梦|恶梦|恐怖|惊悚/g, '美梦');
    if (cleanedTitle !== originalTitle) {
      return cleanedTitle + ' · 净化版';
    }
    return `${originalTitle} · 净化版`;
  }

  private generateHealingSceneTitle(actNumber: number): string {
    return healingTitles[(actNumber - 1) % healingTitles.length];
  }

  private countSoftenedEntities(original: Entity[], purified: Entity[]): number {
    let count = 0;
    for (let i = 0; i < original.length && i < purified.length; i++) {
      if (original[i].type !== purified[i].type || original[i].name !== purified[i].name) {
        count++;
      }
    }
    return count;
  }

  compareScenes(original: DreamScene, purified: PurifiedScene): {
    entityDifferences: { type: 'added' | 'removed' | 'modified'; original?: Entity; purified?: Entity }[];
    colorChanges: { original: string; purified: string; reason?: string }[];
    descriptionChanged: boolean;
    durationChanged: boolean;
  } {
    const entityDifferences: { type: 'added' | 'removed' | 'modified'; original?: Entity; purified?: Entity }[] = [];
    const colorChanges: { original: string; purified: string; reason?: string }[] = [];

    const originalEntities = new Map(original.entities.map(e => [e.id, e]));
    const purifiedEntities = new Map(purified.entities.map(e => [e.id, e]));

    for (const [id, origEntity] of originalEntities) {
      const purEntity = purifiedEntities.get(id);
      if (!purEntity) {
        entityDifferences.push({ type: 'removed', original: origEntity });
      } else if (origEntity.type !== purEntity.type || origEntity.name !== purEntity.name) {
        entityDifferences.push({ type: 'modified', original: origEntity, purified: purEntity });
      }
    }

    for (const [id, purEntity] of purifiedEntities) {
      if (!originalEntities.has(id)) {
        entityDifferences.push({ type: 'added', purified: purEntity });
      }
    }

    for (const transform of purified.colorTransform) {
      const reason = nightmareColorToHealing[transform.original.toLowerCase()]?.reason;
      colorChanges.push({ ...transform, reason });
    }

    return {
      entityDifferences,
      colorChanges,
      descriptionChanged: original.description !== purified.description,
      durationChanged: original.duration !== purified.duration,
    };
  }
}

export const createNightmarePurifier = (): NightmarePurifier => {
  return new NightmarePurifier();
};
