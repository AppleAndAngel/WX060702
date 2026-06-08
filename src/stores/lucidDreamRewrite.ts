import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type {
  LucidDreamRewriteTheater,
  RewriteBranch,
  LucidDreamRewriteGenerateOptions,
  DreamTheater,
  DreamScene,
  AnimationFrame,
} from '@/types';
import { useRuleSetStore } from './ruleSet';
import { useDreamStore } from './dream';
import { useHistoryStore } from './history';
import { createAnimationGenerator } from '@/engine/animationGenerator';
import { generateId } from '@/utils/pixelUtils';

export const useLucidDreamRewriteStore = defineStore('lucidDreamRewrite', () => {
  const ruleSetStore = useRuleSetStore();
  const dreamStore = useDreamStore();
  const historyStore = useHistoryStore();

  const currentRewriteTheater = ref<LucidDreamRewriteTheater | null>(null);
  const isGenerating = ref(false);
  const isGeneratingBranch = ref(false);
  const error = ref<string | null>(null);
  const generatingBranchId = ref<string | null>(null);

  const generateOptions = ref<LucidDreamRewriteGenerateOptions>({
    rewriteSceneCount: 3,
    defaultDuration: 3000,
    fps: 4,
    keyFrameCount: 3,
  });

  const selectedBranch = computed(() => {
    if (!currentRewriteTheater.value || !currentRewriteTheater.value.selectedBranchId) {
      return null;
    }
    return currentRewriteTheater.value.branches.find(
      b => b.id === currentRewriteTheater.value!.selectedBranchId
    ) || null;
  });

  const canGenerate = computed(() => {
    return dreamStore.currentDreamTheater !== null;
  });

  const activePreviewTheater = computed(() => {
    if (!currentRewriteTheater.value) return null;
    
    if (currentRewriteTheater.value.previewMode === 'original') {
      return currentRewriteTheater.value.originalTheater;
    }
    
    if (selectedBranch.value) {
      return selectedBranch.value.fullTheater;
    }
    
    return currentRewriteTheater.value.originalTheater;
  });

  const setGenerateOptions = (options: Partial<LucidDreamRewriteGenerateOptions>) => {
    generateOptions.value = { ...generateOptions.value, ...options };
  };

  const generateBranchSummary = (branch: RewriteBranch): string => {
    const sceneTitles = branch.rewrittenScenes.map(s => s.title).join(' → ');
    return `在第${branch.branchPointSceneIndex + 1}幕「${branch.newAction}」→「${branch.newOutcome}」。改写剧情：${sceneTitles}。`;
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

  const initializeRewriteTheater = (): LucidDreamRewriteTheater | null => {
    if (!dreamStore.currentDreamTheater) {
      error.value = '请先生成基础梦境剧场';
      return null;
    }

    const originalTheater = JSON.parse(JSON.stringify(dreamStore.currentDreamTheater));

    const rewriteTheater: LucidDreamRewriteTheater = {
      id: generateId(),
      originalDream: originalTheater.originalDream,
      title: `${originalTheater.title} - 清醒梦改写版`,
      originalTheater,
      branches: [],
      selectedBranchId: null,
      previewMode: 'original',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isLucidDreamRewrite: true,
    };

    currentRewriteTheater.value = rewriteTheater;
    return rewriteTheater;
  };

  const generateRewriteBranch = async (
    branchPointSceneIndex: number,
    newAction: string,
    newOutcome: string,
    branchName?: string
  ): Promise<RewriteBranch | null> => {
    if (!currentRewriteTheater.value) {
      if (!initializeRewriteTheater()) {
        return null;
      }
    }

    const currentRuleSet = ruleSetStore.currentRuleSet;
    if (!currentRuleSet) {
      error.value = '请先选择规则集';
      return null;
    }

    if (branchPointSceneIndex < 0 || 
        branchPointSceneIndex >= currentRewriteTheater.value!.originalTheater.scenes.length) {
      error.value = '无效的分支点场景索引';
      return null;
    }

    if (!newAction.trim() || !newOutcome.trim()) {
      error.value = '请输入新的行动和结果';
      return null;
    }

    isGeneratingBranch.value = true;
    error.value = null;

    const branchId = generateId();
    generatingBranchId.value = branchId;

    const branch: RewriteBranch = {
      id: branchId,
      name: branchName || `改写分支 ${currentRewriteTheater.value!.branches.length + 1}`,
      branchPointSceneIndex,
      newAction: newAction.trim(),
      newOutcome: newOutcome.trim(),
      rewrittenScenes: [],
      fullTheater: {} as DreamTheater,
      keyFrames: [],
      summary: '',
      isSelected: false,
      isGenerating: true,
      generationProgress: 0,
      createdAt: Date.now(),
    };

    currentRewriteTheater.value!.branches.push(branch);

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      branch.generationProgress = 20;
      await new Promise(resolve => setTimeout(resolve, 300));

      const generator = createAnimationGenerator(currentRuleSet);

      branch.generationProgress = 40;
      const rewrittenScenes = generator.generateRewriteScenes(
        currentRewriteTheater.value!.originalTheater,
        branchPointSceneIndex,
        newAction,
        newOutcome,
        generateOptions.value.rewriteSceneCount,
        generateOptions.value.defaultDuration
      );
      branch.rewrittenScenes = rewrittenScenes;

      branch.generationProgress = 70;
      const fullTheater = generator.createRewrittenTheater(
        currentRewriteTheater.value!.originalTheater,
        branchPointSceneIndex,
        rewrittenScenes,
        newAction,
        newOutcome,
        generateOptions.value.fps
      );
      branch.fullTheater = fullTheater;

      branch.generationProgress = 90;
      branch.keyFrames = extractKeyFrames(fullTheater, generateOptions.value.keyFrameCount);
      branch.summary = generateBranchSummary(branch);

      branch.generationProgress = 100;
      branch.isGenerating = false;

      currentRewriteTheater.value!.updatedAt = Date.now();

      return branch;
    } catch (e) {
      branch.error = e instanceof Error ? e.message : '生成改写分支失败';
      branch.isGenerating = false;
      error.value = branch.error;
      return null;
    } finally {
      isGeneratingBranch.value = false;
      generatingBranchId.value = null;
    }
  };

  const selectBranch = (branchId: string | null): boolean => {
    if (!currentRewriteTheater.value) return false;

    if (branchId === null) {
      currentRewriteTheater.value.selectedBranchId = null;
      currentRewriteTheater.value.previewMode = 'original';
      currentRewriteTheater.value.branches.forEach(b => {
        b.isSelected = false;
      });
      return true;
    }

    const branch = currentRewriteTheater.value.branches.find(b => b.id === branchId);
    if (!branch || branch.isGenerating || branch.error) return false;

    currentRewriteTheater.value.branches.forEach(b => {
      b.isSelected = b.id === branchId;
    });
    currentRewriteTheater.value.selectedBranchId = branchId;
    currentRewriteTheater.value.previewMode = 'rewritten';
    currentRewriteTheater.value.updatedAt = Date.now();

    return true;
  };

  const setPreviewMode = (mode: 'original' | 'rewritten'): boolean => {
    if (!currentRewriteTheater.value) return false;
    
    if (mode === 'rewritten' && !selectedBranch.value) {
      error.value = '请先选择一个改写分支';
      return false;
    }

    currentRewriteTheater.value.previewMode = mode;
    return true;
  };

  const togglePreviewMode = (): boolean => {
    if (!currentRewriteTheater.value) return false;
    
    const nextMode = currentRewriteTheater.value.previewMode === 'original' ? 'rewritten' : 'original';
    return setPreviewMode(nextMode);
  };

  const loadSelectedBranchToDream = (): boolean => {
    if (!selectedBranch.value) return false;
    
    const theater = JSON.parse(JSON.stringify(selectedBranch.value.fullTheater));
    theater.isPlaying = false;
    theater.currentSceneIndex = 0;
    dreamStore.loadTheater(theater);
    
    return true;
  };

  const loadOriginalToDream = (): boolean => {
    if (!currentRewriteTheater.value) return false;
    
    const theater = JSON.parse(JSON.stringify(currentRewriteTheater.value.originalTheater));
    theater.isPlaying = false;
    theater.currentSceneIndex = 0;
    dreamStore.loadTheater(theater);
    
    return true;
  };

  const regenerateBranch = async (branchId: string): Promise<boolean> => {
    if (!currentRewriteTheater.value) return false;
    
    const branch = currentRewriteTheater.value.branches.find(b => b.id === branchId);
    if (!branch) return false;
    
    const branchIndex = currentRewriteTheater.value.branches.findIndex(b => b.id === branchId);
    
    const result = await generateRewriteBranch(
      branch.branchPointSceneIndex,
      branch.newAction,
      branch.newOutcome,
      branch.name
    );
    
    if (result && branchIndex !== -1) {
      currentRewriteTheater.value.branches[branchIndex] = result;
      
      if (currentRewriteTheater.value.selectedBranchId === branchId) {
        result.isSelected = true;
      }
      
      return true;
    }
    
    return false;
  };

  const deleteBranch = (branchId: string): boolean => {
    if (!currentRewriteTheater.value) return false;
    
    const index = currentRewriteTheater.value.branches.findIndex(b => b.id === branchId);
    if (index === -1) return false;
    
    currentRewriteTheater.value.branches.splice(index, 1);
    
    if (currentRewriteTheater.value.selectedBranchId === branchId) {
      currentRewriteTheater.value.selectedBranchId = null;
      currentRewriteTheater.value.previewMode = 'original';
    }
    
    currentRewriteTheater.value.updatedAt = Date.now();
    return true;
  };

  const updateBranchName = (branchId: string, name: string): boolean => {
    if (!currentRewriteTheater.value) return false;
    
    const branch = currentRewriteTheater.value.branches.find(b => b.id === branchId);
    if (!branch) return false;
    
    branch.name = name;
    currentRewriteTheater.value.updatedAt = Date.now();
    return true;
  };

  const clearRewriteTheater = (): void => {
    currentRewriteTheater.value = null;
    error.value = null;
    isGenerating.value = false;
    isGeneratingBranch.value = false;
    generatingBranchId.value = null;
  };

  const saveToHistory = async (): Promise<boolean> => {
    if (!currentRewriteTheater.value) {
      error.value = '没有可保存的清醒梦改写作品';
      return false;
    }

    const theaterToSave = JSON.parse(JSON.stringify(currentRewriteTheater.value));
    theaterToSave.originalTheater.isPlaying = false;
    theaterToSave.branches.forEach(branch => {
      branch.fullTheater.isPlaying = false;
    });

    const result = await historyStore.saveLucidDreamRewriteToHistory(theaterToSave);
    return result;
  };

  const loadRewriteTheater = (theater: LucidDreamRewriteTheater): void => {
    currentRewriteTheater.value = theater;
    generateOptions.value.fps = theater.originalTheater.fps;
  };

  const exportLucidDreamRewrite = (): string | null => {
    if (!currentRewriteTheater.value) return null;

    const exportData = {
      version: '1.0',
      type: 'lucid-dream-rewrite',
      exportedAt: Date.now(),
      rewriteTheater: currentRewriteTheater.value,
    };

    return JSON.stringify(exportData, null, 2);
  };

  return {
    currentRewriteTheater,
    isGenerating,
    isGeneratingBranch,
    error,
    generatingBranchId,
    generateOptions,
    selectedBranch,
    canGenerate,
    activePreviewTheater,
    setGenerateOptions,
    initializeRewriteTheater,
    generateRewriteBranch,
    selectBranch,
    setPreviewMode,
    togglePreviewMode,
    loadSelectedBranchToDream,
    loadOriginalToDream,
    regenerateBranch,
    deleteBranch,
    updateBranchName,
    clearRewriteTheater,
    saveToHistory,
    loadRewriteTheater,
    exportLucidDreamRewrite,
  };
}, {
  persist: {
    key: 'pixel-lucid-dream-rewrite',
    paths: ['currentRewriteTheater', 'generateOptions'],
  },
});
