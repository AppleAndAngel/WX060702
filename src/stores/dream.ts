import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { DreamTheater, DreamScene, DreamGenerateOptions } from '@/types';
import { useRuleSetStore } from './ruleSet';
import { createAnimationGenerator } from '@/engine/animationGenerator';

export const useDreamStore = defineStore('dream', () => {
  const ruleSetStore = useRuleSetStore();

  const currentDreamTheater = ref<DreamTheater | null>(null);
  const isGenerating = ref(false);
  const error = ref<string | null>(null);
  const selectedSprite = ref<string | null>(null);
  const generateOptions = ref<DreamGenerateOptions>({
    minActs: 3,
    maxActs: 5,
    defaultActs: 4,
    defaultDuration: 3000,
    fps: 4,
  });

  const currentScene = computed(() => {
    if (!currentDreamTheater.value) return null;
    return currentDreamTheater.value.scenes[currentDreamTheater.value.currentSceneIndex];
  });

  const sceneCount = computed(() => {
    return currentDreamTheater.value?.scenes.length || 0;
  });

  const currentSceneIndex = computed(() => {
    return currentDreamTheater.value?.currentSceneIndex || 0;
  });

  const totalDuration = computed(() => {
    return currentDreamTheater.value?.totalDuration || 0;
  });

  const isPlaying = computed(() => {
    return currentDreamTheater.value?.isPlaying || false;
  });

  const setGenerateOptions = (options: Partial<DreamGenerateOptions>) => {
    generateOptions.value = { ...generateOptions.value, ...options };
  };

  const generateDream = async (dreamText: string, sceneCount?: number): Promise<DreamTheater | null> => {
    if (!dreamText.trim()) {
      error.value = '请输入梦境描述';
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

      const generator = createAnimationGenerator(currentRuleSet);
      const numScenes = sceneCount || generateOptions.value.defaultActs || 4;

      const scenes = generator.splitDreamIntoScenes(
        dreamText,
        numScenes,
        numScenes,
        generateOptions.value.defaultDuration
      );

      const theater = generator.createDreamTheater(
        dreamText,
        scenes,
        generateOptions.value.fps
      );

      currentDreamTheater.value = theater;

      return theater;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '生成失败，请重试';
      return null;
    } finally {
      isGenerating.value = false;
    }
  };

  const regenerateScene = async (sceneId: string, newPrompt?: string): Promise<boolean> => {
    if (!currentDreamTheater.value) return false;

    const sceneIndex = currentDreamTheater.value.scenes.findIndex(s => s.id === sceneId);
    if (sceneIndex === -1) return false;

    const currentRuleSet = ruleSetStore.currentRuleSet;
    if (!currentRuleSet) return false;

    const scene = currentDreamTheater.value.scenes[sceneIndex];
    scene.isGenerating = true;
    scene.error = undefined;

    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const generator = createAnimationGenerator(currentRuleSet);
      const newScene = generator.regenerateScene(scene, newPrompt);

      currentDreamTheater.value.scenes[sceneIndex] = newScene;
      currentDreamTheater.value.updatedAt = Date.now();
      updateTotalDuration();
      regenerateEncyclopedia();

      return true;
    } catch (e) {
      scene.error = e instanceof Error ? e.message : '重新生成失败';
      return false;
    } finally {
      scene.isGenerating = false;
    }
  };

  const regenerateEncyclopedia = (): void => {
    if (!currentDreamTheater.value) return;
    const currentRuleSet = ruleSetStore.currentRuleSet;
    if (!currentRuleSet) return;

    const generator = createAnimationGenerator(currentRuleSet);
    generator.regenerateEncyclopedia(currentDreamTheater.value);
  };

  const setCurrentScene = (index: number): void => {
    if (!currentDreamTheater.value) return;
    const clampedIndex = Math.max(0, Math.min(index, currentDreamTheater.value.scenes.length - 1));
    currentDreamTheater.value.currentSceneIndex = clampedIndex;
  };

  const nextScene = (): void => {
    if (!currentDreamTheater.value) return;
    const nextIndex = currentDreamTheater.value.currentSceneIndex + 1;
    if (nextIndex < currentDreamTheater.value.scenes.length) {
      currentDreamTheater.value.currentSceneIndex = nextIndex;
    } else {
      currentDreamTheater.value.currentSceneIndex = 0;
    }
  };

  const prevScene = (): void => {
    if (!currentDreamTheater.value) return;
    const prevIndex = currentDreamTheater.value.currentSceneIndex - 1;
    if (prevIndex >= 0) {
      currentDreamTheater.value.currentSceneIndex = prevIndex;
    } else {
      currentDreamTheater.value.currentSceneIndex = currentDreamTheater.value.scenes.length - 1;
    }
  };

  const togglePlay = (): void => {
    if (!currentDreamTheater.value) return;
    currentDreamTheater.value.isPlaying = !currentDreamTheater.value.isPlaying;
  };

  const setPlaying = (playing: boolean): void => {
    if (currentDreamTheater.value) {
      currentDreamTheater.value.isPlaying = playing;
    }
  };

  const setSceneDuration = (sceneId: string, duration: number): void => {
    if (!currentDreamTheater.value) return;
    const scene = currentDreamTheater.value.scenes.find(s => s.id === sceneId);
    if (scene) {
      scene.duration = Math.max(500, Math.min(duration, 10000));
      updateTotalDuration();
    }
  };

  const updateTotalDuration = (): void => {
    if (!currentDreamTheater.value) return;
    currentDreamTheater.value.totalDuration = currentDreamTheater.value.scenes.reduce(
      (sum, scene) => sum + scene.duration,
      0
    );
  };

  const updateSceneTitle = (sceneId: string, title: string): void => {
    if (!currentDreamTheater.value) return;
    const scene = currentDreamTheater.value.scenes.find(s => s.id === sceneId);
    if (scene) {
      scene.title = title;
      currentDreamTheater.value.updatedAt = Date.now();
    }
  };

  const updateSceneDescription = (sceneId: string, description: string): void => {
    if (!currentDreamTheater.value) return;
    const scene = currentDreamTheater.value.scenes.find(s => s.id === sceneId);
    if (scene) {
      scene.description = description;
      currentDreamTheater.value.updatedAt = Date.now();
    }
  };

  const updateTheaterTitle = (title: string): void => {
    if (currentDreamTheater.value) {
      currentDreamTheater.value.title = title;
      currentDreamTheater.value.updatedAt = Date.now();
    }
  };

  const addScene = (): DreamScene | null => {
    if (!currentDreamTheater.value) return null;
    if (currentDreamTheater.value.scenes.length >= generateOptions.value.maxActs) {
      return null;
    }

    const currentRuleSet = ruleSetStore.currentRuleSet;
    if (!currentRuleSet) return null;

    const generator = createAnimationGenerator(currentRuleSet);
    const newActNumber = currentDreamTheater.value.scenes.length + 1;
    const newScene = generator.generateDreamScene(
      currentDreamTheater.value.originalDream,
      newActNumber,
      generateOptions.value.defaultDuration
    );

    currentDreamTheater.value.scenes.push(newScene);
    currentDreamTheater.value.updatedAt = Date.now();
    updateTotalDuration();
    regenerateEncyclopedia();

    return newScene;
  };

  const removeScene = (sceneId: string): boolean => {
    if (!currentDreamTheater.value) return false;
    if (currentDreamTheater.value.scenes.length <= generateOptions.value.minActs) {
      return false;
    }

    const index = currentDreamTheater.value.scenes.findIndex(s => s.id === sceneId);
    if (index === -1) return false;

    currentDreamTheater.value.scenes.splice(index, 1);

    currentDreamTheater.value.scenes.forEach((scene, i) => {
      scene.actNumber = i + 1;
    });

    if (currentDreamTheater.value.currentSceneIndex >= currentDreamTheater.value.scenes.length) {
      currentDreamTheater.value.currentSceneIndex = currentDreamTheater.value.scenes.length - 1;
    }

    currentDreamTheater.value.updatedAt = Date.now();
    updateTotalDuration();
    regenerateEncyclopedia();

    return true;
  };

  const duplicateScene = (sceneId: string): DreamScene | null => {
    if (!currentDreamTheater.value) return null;
    if (currentDreamTheater.value.scenes.length >= generateOptions.value.maxActs) {
      return null;
    }

    const index = currentDreamTheater.value.scenes.findIndex(s => s.id === sceneId);
    if (index === -1) return null;

    const originalScene = currentDreamTheater.value.scenes[index];
    const newScene: DreamScene = {
      ...originalScene,
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      actNumber: currentDreamTheater.value.scenes.length + 1,
      isGenerating: false,
    };

    currentDreamTheater.value.scenes.push(newScene);
    currentDreamTheater.value.updatedAt = Date.now();
    updateTotalDuration();
    regenerateEncyclopedia();

    return newScene;
  };

  const moveScene = (fromIndex: number, toIndex: number): boolean => {
    if (!currentDreamTheater.value) return false;
    const scenes = currentDreamTheater.value.scenes;

    if (fromIndex < 0 || fromIndex >= scenes.length) return false;
    if (toIndex < 0 || toIndex >= scenes.length) return false;
    if (fromIndex === toIndex) return true;

    const [removed] = scenes.splice(fromIndex, 1);
    scenes.splice(toIndex, 0, removed);

    scenes.forEach((scene, i) => {
      scene.actNumber = i + 1;
    });

    if (currentDreamTheater.value.currentSceneIndex === fromIndex) {
      currentDreamTheater.value.currentSceneIndex = toIndex;
    } else if (fromIndex < currentDreamTheater.value.currentSceneIndex && toIndex >= currentDreamTheater.value.currentSceneIndex) {
      currentDreamTheater.value.currentSceneIndex--;
    } else if (fromIndex > currentDreamTheater.value.currentSceneIndex && toIndex <= currentDreamTheater.value.currentSceneIndex) {
      currentDreamTheater.value.currentSceneIndex++;
    }

    currentDreamTheater.value.updatedAt = Date.now();
    regenerateEncyclopedia();

    return true;
  };

  const setFps = (fps: number): void => {
    generateOptions.value.fps = Math.max(1, Math.min(fps, 30));
    if (currentDreamTheater.value) {
      currentDreamTheater.value.fps = generateOptions.value.fps;
    }
  };

  const clearDream = (): void => {
    currentDreamTheater.value = null;
    error.value = null;
    isGenerating.value = false;
  };

  const loadTheater = (theater: DreamTheater): void => {
    currentDreamTheater.value = theater;
    generateOptions.value.fps = theater.fps;
  };

  return {
    currentDreamTheater,
    isGenerating,
    error,
    selectedSprite,
    generateOptions,
    currentScene,
    sceneCount,
    currentSceneIndex,
    totalDuration,
    isPlaying,
    setGenerateOptions,
    generateDream,
    regenerateScene,
    setCurrentScene,
    nextScene,
    prevScene,
    togglePlay,
    setPlaying,
    setSceneDuration,
    updateSceneTitle,
    updateSceneDescription,
    updateTheaterTitle,
    addScene,
    removeScene,
    duplicateScene,
    moveScene,
    setFps,
    clearDream,
    loadTheater,
    regenerateEncyclopedia,
  };
}, {
  persist: {
    key: 'pixel-dream-theater',
    paths: ['currentDreamTheater', 'generateOptions'],
  },
});
