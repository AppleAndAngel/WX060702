import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { DreamTheater, DualDreamTheater, BranchingEndingsTheater, PurifiedDreamTheater, LucidDreamRewriteTheater } from '@/types';
import { useDreamStore } from './dream';
import { generateId } from '@/utils/pixelUtils';

export interface HistoryItem {
  id: string;
  theater: DreamTheater;
  savedAt: number;
  thumbnail: string;
  isDualDream?: boolean;
  isBranchingEndings?: boolean;
  isPurified?: boolean;
}

export interface DualDreamHistoryItem extends HistoryItem {
  theater: DualDreamTheater;
  isDualDream: true;
}

export interface BranchingEndingsHistoryItem extends HistoryItem {
  theater: BranchingEndingsTheater;
  isBranchingEndings: true;
  selectedEndingThumbnail?: string;
}

export interface PurifiedDreamHistoryItem extends HistoryItem {
  theater: PurifiedDreamTheater;
  isPurified: true;
  originalThumbnail?: string;
}

export interface LucidDreamRewriteHistoryItem extends HistoryItem {
  theater: LucidDreamRewriteTheater;
  isLucidDreamRewrite: true;
  originalThumbnail?: string;
  rewrittenThumbnail?: string;
}

export const useHistoryStore = defineStore('history', () => {
  const dreamStore = useDreamStore();

  const history = ref<HistoryItem[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const historyCount = computed(() => history.value.length);

  const sortedHistory = computed(() => {
    return [...history.value].sort((a, b) => b.savedAt - a.savedAt);
  });

  const generateThumbnail = (theater: DreamTheater): string => {
    if (theater.scenes.length === 0) return '';

    const firstScene = theater.scenes[0];
    const { pixelData } = firstScene.frame;

    const canvas = document.createElement('canvas');
    const scale = 4;
    canvas.width = pixelData.width * scale;
    canvas.height = pixelData.height * scale;
    const ctx = canvas.getContext('2d');

    if (!ctx) return '';

    for (let y = 0; y < pixelData.height; y++) {
      for (let x = 0; x < pixelData.width; x++) {
        ctx.fillStyle = pixelData.pixels[y][x];
        ctx.fillRect(x * scale, y * scale, scale, scale);
      }
    }

    return canvas.toDataURL('image/png');
  };

  const saveToHistory = async (): Promise<boolean> => {
    if (!dreamStore.currentDreamTheater) {
      error.value = '没有可保存的梦境剧场';
      return false;
    }

    isLoading.value = true;
    error.value = null;

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      const theaterToSave = JSON.parse(JSON.stringify(dreamStore.currentDreamTheater));
      theaterToSave.isPlaying = false;

      const existingIndex = history.value.findIndex(
        h => h.theater.id === theaterToSave.id
      );

      const thumbnail = generateThumbnail(theaterToSave);

      if (existingIndex !== -1) {
        history.value[existingIndex] = {
          id: generateId(),
          theater: theaterToSave,
          savedAt: Date.now(),
          thumbnail,
        };
      } else {
        history.value.unshift({
          id: generateId(),
          theater: theaterToSave,
          savedAt: Date.now(),
          thumbnail,
        });
      }

      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '保存失败';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const loadFromHistory = (historyId: string): boolean => {
    const item = history.value.find(h => h.id === historyId);
    if (!item) {
      error.value = '未找到该历史记录';
      return false;
    }

    try {
      const theater = JSON.parse(JSON.stringify(item.theater));
      theater.isPlaying = false;
      theater.currentSceneIndex = 0;
      dreamStore.loadTheater(theater);
      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败';
      return false;
    }
  };

  const removeFromHistory = (historyId: string): boolean => {
    const index = history.value.findIndex(h => h.id === historyId);
    if (index === -1) return false;

    history.value.splice(index, 1);
    return true;
  };

  const clearHistory = (): void => {
    history.value = [];
  };

  const exportHistoryItem = (historyId: string): string | null => {
    const item = history.value.find(h => h.id === historyId);
    if (!item) return null;

    const exportData = {
      version: '1.0',
      exportedAt: Date.now(),
      theater: item.theater,
    };

    return JSON.stringify(exportData, null, 2);
  };

  const importHistoryItem = async (file: File): Promise<DreamTheater | null> => {
    isLoading.value = true;
    error.value = null;

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.theater) {
        throw new Error('无效的文件格式');
      }

      const theater = data.theater as DreamTheater;

      const thumbnail = generateThumbnail(theater);

      history.value.unshift({
        id: generateId(),
        theater,
        savedAt: Date.now(),
        thumbnail,
      });

      return theater;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '导入失败';
      return null;
    } finally {
      isLoading.value = false;
    }
  };

  const getHistoryItem = (historyId: string): HistoryItem | undefined => {
    return history.value.find(h => h.id === historyId);
  };

  const searchHistory = (query: string): HistoryItem[] => {
    const lowerQuery = query.toLowerCase();
    return sortedHistory.value.filter(item =>
      item.theater.title.toLowerCase().includes(lowerQuery) ||
      item.theater.originalDream.toLowerCase().includes(lowerQuery) ||
      item.theater.scenes.some(
        s => s.title.toLowerCase().includes(lowerQuery) ||
             s.description.toLowerCase().includes(lowerQuery)
      )
    );
  };

  const saveDualDreamToHistory = async (dualTheater: DualDreamTheater): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      const theaterToSave = JSON.parse(JSON.stringify(dualTheater));
      theaterToSave.isPlaying = false;

      const thumbnail = generateThumbnail(theaterToSave);

      const existingIndex = history.value.findIndex(
        h => h.theater.id === theaterToSave.id
      );

      const historyItem: DualDreamHistoryItem = {
        id: generateId(),
        theater: theaterToSave,
        savedAt: Date.now(),
        thumbnail,
        isDualDream: true,
      };

      if (existingIndex !== -1) {
        history.value[existingIndex] = historyItem;
      } else {
        history.value.unshift(historyItem);
      }

      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '保存失败';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const loadDualDreamFromHistory = (historyId: string): DualDreamTheater | null => {
    const item = history.value.find(h => h.id === historyId);
    if (!item || !item.isDualDream) {
      error.value = '未找到该双人合梦记录';
      return null;
    }

    try {
      const theater = JSON.parse(JSON.stringify(item.theater)) as DualDreamTheater;
      theater.isPlaying = false;
      theater.currentSceneIndex = 0;
      return theater;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败';
      return null;
    }
  };

  const exportDualDreamItem = (historyId: string): string | null => {
    const item = history.value.find(h => h.id === historyId);
    if (!item || !item.isDualDream) return null;

    const exportData = {
      version: '1.0',
      type: 'dual-dream',
      exportedAt: Date.now(),
      dualTheater: item.theater,
    };

    return JSON.stringify(exportData, null, 2);
  };

  const dualDreamHistory = computed(() => {
    return sortedHistory.value.filter(h => h.isDualDream) as DualDreamHistoryItem[];
  });

  const singleDreamHistory = computed(() => {
    return sortedHistory.value.filter(h => !h.isDualDream && !h.isBranchingEndings);
  });

  const branchingEndingsHistory = computed(() => {
    return sortedHistory.value.filter(h => h.isBranchingEndings) as BranchingEndingsHistoryItem[];
  });

  const purifiedDreamHistory = computed(() => {
    return sortedHistory.value.filter(h => h.isPurified) as PurifiedDreamHistoryItem[];
  });

  const lucidDreamRewriteHistory = computed(() => {
    return sortedHistory.value.filter(h => h.isLucidDreamRewrite) as LucidDreamRewriteHistoryItem[];
  });

  const generatePurifiedDreamThumbnail = (theater: PurifiedDreamTheater): string => {
    return generateThumbnail(theater);
  };

  const savePurifiedDreamToHistory = async (purifiedTheater: PurifiedDreamTheater): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      const theaterToSave = JSON.parse(JSON.stringify(purifiedTheater));
      theaterToSave.isPlaying = false;

      const thumbnail = generatePurifiedDreamThumbnail(theaterToSave);
      const originalThumbnail = generateThumbnail(theaterToSave.originalTheater);

      const existingIndex = history.value.findIndex(
        h => h.theater.id === theaterToSave.id
      );

      const historyItem: PurifiedDreamHistoryItem = {
        id: generateId(),
        theater: theaterToSave,
        savedAt: Date.now(),
        thumbnail,
        isPurified: true,
        originalThumbnail,
      };

      if (existingIndex !== -1) {
        history.value[existingIndex] = historyItem;
      } else {
        history.value.unshift(historyItem);
      }

      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '保存失败';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const loadPurifiedDreamFromHistory = (historyId: string): PurifiedDreamTheater | null => {
    const item = history.value.find(h => h.id === historyId);
    if (!item || !item.isPurified) {
      error.value = '未找到该净化梦境记录';
      return null;
    }

    try {
      const theater = JSON.parse(JSON.stringify(item.theater)) as PurifiedDreamTheater;
      theater.isPlaying = false;
      theater.currentSceneIndex = 0;
      return theater;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败';
      return null;
    }
  };

  const exportPurifiedDreamItem = (historyId: string): string | null => {
    const item = history.value.find(h => h.id === historyId);
    if (!item || !item.isPurified) return null;

    const exportData = {
      version: '1.0',
      type: 'purified-dream',
      exportedAt: Date.now(),
      purifiedTheater: item.theater,
    };

    return JSON.stringify(exportData, null, 2);
  };

  const generateBranchingEndingsThumbnail = (theater: BranchingEndingsTheater): string => {
    return generateThumbnail(theater.baseTheater);
  };

  const saveBranchingEndingsToHistory = async (branchingTheater: BranchingEndingsTheater): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      const theaterToSave = JSON.parse(JSON.stringify(branchingTheater));
      theaterToSave.baseTheater.isPlaying = false;
      theaterToSave.endings.forEach((ending: any) => {
        ending.theater.isPlaying = false;
      });

      const thumbnail = generateBranchingEndingsThumbnail(theaterToSave);
      
      let selectedEndingThumbnail: string | undefined;
      if (theaterToSave.selectedEndingId) {
        const selectedEnding = theaterToSave.endings.find((e: any) => e.id === theaterToSave.selectedEndingId);
        if (selectedEnding) {
          selectedEndingThumbnail = generateThumbnail(selectedEnding.theater);
        }
      }

      const existingIndex = history.value.findIndex(
        h => h.theater.id === theaterToSave.id
      );

      const historyItem: BranchingEndingsHistoryItem = {
        id: generateId(),
        theater: theaterToSave,
        savedAt: Date.now(),
        thumbnail,
        isBranchingEndings: true,
        selectedEndingThumbnail,
      };

      if (existingIndex !== -1) {
        history.value[existingIndex] = historyItem;
      } else {
        history.value.unshift(historyItem);
      }

      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '保存失败';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const loadBranchingEndingsFromHistory = (historyId: string): BranchingEndingsTheater | null => {
    const item = history.value.find(h => h.id === historyId);
    if (!item || !item.isBranchingEndings) {
      error.value = '未找到该多结局记录';
      return null;
    }

    try {
      const theater = JSON.parse(JSON.stringify(item.theater)) as BranchingEndingsTheater;
      theater.baseTheater.isPlaying = false;
      theater.baseTheater.currentSceneIndex = 0;
      theater.endings.forEach(ending => {
        ending.theater.isPlaying = false;
        ending.theater.currentSceneIndex = 0;
      });
      return theater;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败';
      return null;
    }
  };

  const exportBranchingEndingsItem = (historyId: string): string | null => {
    const item = history.value.find(h => h.id === historyId);
    if (!item || !item.isBranchingEndings) return null;

    const exportData = {
      version: '1.0',
      type: 'branching-endings',
      exportedAt: Date.now(),
      branchingTheater: item.theater,
    };

    return JSON.stringify(exportData, null, 2);
  };

  const generateLucidDreamRewriteThumbnail = (theater: LucidDreamRewriteTheater): string => {
    return generateThumbnail(theater.originalTheater);
  };

  const saveLucidDreamRewriteToHistory = async (rewriteTheater: LucidDreamRewriteTheater): Promise<boolean> => {
    isLoading.value = true;
    error.value = null;

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      const theaterToSave = JSON.parse(JSON.stringify(rewriteTheater));
      theaterToSave.originalTheater.isPlaying = false;
      theaterToSave.branches.forEach((branch: any) => {
        branch.fullTheater.isPlaying = false;
      });

      const thumbnail = generateLucidDreamRewriteThumbnail(theaterToSave);
      const originalThumbnail = generateThumbnail(theaterToSave.originalTheater);
      
      let rewrittenThumbnail: string | undefined;
      if (theaterToSave.selectedBranchId) {
        const selectedBranch = theaterToSave.branches.find((b: any) => b.id === theaterToSave.selectedBranchId);
        if (selectedBranch) {
          rewrittenThumbnail = generateThumbnail(selectedBranch.fullTheater);
        }
      }

      const existingIndex = history.value.findIndex(
        h => h.theater.id === theaterToSave.id
      );

      const historyItem: LucidDreamRewriteHistoryItem = {
        id: generateId(),
        theater: theaterToSave,
        savedAt: Date.now(),
        thumbnail,
        isLucidDreamRewrite: true,
        originalThumbnail,
        rewrittenThumbnail,
      };

      if (existingIndex !== -1) {
        history.value[existingIndex] = historyItem;
      } else {
        history.value.unshift(historyItem);
      }

      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '保存失败';
      return false;
    } finally {
      isLoading.value = false;
    }
  };

  const loadLucidDreamRewriteFromHistory = (historyId: string): LucidDreamRewriteTheater | null => {
    const item = history.value.find(h => h.id === historyId);
    if (!item || !item.isLucidDreamRewrite) {
      error.value = '未找到该清醒梦改写记录';
      return null;
    }

    try {
      const theater = JSON.parse(JSON.stringify(item.theater)) as LucidDreamRewriteTheater;
      theater.originalTheater.isPlaying = false;
      theater.originalTheater.currentSceneIndex = 0;
      theater.branches.forEach(branch => {
        branch.fullTheater.isPlaying = false;
        branch.fullTheater.currentSceneIndex = 0;
      });
      return theater;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '加载失败';
      return null;
    }
  };

  const exportLucidDreamRewriteItem = (historyId: string): string | null => {
    const item = history.value.find(h => h.id === historyId);
    if (!item || !item.isLucidDreamRewrite) return null;

    const exportData = {
      version: '1.0',
      type: 'lucid-dream-rewrite',
      exportedAt: Date.now(),
      rewriteTheater: item.theater,
    };

    return JSON.stringify(exportData, null, 2);
  };

  return {
    history,
    isLoading,
    error,
    historyCount,
    sortedHistory,
    dualDreamHistory,
    singleDreamHistory,
    branchingEndingsHistory,
    purifiedDreamHistory,
    lucidDreamRewriteHistory,
    saveToHistory,
    saveDualDreamToHistory,
    saveBranchingEndingsToHistory,
    savePurifiedDreamToHistory,
    saveLucidDreamRewriteToHistory,
    loadFromHistory,
    loadDualDreamFromHistory,
    loadBranchingEndingsFromHistory,
    loadPurifiedDreamFromHistory,
    loadLucidDreamRewriteFromHistory,
    removeFromHistory,
    clearHistory,
    exportHistoryItem,
    exportDualDreamItem,
    exportBranchingEndingsItem,
    exportPurifiedDreamItem,
    exportLucidDreamRewriteItem,
    importHistoryItem,
    getHistoryItem,
    searchHistory,
  };
}, {
  persist: {
    key: 'pixel-dream-history',
    paths: ['history'],
  },
});
