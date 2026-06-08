import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  PurifiedDreamTheater,
  NightmarePurifierGenerateOptions,
  PurificationTheme,
  DreamTheater,
  AnimationFrame,
} from '@/types';
import { useRuleSetStore } from './ruleSet';
import { useDreamStore } from './dream';
import { useHistoryStore } from './history';
import { createAnimationGenerator } from '@/engine/animationGenerator';
import { generateId } from '@/utils/pixelUtils';
import { PURIFICATION_THEMES } from '@/types/nightmarePurifier';

export const useNightmarePurifierStore = defineStore('nightmarePurifier', () => {
  const ruleSetStore = useRuleSetStore();
  const dreamStore = useDreamStore();
  const historyStore = useHistoryStore();

  const currentPurifiedTheater = ref<PurifiedDreamTheater | null>(null);
  const isGenerating = ref(false);
  const error = ref<string | null>(null);
  const selectedThemeId = ref<string>('healing-light');

  const generateOptions = ref<NightmarePurifierGenerateOptions>({
    sceneCount: 4,
    defaultDuration: 3000,
    fps: 4,
    keyFrameCount: 3,
  });

  const selectedTheme = computed(() => {
    return PURIFICATION_THEMES.find(t => t.id === selectedThemeId.value) || PURIFICATION_THEMES[0];
  });

  const canGenerate = computed(() => {
    return dreamStore.currentDreamTheater !== null;
  });

  const isGenerated = computed(() => {
    return currentPurifiedTheater.value !== null;
  });

  const setGenerateOptions = (options: Partial<NightmarePurifierGenerateOptions>) => {
    generateOptions.value = { ...generateOptions.value, ...options };
  };

  const setSelectedTheme = (themeId: string) => {
    selectedThemeId.value = themeId;
  };

  const extractComparisonFrames = (
    originalTheater: DreamTheater,
    purifiedTheater: DreamTheater,
    count: number
  ): { original: AnimationFrame; purified: AnimationFrame }[] => {
    const frames: { original: AnimationFrame; purified: AnimationFrame }[] = [];
    const totalScenes = Math.min(originalTheater.scenes.length, purifiedTheater.scenes.length);
    
    if (totalScenes === 0) return frames;
    
    const step = Math.max(1, Math.floor(totalScenes / count));
    
    for (let i = 0; i < count && i < totalScenes; i++) {
      const sceneIndex = Math.min(i * step, totalScenes - 1);
      const originalScene = originalTheater.scenes[sceneIndex];
      const purifiedScene = purifiedTheater.scenes[sceneIndex];
      
      if (originalScene?.frame && purifiedScene?.frame) {
        frames.push({
          original: {
            ...originalScene.frame,
            id: generateId(),
            index: i,
            timestamp: Date.now(),
          },
          purified: {
            ...purifiedScene.frame,
            id: generateId(),
            index: i,
            timestamp: Date.now(),
          },
        });
      }
    }
    
    return frames;
  };

  const generatePurifiedTheater = async (
    theme: PurificationTheme
  ): Promise<DreamTheater> => {
    const currentRuleSet = ruleSetStore.currentRuleSet;
    if (!currentRuleSet) {
      throw new Error('请先选择规则集');
    }

    const generator = createAnimationGenerator(currentRuleSet);
    const originalDream = dreamStore.currentDreamTheater?.originalDream || '';
    
    const purifiedScenes = [];
    
    for (let i = 0; i < generateOptions.value.sceneCount; i++) {
      const progress = (i + 1) / generateOptions.value.sceneCount;
      const actNumber = i + 1;
      
      let scenePrompt = '';
      if (i === 0) {
        scenePrompt = `${originalDream}，${theme.promptModifier}，净化的开始，${theme.mood}的氛围，恐惧逐渐消散`;
      } else if (i === generateOptions.value.sceneCount - 1) {
        scenePrompt = `${originalDream}，${theme.promptModifier}，完全净化的结局，内心充满${theme.mood}`;
      } else {
        const intensity = Math.round(progress * 100);
        scenePrompt = `${originalDream}，${theme.promptModifier}，净化过程中，${theme.mood}的氛围，净化进度${intensity}%`;
      }
      
      const scene = generator.generateDreamScene(scenePrompt, actNumber, generateOptions.value.defaultDuration);
      purifiedScenes.push(scene);
    }
    
    const purifiedTheater = generator.createDreamTheater(
      `${originalDream} [${theme.name}净化版]`,
      purifiedScenes,
      generateOptions.value.fps
    );
    
    purifiedTheater.id = generateId();
    purifiedTheater.title = `${dreamStore.currentDreamTheater?.title || '梦境'} - ${theme.name}净化版`;
    purifiedTheater.originalDream = originalDream;
    
    return purifiedTheater;
  };

  const generatePurification = async (): Promise<PurifiedDreamTheater | null> => {
    if (!dreamStore.currentDreamTheater) {
      error.value = '请先生成基础梦境剧场';
      return null;
    }

    const currentRuleSet = ruleSetStore.currentRuleSet;
    if (!currentRuleSet) {
      error.value = '请先选择规则集';
      return null;
    }

    isGenerating.value = true;
    error.value = null;

    try {
      await new Promise(resolve => setTimeout(resolve, 500));

      const originalTheater = JSON.parse(JSON.stringify(dreamStore.currentDreamTheater));
      const theme = selectedTheme.value;

      const purifiedTheater = await generatePurifiedTheater(theme);

      const comparisonFrames = extractComparisonFrames(
        originalTheater,
        purifiedTheater,
        generateOptions.value.keyFrameCount
      );

      const sceneTitles = purifiedTheater.scenes.map(s => s.title).join(' → ');
      const summary = `${theme.name}净化：${theme.mood}。${sceneTitles}。`;

      const result: PurifiedDreamTheater = {
        id: generateId(),
        originalDream: originalTheater.originalDream,
        title: `${originalTheater.title} - ${theme.name}净化版`,
        originalTheater,
        purifiedTheater,
        selectedTheme: theme,
        comparisonFrames,
        summary,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isPurified: true,
      };

      currentPurifiedTheater.value = result;
      
      return result;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '净化失败，请重试';
      return null;
    } finally {
      isGenerating.value = false;
    }
  };

  const regeneratePurification = async (): Promise<boolean> => {
    if (!currentPurifiedTheater.value) return false;
    
    const result = await generatePurification();
    return result !== null;
  };

  const loadPurifiedToDream = (): boolean => {
    if (!currentPurifiedTheater.value) return false;
    
    const theater = JSON.parse(JSON.stringify(currentPurifiedTheater.value.purifiedTheater));
    theater.isPlaying = false;
    theater.currentSceneIndex = 0;
    dreamStore.loadTheater(theater);
    
    return true;
  };

  const loadOriginalToDream = (): boolean => {
    if (!currentPurifiedTheater.value) return false;
    
    const theater = JSON.parse(JSON.stringify(currentPurifiedTheater.value.originalTheater));
    theater.isPlaying = false;
    theater.currentSceneIndex = 0;
    dreamStore.loadTheater(theater);
    
    return true;
  };

  const clearPurification = (): void => {
    currentPurifiedTheater.value = null;
    error.value = null;
    isGenerating.value = false;
  };

  const saveToHistory = async (): Promise<boolean> => {
    if (!currentPurifiedTheater.value) {
      error.value = '没有可保存的净化作品';
      return false;
    }

    const theaterToSave = JSON.parse(JSON.stringify(currentPurifiedTheater.value));
    theaterToSave.originalTheater.isPlaying = false;
    theaterToSave.purifiedTheater.isPlaying = false;

    const result = await historyStore.savePurifiedDreamToHistory(theaterToSave);
    return result;
  };

  const loadPurifiedTheater = (theater: PurifiedDreamTheater): void => {
    currentPurifiedTheater.value = theater;
    selectedThemeId.value = theater.selectedTheme.id;
    generateOptions.value.fps = theater.purifiedTheater.fps;
  };

  const exportPurification = (): string | null => {
    if (!currentPurifiedTheater.value) return null;

    const exportData = {
      version: '1.0',
      type: 'nightmare-purifier',
      exportedAt: Date.now(),
      purifiedTheater: currentPurifiedTheater.value,
    };

    return JSON.stringify(exportData, null, 2);
  };

  return {
    currentPurifiedTheater,
    isGenerating,
    error,
    selectedThemeId,
    generateOptions,
    selectedTheme,
    canGenerate,
    isGenerated,
    setGenerateOptions,
    setSelectedTheme,
    generatePurification,
    regeneratePurification,
    loadPurifiedToDream,
    loadOriginalToDream,
    clearPurification,
    saveToHistory,
    loadPurifiedTheater,
    exportPurification,
  };
}, {
  persist: {
    key: 'pixel-nightmare-purifier',
    paths: ['currentPurifiedTheater', 'generateOptions', 'selectedThemeId'],
  },
});
