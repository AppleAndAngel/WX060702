import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  BranchingEndingsTheater,
  EndingBranch,
  BranchingEndingsGenerateOptions,
  EndingTheme,
  EndingVariant,
  DreamTheater,
  DreamScene,
  AnimationFrame,
} from '@/types';
import { useRuleSetStore } from './ruleSet';
import { useDreamStore } from './dream';
import { useHistoryStore } from './history';
import { createAnimationGenerator } from '@/engine/animationGenerator';
import { generateId } from '@/utils/pixelUtils';
import { ENDING_THEMES } from '@/types/branchingEndings';

export const useBranchingEndingsStore = defineStore('branchingEndings', () => {
  const ruleSetStore = useRuleSetStore();
  const dreamStore = useDreamStore();
  const historyStore = useHistoryStore();

  const currentBranchingTheater = ref<BranchingEndingsTheater | null>(null);
  const isGenerating = ref(false);
  const error = ref<string | null>(null);
  const generatingEndingId = ref<string | null>(null);

  const generateOptions = ref<BranchingEndingsGenerateOptions>({
    endingCount: 3,
    baseSceneCount: 3,
    endingSceneCount: 2,
    defaultDuration: 3000,
    fps: 4,
    keyFrameCount: 3,
  });

  const selectedEnding = computed(() => {
    if (!currentBranchingTheater.value || !currentBranchingTheater.value.selectedEndingId) {
      return null;
    }
    return currentBranchingTheater.value.endings.find(
      e => e.id === currentBranchingTheater.value!.selectedEndingId
    ) || null;
  });

  const canGenerate = computed(() => {
    return dreamStore.currentDreamTheater !== null;
  });

  const allEndingsGenerated = computed(() => {
    if (!currentBranchingTheater.value) return false;
    return currentBranchingTheater.value.endings.every(e => !e.isGenerating && !e.error);
  });

  const setGenerateOptions = (options: Partial<BranchingEndingsGenerateOptions>) => {
    generateOptions.value = { ...generateOptions.value, ...options };
  };

  const generateEndingSummary = (theater: DreamTheater, theme: EndingTheme): string => {
    const sceneTitles = theater.scenes.map(s => s.title).join(' → ');
    return `${theme.name}结局：${theme.mood}。${sceneTitles}。${theater.scenes[theater.scenes.length - 1]?.description || ''}`;
  };

  const extractKeyFrames = (theater: DreamTheater, count: number): AnimationFrame[] => {
    const frames: AnimationFrame[] = [];
    const totalScenes = theater.scenes.length;
    
    if (totalScenes === 0) return frames;
    
    const step = Math.max(1, Math.floor(totalScenes / count));
    
    for (let i = 0; i < count && i < totalScenes; i++) {
      const sceneIndex = Math.min(i * step, totalScenes - 1);
      const scene = theater.scenes[sceneIndex];
      if (scene && scene.frame) {
        frames.push({
          ...scene.frame,
          id: generateId(),
          index: i,
          timestamp: Date.now(),
        });
      }
    }
    
    return frames;
  };

  const generateEndingTheater = async (
    baseTheater: DreamTheater,
    theme: EndingTheme,
    endingSceneCount: number,
    defaultDuration: number,
    fps: number
  ): Promise<DreamTheater> => {
    const currentRuleSet = ruleSetStore.currentRuleSet;
    if (!currentRuleSet) {
      throw new Error('请先选择规则集');
    }

    const generator = createAnimationGenerator(currentRuleSet);
    
    const baseScenes = baseTheater.scenes.slice(0, generateOptions.value.baseSceneCount);
    
    const endingScenes: DreamScene[] = [];
    const originalDream = baseTheater.originalDream;
    
    for (let i = 0; i < endingSceneCount; i++) {
      const progress = (i + 1) / endingSceneCount;
      const actNumber = baseScenes.length + i + 1;
      
      let scenePrompt = '';
      if (i === 0) {
        scenePrompt = `${originalDream}，${theme.promptModifier}，故事走向${theme.name}的结局，过渡场景`;
      } else if (i === endingSceneCount - 1) {
        scenePrompt = `${originalDream}，${theme.promptModifier}，${theme.name}结局的最终章，高潮与收尾`;
      } else {
        const intensity = Math.round(progress * 100);
        scenePrompt = `${originalDream}，${theme.promptModifier}，结局发展中，${theme.mood}的氛围，紧张度${intensity}%`;
      }
      
      const scene = generator.generateDreamScene(scenePrompt, actNumber, defaultDuration);
      endingScenes.push(scene);
    }
    
    const allScenes = [...baseScenes, ...endingScenes];
    
    const endingTheater = generator.createDreamTheater(
      `${originalDream} [${theme.name}结局]`,
      allScenes,
      fps
    );
    
    endingTheater.id = generateId();
    endingTheater.title = `${baseTheater.title} - ${theme.name}结局`;
    endingTheater.originalDream = originalDream;
    
    return endingTheater;
  };

  const generateBranchingEndings = async (): Promise<BranchingEndingsTheater | null> => {
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

      const baseTheater = JSON.parse(JSON.stringify(dreamStore.currentDreamTheater));
      
      const endings: EndingBranch[] = [];
      
      for (const theme of ENDING_THEMES) {
        const endingId = generateId();
        
        const endingBranch: EndingBranch = {
          id: endingId,
          variant: theme.id,
          theme,
          theater: {} as DreamTheater,
          keyFrames: [],
          summary: '',
          isSelected: false,
          isGenerating: true,
          generationProgress: 0,
        };
        
        endings.push(endingBranch);
      }
      
      const branchingTheater: BranchingEndingsTheater = {
        id: generateId(),
        originalDream: baseTheater.originalDream,
        title: `${baseTheater.title} - 多结局版本`,
        baseTheater,
        endings,
        selectedEndingId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isBranchingEndings: true,
      };
      
      currentBranchingTheater.value = branchingTheater;
      
      for (let i = 0; i < endings.length; i++) {
        const ending = endings[i];
        generatingEndingId.value = ending.id;
        
        try {
          ending.generationProgress = 20;
          await new Promise(resolve => setTimeout(resolve, 300));
          
          ending.generationProgress = 50;
          const endingTheater = await generateEndingTheater(
            baseTheater,
            ending.theme,
            generateOptions.value.endingSceneCount,
            generateOptions.value.defaultDuration,
            generateOptions.value.fps
          );
          
          ending.generationProgress = 80;
          ending.theater = endingTheater;
          ending.keyFrames = extractKeyFrames(endingTheater, generateOptions.value.keyFrameCount);
          ending.summary = generateEndingSummary(endingTheater, ending.theme);
          
          ending.generationProgress = 100;
          ending.isGenerating = false;
        } catch (e) {
          ending.error = e instanceof Error ? e.message : '生成失败';
          ending.isGenerating = false;
        }
      }
      
      generatingEndingId.value = null;
      currentBranchingTheater.value.updatedAt = Date.now();
      
      return branchingTheater;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '生成多结局失败，请重试';
      return null;
    } finally {
      isGenerating.value = false;
      generatingEndingId.value = null;
    }
  };

  const selectEnding = (endingId: string): boolean => {
    if (!currentBranchingTheater.value) return false;
    
    const ending = currentBranchingTheater.value.endings.find(e => e.id === endingId);
    if (!ending || ending.isGenerating || ending.error) return false;
    
    currentBranchingTheater.value.endings.forEach(e => {
      e.isSelected = e.id === endingId;
    });
    currentBranchingTheater.value.selectedEndingId = endingId;
    currentBranchingTheater.value.updatedAt = Date.now();
    
    return true;
  };

  const loadSelectedEndingToDream = (): boolean => {
    if (!selectedEnding.value) return false;
    
    const theater = JSON.parse(JSON.stringify(selectedEnding.value.theater));
    theater.isPlaying = false;
    theater.currentSceneIndex = 0;
    dreamStore.loadTheater(theater);
    
    return true;
  };

  const regenerateEnding = async (endingId: string): Promise<boolean> => {
    if (!currentBranchingTheater.value) return false;
    
    const ending = currentBranchingTheater.value.endings.find(e => e.id === endingId);
    if (!ending) return false;
    
    const currentRuleSet = ruleSetStore.currentRuleSet;
    if (!currentRuleSet) return false;
    
    ending.isGenerating = true;
    ending.generationProgress = 0;
    ending.error = undefined;
    
    try {
      await new Promise(resolve => setTimeout(resolve, 200));
      
      ending.generationProgress = 30;
      const endingTheater = await generateEndingTheater(
        currentBranchingTheater.value.baseTheater,
        ending.theme,
        generateOptions.value.endingSceneCount,
        generateOptions.value.defaultDuration,
        generateOptions.value.fps
      );
      
      ending.generationProgress = 70;
      ending.theater = endingTheater;
      ending.keyFrames = extractKeyFrames(endingTheater, generateOptions.value.keyFrameCount);
      ending.summary = generateEndingSummary(endingTheater, ending.theme);
      
      ending.generationProgress = 100;
      ending.isGenerating = false;
      currentBranchingTheater.value.updatedAt = Date.now();
      
      if (currentBranchingTheater.value.selectedEndingId === endingId) {
        ending.isSelected = true;
      }
      
      return true;
    } catch (e) {
      ending.error = e instanceof Error ? e.message : '重新生成失败';
      ending.isGenerating = false;
      return false;
    }
  };

  const clearBranchingEndings = (): void => {
    currentBranchingTheater.value = null;
    error.value = null;
    isGenerating.value = false;
    generatingEndingId.value = null;
  };

  const saveToHistory = async (): Promise<boolean> => {
    if (!currentBranchingTheater.value) {
      error.value = '没有可保存的多结局作品';
      return false;
    }

    const theaterToSave = JSON.parse(JSON.stringify(currentBranchingTheater.value));
    theaterToSave.selectedEndingId = currentBranchingTheater.value.selectedEndingId;
    
    theaterToSave.endings.forEach(ending => {
      ending.theater.isPlaying = false;
    });
    theaterToSave.baseTheater.isPlaying = false;

    const result = await historyStore.saveBranchingEndingsToHistory(theaterToSave);
    return result;
  };

  const loadBranchingTheater = (theater: BranchingEndingsTheater): void => {
    currentBranchingTheater.value = theater;
    generateOptions.value.fps = theater.baseTheater.fps;
  };

  const exportBranchingEndings = (): string | null => {
    if (!currentBranchingTheater.value) return null;

    const exportData = {
      version: '1.0',
      type: 'branching-endings',
      exportedAt: Date.now(),
      branchingTheater: currentBranchingTheater.value,
    };

    return JSON.stringify(exportData, null, 2);
  };

  return {
    currentBranchingTheater,
    isGenerating,
    error,
    generatingEndingId,
    generateOptions,
    selectedEnding,
    canGenerate,
    allEndingsGenerated,
    setGenerateOptions,
    generateBranchingEndings,
    selectEnding,
    loadSelectedEndingToDream,
    regenerateEnding,
    clearBranchingEndings,
    saveToHistory,
    loadBranchingTheater,
    exportBranchingEndings,
  };
}, {
  persist: {
    key: 'pixel-branching-endings',
    paths: ['currentBranchingTheater', 'generateOptions'],
  },
});
