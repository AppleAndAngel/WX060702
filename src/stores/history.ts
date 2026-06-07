import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { DreamTheater, DualDreamTheater } from '@/types';
import { useDreamStore } from './dream';
import { generateId } from '@/utils/pixelUtils';

export interface HistoryItem {
  id: string;
  theater: DreamTheater;
  savedAt: number;
  thumbnail: string;
  isDualDream?: boolean;
}

export interface DualDreamHistoryItem extends HistoryItem {
  theater: DualDreamTheater;
  isDualDream: true;
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
    return sortedHistory.value.filter(h => !h.isDualDream);
  });

  return {
    history,
    isLoading,
    error,
    historyCount,
    sortedHistory,
    dualDreamHistory,
    singleDreamHistory,
    saveToHistory,
    saveDualDreamToHistory,
    loadFromHistory,
    loadDualDreamFromHistory,
    removeFromHistory,
    clearHistory,
    exportHistoryItem,
    exportDualDreamItem,
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
