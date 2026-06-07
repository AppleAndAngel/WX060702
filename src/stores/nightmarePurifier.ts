import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  PurifiedDreamTheater,
  PurifyViewMode,
  PurifyIntensity,
  PurificationOptions,
  DreamPurificationResult,
} from '@/types';
import type { DreamTheater, DreamScene } from '@/types';
import { useDreamStore } from './dream';
import { useRuleSetStore } from './ruleSet';
import { useHistoryStore } from './history';
import { createNightmarePurifier } from '@/engine/nightmarePurifier';
import { createAnimationGenerator } from '@/engine/animationGenerator';
import { generateId } from '@/utils/pixelUtils';

export const useNightmarePurifierStore = defineStore('nightmarePurifier', () => {
  const dreamStore = useDreamStore();
  const ruleSetStore = useRuleSetStore();
  const historyStore = useHistoryStore();

  const originalTheater = ref<DreamTheater | null>(null);
  const purifiedTheater = ref<PurifiedDreamTheater | null>(null);
  const isPurifying = ref(false);
  const error = ref<string | null>(null);
  const currentViewMode = ref<PurifyViewMode>('purified');
  const currentSceneIndex = ref(0);
  const isPlaying = ref(false);
  const dreamText = ref('');

  const purificationOptions = ref<PurificationOptions>({
    intensity: 'moderate',
    keepEntityStructure: true,
    adjustDuration: true,
    rewriteDescriptions: true,
    transformColors: true,
  });

  const activeTheater = computed(() => {
    if (currentViewMode.value === 'original' || currentViewMode.value === 'compare') {
      return originalTheater.value;
    }
    return purifiedTheater.value;
  });

  const displayScene = computed(() => {
    if (currentViewMode.value === 'original') {
      return originalTheater.value?.scenes[currentSceneIndex.value] || null;
    }
    return purifiedTheater.value?.scenes[currentSceneIndex.value] || null;
  });

  const originalScene = computed(() => {
    return originalTheater.value?.scenes[currentSceneIndex.value] || null;
  });

  const purifiedScene = computed(() => {
    return purifiedTheater.value?.scenes[currentSceneIndex.value] || null;
  });

  const sceneCount = computed(() => {
    return Math.max(
      originalTheater.value?.scenes.length || 0,
      purifiedTheater.value?.scenes.length || 0
    );
  });

  const transformationStats = computed(() => {
    return purifiedTheater.value?.transformationStats || {
      colorsTransformed: 0,
      entitiesSoftened: 0,
      descriptionsRewritten: 0,
      durationAdjusted: 0,
    };
  });

  const canPurify = computed(() => {
    return dreamText.value.trim().length > 0 || originalTheater.value !== null;
  });

  const setDreamText = (text: string) => {
    dreamText.value = text;
  };

  const setPurificationOptions = (options: Partial<PurificationOptions>) => {
    purificationOptions.value = { ...purificationOptions.value, ...options };
  };

  const setViewMode = (mode: PurifyViewMode) => {
    currentViewMode.value = mode;
  };

  const setIntensity = (intensity: PurifyIntensity) => {
    purificationOptions.value.intensity = intensity;
  };

  const setCurrentScene = (index: number) => {
    const maxIndex = sceneCount.value - 1;
    currentSceneIndex.value = Math.max(0, Math.min(index, maxIndex));
  };

  const nextScene = () => {
    const maxIndex = sceneCount.value - 1;
    if (currentSceneIndex.value < maxIndex) {
      currentSceneIndex.value++;
    } else {
      currentSceneIndex.value = 0;
    }
  };

  const prevScene = () => {
    const maxIndex = sceneCount.value - 1;
    if (currentSceneIndex.value > 0) {
      currentSceneIndex.value--;
    } else {
      currentSceneIndex.value = maxIndex;
    }
  };

  const togglePlay = () => {
    isPlaying.value = !isPlaying.value;
  };

  const setPlaying = (playing: boolean) => {
    isPlaying.value = playing;
  };

  const generateOriginalDream = async (): Promise<DreamTheater | null> => {
    if (!dreamText.value.trim()) {
      error.value = '请输入梦境描述';
      return null;
    }

    isPurifying.value = true;
    error.value = null;

    try {
      const currentRuleSet = ruleSetStore.currentRuleSet;
      if (!currentRuleSet) {
        error.value = '请先选择规则集';
        return null;
      }

      await new Promise(resolve => setTimeout(resolve, 500));

      const generator = createAnimationGenerator(currentRuleSet);
      const numScenes = 4;

      const scenes = generator.splitDreamIntoScenes(
        dreamText.value,
        numScenes,
        numScenes,
        purificationOptions.value.adjustDuration ? 3000 : 3000
      );

      const theater = generator.createDreamTheater(
        dreamText.value,
        scenes,
        4
      );

      originalTheater.value = theater;
      currentSceneIndex.value = 0;

      return theater;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '生成失败，请重试';
      return null;
    } finally {
      isPurifying.value = false;
    }
  };

  const purifyDream = async (): Promise<DreamPurificationResult | null> => {
    if (!originalTheater.value && !dreamText.value.trim()) {
      error.value = '请先生成原始梦境或输入梦境描述';
      return null;
    }

    isPurifying.value = true;
    error.value = null;

    try {
      if (!originalTheater.value) {
        const generated = await generateOriginalDream();
        if (!generated) {
          return null;
        }
      }

      if (!originalTheater.value) {
        error.value = '原始梦境生成失败';
        return null;
      }

      await new Promise(resolve => setTimeout(resolve, 600));

      const purifier = createNightmarePurifier();
      const result = purifier.purifyDream(originalTheater.value, purificationOptions.value);

      purifiedTheater.value = result.purifiedTheater;
      currentViewMode.value = 'purified';
      currentSceneIndex.value = 0;

      return result;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '净化失败，请重试';
      return null;
    } finally {
      isPurifying.value = false;
    }
  };

  const loadOriginalTheater = (theater: DreamTheater) => {
    originalTheater.value = theater;
    dreamText.value = theater.originalDream;
    currentSceneIndex.value = 0;
    purifiedTheater.value = null;
  };

  const loadPurifiedTheater = (theater: PurifiedDreamTheater) => {
    purifiedTheater.value = theater;
    originalTheater.value = theater.originalTheater;
    dreamText.value = theater.originalDream;
    currentViewMode.value = theater.currentViewMode;
    currentSceneIndex.value = 0;
    purificationOptions.value.intensity = theater.purificationIntensity;
  };

  const exportOriginal = (): string | null => {
    if (!originalTheater.value) return null;

    const exportData = {
      version: '1.0',
      type: 'original-dream',
      exportedAt: Date.now(),
      theater: originalTheater.value,
    };

    return JSON.stringify(exportData, null, 2);
  };

  const exportPurified = (): string | null => {
    if (!purifiedTheater.value) return null;

    const exportData = {
      version: '1.0',
      type: 'purified-dream',
      exportedAt: Date.now(),
      theater: purifiedTheater.value,
    };

    return JSON.stringify(exportData, null, 2);
  };

  const exportBoth = (): string | null => {
    if (!originalTheater.value || !purifiedTheater.value) return null;

    const exportData = {
      version: '1.0',
      type: 'nightmare-purifier-pair',
      exportedAt: Date.now(),
      originalTheater: originalTheater.value,
      purifiedTheater: purifiedTheater.value,
      purificationOptions: purificationOptions.value,
    };

    return JSON.stringify(exportData, null, 2);
  };

  const saveToHistory = async (): Promise<boolean> => {
    if (!purifiedTheater.value) {
      error.value = '没有可保存的净化作品';
      return false;
    }

    const theaterToSave = JSON.parse(JSON.stringify(purifiedTheater.value));
    theaterToSave.isPlaying = false;
    theaterToSave.currentViewMode = 'purified';

    const result = await historyStore.savePurifiedDreamToHistory(theaterToSave);
    return result;
  };

  const reset = () => {
    originalTheater.value = null;
    purifiedTheater.value = null;
    isPurifying.value = false;
    error.value = null;
    currentViewMode.value = 'purified';
    currentSceneIndex.value = 0;
    isPlaying.value = false;
    dreamText.value = '';
    purificationOptions.value = {
      intensity: 'moderate',
      keepEntityStructure: true,
      adjustDuration: true,
      rewriteDescriptions: true,
      transformColors: true,
    };
  };

  const getScenePurificationNotes = (sceneIndex: number): string => {
    const scene = purifiedTheater.value?.scenes[sceneIndex];
    return scene?.purificationNotes || '';
  };

  const getSceneColorTransforms = (sceneIndex: number) => {
    const scene = purifiedTheater.value?.scenes[sceneIndex];
    return scene?.colorTransform || [];
  };

  return {
    originalTheater,
    purifiedTheater,
    isPurifying,
    error,
    currentViewMode,
    currentSceneIndex,
    isPlaying,
    dreamText,
    purificationOptions,
    activeTheater,
    displayScene,
    originalScene,
    purifiedScene,
    sceneCount,
    transformationStats,
    canPurify,
    setDreamText,
    setPurificationOptions,
    setViewMode,
    setIntensity,
    setCurrentScene,
    nextScene,
    prevScene,
    togglePlay,
    setPlaying,
    generateOriginalDream,
    purifyDream,
    loadOriginalTheater,
    loadPurifiedTheater,
    exportOriginal,
    exportPurified,
    exportBoth,
    saveToHistory,
    reset,
    getScenePurificationNotes,
    getSceneColorTransforms,
  };
}, {
  persist: {
    key: 'nightmare-purifier',
    paths: [
      'originalTheater',
      'purifiedTheater',
      'currentViewMode',
      'dreamText',
      'purificationOptions',
      'currentSceneIndex',
    ],
  },
});
