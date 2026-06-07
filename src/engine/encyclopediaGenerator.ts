import type {
  DreamTheater,
  DreamScene,
  DreamEncyclopedia,
  EncyclopediaElement,
  EncyclopediaAppearance,
  EncyclopediaTag,
  EmotionAnalysis,
  ElementCategory,
  Entity,
} from '@/types';
import { generateId } from '@/utils/pixelUtils';

const EMOTION_KEYWORDS: Record<string, string[]> = {
  快乐: ['快乐', '开心', '高兴', '幸福', '喜悦', '愉快', '欢乐', '甜蜜'],
  悲伤: ['悲伤', '难过', '伤心', '哭泣', '痛苦', '忧郁', '哀愁', '失落'],
  恐惧: ['恐惧', '害怕', '惊恐', '噩梦', '恐怖', '威胁', '危险', '逃离'],
  愤怒: ['愤怒', '生气', '怒火', '冲突', '战斗', '攻击', '破坏'],
  神秘: ['神秘', '奇幻', '魔法', '未知', '秘密', '迷雾', '仙境', '幻想'],
  冒险: ['冒险', '探索', '发现', '旅程', '冒险', '挑战', '勇敢'],
  平静: ['平静', '安宁', '宁静', '祥和', '平和', '安详', '宁静'],
  浪漫: ['浪漫', '爱情', '温柔', '甜蜜', '心动', '爱恋', '浪漫'],
  奇幻: ['奇幻', '魔法', '超现实', '奇异', '魔幻', '奇迹', '幻想'],
  紧张: ['紧张', '刺激', '惊险', '追逐', '逃跑', '危机', '紧迫'],
};

const SCENE_KEYWORDS = ['森林', '城堡', '天空', '海洋', '山脉', '城市', '村庄', '太空', '梦境', '幻境', '洞穴', '花园', '宫殿', '塔楼', '河流', '湖泊'];
const ITEM_KEYWORDS = ['星星', '月亮', '太阳', '花朵', '树木', '云朵', '动物', '宝石', '武器', '食物', '书籍', '镜子', '钥匙', '宝箱'];
const CHARACTER_KEYWORDS = ['主角', '公主', '王子', '国王', '王后', '仙女', '巫师', '骑士', '龙', '精灵', '矮人', '巨人', '怪物', '英雄', '反派', '我', '人', '女孩', '男孩'];

export class EncyclopediaGenerator {
  classifyEntityType(entity: Entity, sceneText: string): ElementCategory {
    const typeLower = entity.type.toLowerCase();
    const nameLower = entity.name.toLowerCase();
    const textLower = sceneText.toLowerCase();

    for (const keyword of CHARACTER_KEYWORDS) {
      if (typeLower.includes(keyword.toLowerCase()) ||
          nameLower.includes(keyword.toLowerCase()) ||
          textLower.includes(keyword.toLowerCase())) {
        return 'character';
      }
    }

    for (const keyword of SCENE_KEYWORDS) {
      if (typeLower.includes(keyword.toLowerCase()) ||
          nameLower.includes(keyword.toLowerCase()) ||
          textLower.includes(keyword.toLowerCase())) {
        return 'scene';
      }
    }

    for (const keyword of ITEM_KEYWORDS) {
      if (typeLower.includes(keyword.toLowerCase()) ||
          nameLower.includes(keyword.toLowerCase()) ||
          textLower.includes(keyword.toLowerCase())) {
        return 'item';
      }
    }

    if (entity.type === 'protagonist' || entity.type === 'animal') {
      return 'character';
    }
    if (entity.type === 'castle' || entity.type === 'mountain' || entity.type === 'river') {
      return 'scene';
    }

    return 'item';
  }

  generateEmotionAnalysis(dreamText: string, scenes: DreamScene[]): EmotionAnalysis {
    const allText = dreamText + ' ' + scenes.map(s => s.prompt + ' ' + s.title + ' ' + s.description).join(' ');
    const lowerText = allText.toLowerCase();

    const emotionCounts: Record<string, number> = {};
    const foundKeywords: string[] = [];

    for (const [emotion, keywords] of Object.entries(EMOTION_KEYWORDS)) {
      emotionCounts[emotion] = 0;
      for (const keyword of keywords) {
        if (lowerText.includes(keyword)) {
          emotionCounts[emotion]++;
          foundKeywords.push(keyword);
        }
      }
    }

    const sortedEmotions = Object.entries(emotionCounts)
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);

    if (sortedEmotions.length === 0) {
      return {
        primaryEmotion: '神秘',
        secondaryEmotions: ['奇幻', '冒险'],
        intensity: 50,
        keywords: ['神秘', '未知'],
        description: '这是一段充满神秘色彩的梦境，蕴含着无限的可能性。',
      };
    }

    const primaryEmotion = sortedEmotions[0][0];
    const secondaryEmotions = sortedEmotions.slice(1, 3).map(e => e[0]);
    const totalCount = Object.values(emotionCounts).reduce((a, b) => a + b, 0);
    const intensity = Math.min(100, Math.round((totalCount / 5) * 100));

    const descriptions: Record<string, string> = {
      快乐: '这段梦境充满了欢乐与幸福的气息，每一刻都洋溢着温暖的情感。',
      悲伤: '梦境中弥漫着淡淡的忧伤，诉说着内心深处的情感。',
      恐惧: '这是一段令人心惊胆战的梦境，黑暗中的未知令人窒息。',
      愤怒: '梦境中燃烧着怒火，冲突与对抗是主旋律。',
      神秘: '神秘的氛围笼罩着整个梦境，未知的秘密等待揭晓。',
      冒险: '充满刺激的冒险之旅在梦境中展开，勇气与探索并存。',
      平静: '宁静祥和的梦境，带来心灵的安宁与放松。',
      浪漫: '甜蜜浪漫的气息弥漫在梦境中，温柔的情感流淌其中。',
      奇幻: '奇幻的世界在梦境中展开，魔法与奇迹无处不在。',
      紧张: '紧张刺激的情节扣人心弦，每一刻都充满悬念。',
    };

    return {
      primaryEmotion,
      secondaryEmotions: secondaryEmotions.length > 0 ? secondaryEmotions : ['神秘'],
      intensity,
      keywords: foundKeywords.length > 0 ? [...new Set(foundKeywords)].slice(0, 10) : ['神秘'],
      description: descriptions[primaryEmotion] || descriptions.神秘,
    };
  }

  createAppearance(scene: DreamScene, entities: Entity[]): EncyclopediaAppearance {
    return {
      sceneId: scene.id,
      actNumber: scene.actNumber,
      sceneTitle: scene.title,
      entities: [...entities],
      frameIndex: scene.frame.index,
    };
  }

  generateElementDescription(category: ElementCategory, name: string, count: number): string {
    const templates: Record<ElementCategory, string[]> = {
      character: [
        `「${name}」是这个梦境故事中的重要角色，`,
        `在梦境中，「${name}」扮演着关键的角色，`,
        `「${name}」作为梦境的主角之一，`,
      ],
      item: [
        `「${name}」是梦境中的重要物品，`,
        `梦境中出现的「${name}」`,
        `「${name}」作为梦境的关键元素，`,
      ],
      scene: [
        `「${name}」构成了梦境的主要场景，`,
        `在「${name}」的背景下，`,
        `梦境的舞台设置在「${name}」，`,
      ],
      emotion: [
        `「${name}」的情感贯穿整个梦境，`,
        `梦境中弥漫着「${name}」的氛围，`,
      ],
    };

    const countTemplates = [
      `共出现 ${count} 次，是梦境中不可或缺的存在。`,
      `在 ${count} 个场景中留下了踪迹。`,
      `贯穿了 ${count} 个梦境场景。`,
    ];

    const template = templates[category][Math.floor(Math.random() * templates[category].length)];
    const countTemplate = countTemplates[Math.floor(Math.random() * countTemplates.length)];

    return template + countTemplate;
  }

  generateEncyclopedia(theater: DreamTheater): DreamEncyclopedia {
    const elements: EncyclopediaElement[] = [];
    const elementMap: Map<string, EncyclopediaElement> = new Map();

    for (const scene of theater.scenes) {
      for (const entity of scene.entities) {
        const category = this.classifyEntityType(entity, scene.prompt + ' ' + scene.title);
        const key = `${category}-${entity.type}-${entity.name}`;

        if (!elementMap.has(key)) {
          const tags = this.generateTags(category, entity);
          elementMap.set(key, {
            id: generateId(),
            category,
            name: entity.name,
            type: entity.type,
            description: '',
            color: entity.color,
            appearances: [],
            tags,
          });
        }

        const element = elementMap.get(key)!;
        const existingAppearance = element.appearances.find(a => a.sceneId === scene.id);

        if (!existingAppearance) {
          element.appearances.push(this.createAppearance(scene, [entity]));
        } else {
          existingAppearance.entities.push(entity);
        }
      }
    }

    for (const element of elementMap.values()) {
      element.description = this.generateElementDescription(
        element.category,
        element.name,
        element.appearances.length
      );
      elements.push(element);
    }

    const emotionAnalysis = this.generateEmotionAnalysis(theater.originalDream, theater.scenes);

    const emotionElement: EncyclopediaElement = {
      id: generateId(),
      category: 'emotion',
      name: emotionAnalysis.primaryEmotion,
      type: 'emotion',
      description: emotionAnalysis.description,
      color: this.getEmotionColor(emotionAnalysis.primaryEmotion),
      appearances: theater.scenes.map(scene => this.createAppearance(scene, [])),
      tags: [...emotionAnalysis.secondaryEmotions, ...emotionAnalysis.keywords.slice(0, 3)],
    };
    elements.push(emotionElement);

    const tags = this.generateTagsFromElements(elements);

    return {
      id: generateId(),
      theaterId: theater.id,
      title: `《${theater.title}》梦境图鉴`,
      elements,
      tags,
      emotionAnalysis,
      generatedAt: Date.now(),
    };
  }

  private getEmotionColor(emotion: string): string {
    const emotionColors: Record<string, string> = {
      快乐: '#ffd93d',
      悲伤: '#4d96ff',
      恐惧: '#1a1a2e',
      愤怒: '#e94560',
      神秘: '#533483',
      冒险: '#6bcb77',
      平静: '#4d96ff',
      浪漫: '#e94560',
      奇幻: '#533483',
      紧张: '#f59e0b',
    };
    return emotionColors[emotion] || '#533483';
  }

  private generateTags(category: ElementCategory, entity: Entity): string[] {
    const tags: string[] = [];

    const categoryTags: Record<ElementCategory, string[]> = {
      character: ['角色', '人物'],
      item: ['物品', '道具'],
      scene: ['场景', '环境'],
      emotion: ['情绪', '氛围'],
    };

    tags.push(...categoryTags[category]);

    if (entity.properties.floating) tags.push('漂浮');
    if (entity.properties.twinkling) tags.push('闪烁');
    if (entity.properties.falling) tags.push('坠落');
    if (entity.properties.flowing) tags.push('流动');
    if (entity.properties.pulsing) tags.push('脉动');
    if (entity.properties.glowing) tags.push('发光');

    return tags;
  }

  private generateTagsFromElements(elements: EncyclopediaElement[]): EncyclopediaTag[] {
    const tagMap: Map<string, { name: string; category: ElementCategory; count: number }> = new Map();

    for (const element of elements) {
      for (const tagName of element.tags) {
        const key = `${element.category}-${tagName}`;
        if (!tagMap.has(key)) {
          tagMap.set(key, { name: tagName, category: element.category, count: 0 });
        }
        tagMap.get(key)!.count++;
      }

      const categoryKey = `category-${element.category}`;
      const categoryNames: Record<ElementCategory, string> = {
        character: '角色',
        item: '物品',
        scene: '场景',
        emotion: '情绪',
      };
      if (!tagMap.has(categoryKey)) {
        tagMap.set(categoryKey, { name: categoryNames[element.category], category: element.category, count: 0 });
      }
      tagMap.get(categoryKey)!.count++;
    }

    return Array.from(tagMap.values()).map(tag => ({
      id: generateId(),
      name: tag.name,
      category: tag.category,
      count: tag.count,
    }));
  }

  filterElements(
    elements: EncyclopediaElement[],
    filter: { categories?: ElementCategory[]; tags?: string[]; searchQuery?: string }
  ): EncyclopediaElement[] {
    return elements.filter(element => {
      if (filter.categories && filter.categories.length > 0) {
        if (!filter.categories.includes(element.category)) {
          return false;
        }
      }

      if (filter.tags && filter.tags.length > 0) {
        const hasMatchingTag = filter.tags.some(tag => element.tags.includes(tag));
        if (!hasMatchingTag) {
          return false;
        }
      }

      if (filter.searchQuery && filter.searchQuery.trim()) {
        const query = filter.searchQuery.toLowerCase();
        const matchesSearch = element.name.toLowerCase().includes(query) ||
          element.description.toLowerCase().includes(query) ||
          element.tags.some(tag => tag.toLowerCase().includes(query));
        if (!matchesSearch) {
          return false;
        }
      }

      return true;
    });
  }
}

export const createEncyclopediaGenerator = (): EncyclopediaGenerator => {
  return new EncyclopediaGenerator();
};
