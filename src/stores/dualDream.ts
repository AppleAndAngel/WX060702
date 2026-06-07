import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  DualDreamTheater,
  DualDreamer,
  DualDreamGenerateOptions,
  ViewMode,
  MergeStrategy,
  DualDreamMergeResult,
  DualDreamDiff,
  DreamOwner,
} from '@/types';
import { useRuleSetStore } from './ruleSet';
import { useHistoryStore } from './history';
import { createAnimationGenerator } from '@/engine/animationGenerator';
import { createDualDreamMerger } from '@/engine/dualDreamMerger';
import { generateId } from '@/utils/pixelUtils';

export const useDualDreamStore = defineStore('dualDream', () => {
  const ruleSetStore = useRuleSetStore();
  const historyStore = useHistoryStore();

  const player1 = ref<DualDreamer>({
    id: generateId(),
    name: '梦者 A',
    dreamText: '',
    color: '#FF6B6B',
  });

  const player2 = ref<DualDreamer>({
    id: generateId(),
    name: '梦者 B',
    dreamText: '',
    color: '#4ECDC4',
  });

  const currentDualTheater = ref<DualDreamTheater | null>(null);
  const isGenerating = ref(false);
  const error = ref<string | null>(null);
  const currentViewMode = ref<ViewMode>('merged');
  const showDiffModal = ref(false);

  const generateOptions = ref<DualDreamGenerateOptions>({
    sceneCount: 4,
    defaultDuration: 3000,
    fps: 4,
    mergeStrategy: 'overlay',
  });

  const canGenerate = computed(() => {
    return (
      player1.value.dreamText.trim().length > 0 &&
      player2.value.dreamText.trim().length > 0
    );
  });

  const currentScene = computed(() => {
    if (!currentDualTheater.value) return null;
    return currentDualTheater.value.scenes[currentDualTheater.value.currentSceneIndex];
  });

  const sceneCount = computed(() => {
    return currentDualTheater.value?.scenes.length || 0;
  });

  const currentSceneIndex = computed(() => {
    return currentDualTheater.value?.currentSceneIndex || 0;
  });

  const isPlaying = computed(() => {
    return currentDualTheater.value?.isPlaying || false;
  });

  const elementStats = computed(() => {
    if (!currentDualTheater.value) {
      return { player1Count: 0, player2Count: 0, sharedCount: 0 };
    }

    let player1Count = 0;
    let player2Count = 0;
    let sharedCount = 0;

    currentDualTheater.value.scenes.forEach(scene => {
      scene.entities.forEach(entity => {
        if (entity.owner === 'player1') player1Count++;
        else if (entity.owner === 'player2') player2Count++;
        else if (entity.owner === 'shared') sharedCount++;
      });
    });

    return { player1Count, player2Count, sharedCount };
  });

  const setPlayer1Name = (name: string) => {
    player1.value.name = name;
  };

  const setPlayer2Name = (name: string) => {
    player2.value.name = name;
  };

  const setPlayer1Dream = (dreamText: string) => {
    player1.value.dreamText = dreamText;
  };

  const setPlayer2Dream = (dreamText: string) => {
    player2.value.dreamText = dreamText;
  };

  const setPlayer1Color = (color: string) => {
    player1.value.color = color;
  };

  const setPlayer2Color = (color: string) => {
    player2.value.color = color;
  };

  const setViewMode = (mode: ViewMode) => {
    currentViewMode.value = mode;
    if (currentDualTheater.value) {
      currentDualTheater.value.currentViewMode = mode;
    }
  };

  const setMergeStrategy = (strategy: MergeStrategy) => {
    generateOptions.value.mergeStrategy = strategy;
  };

  const setGenerateOptions = (options: Partial<DualDreamGenerateOptions>) => {
    generateOptions.value = { ...generateOptions.value, ...options };
  };

  const generateDualDream = async (): Promise<DualDreamMergeResult | null> => {
    if (!canGenerate.value) {
      error.value = '请输入双方的梦境描述';
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
      await new Promise(resolve => setTimeout(resolve, 800));

      const generator = createAnimationGenerator(currentRuleSet);
      const merger = createDualDreamMerger(currentRuleSet);

      const player1Scenes = generator.splitDreamIntoScenes(
        player1.value.dreamText,
        generateOptions.value.sceneCount,
        generateOptions.value.sceneCount,
        generateOptions.value.defaultDuration
      );

      const player2Scenes = generator.splitDreamIntoScenes(
        player2.value.dreamText,
        generateOptions.value.sceneCount,
        generateOptions.value.sceneCount,
        generateOptions.value.defaultDuration
      );

      const player1Theater = generator.createDreamTheater(
        player1.value.dreamText,
        player1Scenes,
        generateOptions.value.fps
      );

      const player2Theater = generator.createDreamTheater(
        player2.value.dreamText,
        player2Scenes,
        generateOptions.value.fps
      );

      const mergeResult = merger.mergeDreams(
        { ...player1.value, theater: player1Theater },
        { ...player2.value, theater: player2Theater },
        generateOptions.value
      );

      currentDualTheater.value = mergeResult.mergedTheater;
      currentViewMode.value = 'merged';

      return mergeResult;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '合梦生成失败，请重试';
      return null;
    } finally {
      isGenerating.value = false;
    }
  };

  const calculateSceneDiff = (sceneIndex: number): DualDreamDiff | null => {
    if (!currentDualTheater.value) return null;

    const scene = currentDualTheater.value.scenes[sceneIndex];
    if (!scene) return null;

    const player1Only = scene.player1Entities.filter(
      p1 => !scene.player2Entities.some(p2 => p2.type === p1.type && p2.name === p1.name)
    );

    const player2Only = scene.player2Entities.filter(
      p2 => !scene.player1Entities.some(p1 => p1.type === p2.type && p1.name === p2.name)
    );

    const shared = scene.entities.filter(e => e.owner === 'shared');

    return {
      sceneIndex,
      player1Only,
      player2Only,
      shared,
    };
  };

  const getAllScenesDiff = (): DualDreamDiff[] => {
    if (!currentDualTheater.value) return [];

    const diffs: DualDreamDiff[] = [];
    for (let i = 0; i < currentDualTheater.value.scenes.length; i++) {
      const diff = calculateSceneDiff(i);
      if (diff) diffs.push(diff);
    }
    return diffs;
  };

  const setCurrentScene = (index: number): void => {
    if (!currentDualTheater.value) return;
    const clampedIndex = Math.max(0, Math.min(index, currentDualTheater.value.scenes.length - 1));
    currentDualTheater.value.currentSceneIndex = clampedIndex;
  };

  const nextScene = (): void => {
    if (!currentDualTheater.value) return;
    const nextIndex = currentDualTheater.value.currentSceneIndex + 1;
    if (nextIndex < currentDualTheater.value.scenes.length) {
      currentDualTheater.value.currentSceneIndex = nextIndex;
    } else {
      currentDualTheater.value.currentSceneIndex = 0;
    }
  };

  const prevScene = (): void => {
    if (!currentDualTheater.value) return;
    const prevIndex = currentDualTheater.value.currentSceneIndex - 1;
    if (prevIndex >= 0) {
      currentDualTheater.value.currentSceneIndex = prevIndex;
    } else {
      currentDualTheater.value.currentSceneIndex = currentDualTheater.value.scenes.length - 1;
    }
  };

  const togglePlay = (): void => {
    if (!currentDualTheater.value) return;
    currentDualTheater.value.isPlaying = !currentDualTheater.value.isPlaying;
  };

  const setPlaying = (playing: boolean): void => {
    if (currentDualTheater.value) {
      currentDualTheater.value.isPlaying = playing;
    }
  };

  const setFps = (fps: number): void => {
    generateOptions.value.fps = Math.max(1, Math.min(fps, 30));
    if (currentDualTheater.value) {
      currentDualTheater.value.fps = generateOptions.value.fps;
    }
  };

  const clearDualDream = (): void => {
    currentDualTheater.value = null;
    error.value = null;
    isGenerating.value = false;
    currentViewMode.value = 'merged';
  };

  const resetInputs = (): void => {
    player1.value.dreamText = '';
    player2.value.dreamText = '';
    clearDualDream();
  };

  const saveToHistory = async (): Promise<boolean> => {
    if (!currentDualTheater.value) {
      error.value = '没有可保存的合梦作品';
      return false;
    }

    const theaterToSave = JSON.parse(JSON.stringify(currentDualTheater.value));
    theaterToSave.isPlaying = false;
    theaterToSave.currentViewMode = 'merged';

    const result = await historyStore.saveDualDreamToHistory(theaterToSave);
    return result;
  };

  const exportDualDream = (): string | null => {
    if (!currentDualTheater.value) return null;

    const exportData = {
      version: '1.0',
      type: 'dual-dream',
      exportedAt: Date.now(),
      dualTheater: currentDualTheater.value,
    };

    return JSON.stringify(exportData, null, 2);
  };

  const loadDualTheater = (theater: DualDreamTheater): void => {
    currentDualTheater.value = theater;
    player1.value = theater.player1;
    player2.value = theater.player2;
    generateOptions.value.fps = theater.fps;
    generateOptions.value.mergeStrategy = theater.mergeStrategy;
    currentViewMode.value = 'merged';
  };

  const getEntitiesByOwner = (owner: DreamOwner) => {
    if (!currentDualTheater.value) return [];

    const entities: { entity: any; sceneIndex: number }[] = [];
    currentDualTheater.value.scenes.forEach((scene, index) => {
      scene.entities.forEach(entity => {
        if (entity.owner === owner) {
          entities.push({ entity, sceneIndex: index });
        }
      });
    });
    return entities;
  };

  return {
    player1,
    player2,
    currentDualTheater,
    isGenerating,
    error,
    currentViewMode,
    showDiffModal,
    generateOptions,
    canGenerate,
    currentScene,
    sceneCount,
    currentSceneIndex,
    isPlaying,
    elementStats,
    setPlayer1Name,
    setPlayer2Name,
    setPlayer1Dream,
    setPlayer2Dream,
    setPlayer1Color,
    setPlayer2Color,
    setViewMode,
    setMergeStrategy,
    setGenerateOptions,
    generateDualDream,
    calculateSceneDiff,
    getAllScenesDiff,
    setCurrentScene,
    nextScene,
    prevScene,
    togglePlay,
    setPlaying,
    setFps,
    clearDualDream,
    resetInputs,
    saveToHistory,
    exportDualDream,
    loadDualTheater,
    getEntitiesByOwner,
  };
}, {
  persist: {
    key: 'pixel-dual-dream',
    paths: ['player1', 'player2', 'currentDualTheater', 'generateOptions', 'currentViewMode'],
  },
});
