<script setup lang="ts">
import { ref, computed } from 'vue';
import { useHistoryStore } from '@/stores/history';
import { useDreamStore } from '@/stores/dream';
import { useRouter } from 'vue-router';
import { Search, Trash2, Download, Upload, X, Clock, Film } from 'lucide-vue-next';
import type { HistoryItem } from '@/stores/history';

const historyStore = useHistoryStore();
const dreamStore = useDreamStore();
const router = useRouter();

const searchQuery = ref('');
const showImport = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);

const filteredHistory = computed(() => {
  if (!searchQuery.value.trim()) {
    return historyStore.sortedHistory;
  }
  return historyStore.searchHistory(searchQuery.value);
});

const formatDate = (timestamp: number) => {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDuration = (ms: number) => {
  return (ms / 1000).toFixed(1) + 's';
};

const loadHistoryItem = (item: HistoryItem) => {
  historyStore.loadFromHistory(item.id);
  router.push('/');
};

const deleteHistoryItem = (item: HistoryItem, event: Event) => {
  event.stopPropagation();
  if (confirm(`确定要删除「${item.theater.title}」吗？`)) {
    historyStore.removeFromHistory(item.id);
  }
};

const exportHistoryItem = (item: HistoryItem, event: Event) => {
  event.stopPropagation();
  const data = historyStore.exportHistoryItem(item.id);
  if (data) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.theater.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

const triggerImport = () => {
  fileInputRef.value?.click();
};

const handleFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    await historyStore.importHistoryItem(file);
    target.value = '';
  }
  showImport.value = false;
};

const clearAllHistory = () => {
  if (confirm('确定要清空所有历史记录吗？此操作不可恢复。')) {
    historyStore.clearHistory();
  }
};
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between gap-2">
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dream-accent" />
        <input
          v-model="searchQuery"
          type="text"
          placeholder="搜索历史记录..."
          class="pixel-input w-full pl-9"
        />
      </div>

      <div class="flex gap-2">
        <button
          class="pixel-btn p-2"
          title="导入"
          @click="triggerImport"
        >
          <Upload class="w-4 h-4" />
        </button>
        <button
          v-if="historyStore.historyCount > 0"
          class="pixel-btn p-2 text-dream-error hover:bg-dream-error/20"
          title="清空全部"
          @click="clearAllHistory"
        >
          <Trash2 class="w-4 h-4" />
        </button>
      </div>

      <input
        ref="fileInputRef"
        type="file"
        accept=".json"
        class="hidden"
        @change="handleFileImport"
      />
    </div>

    <div v-if="historyStore.isLoading" class="text-center py-8 text-dream-accent">
      <div class="animate-spin text-3xl mb-2">⏳</div>
      <p class="text-sm">处理中...</p>
    </div>

    <div v-else-if="filteredHistory.length === 0" class="text-center py-12 text-dream-accent">
      <div class="text-5xl mb-3">📭</div>
      <p class="font-pixel text-sm mb-1">
        {{ searchQuery ? '未找到匹配的记录' : '暂无历史记录' }}
      </p>
      <p class="text-xs">
        {{ searchQuery ? '试试其他关键词' : '生成梦境分镜剧场后可以保存到这里' }}
      </p>
    </div>

    <div v-else class="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
      <div
        v-for="item in filteredHistory"
        :key="item.id"
        class="pixel-card p-3 cursor-pointer transition-all hover:scale-[1.01] hover:shadow-lg"
        @click="loadHistoryItem(item)"
      >
        <div class="flex gap-3">
          <div class="flex-shrink-0 w-20 h-20 pixel-border bg-dream-dark overflow-hidden">
            <img
              v-if="item.thumbnail"
              :src="item.thumbnail"
              :alt="item.theater.title"
              class="w-full h-full object-cover"
              :style="{ imageRendering: 'pixelated' }"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-2xl">
              🎬
            </div>
          </div>

          <div class="flex-1 min-w-0">
            <h4 class="font-pixel text-sm text-dream-secondary truncate mb-1">
              {{ item.theater.title }}
            </h4>
            <p class="text-xs text-dream-accent line-clamp-1 mb-2">
              {{ item.theater.originalDream }}
            </p>
            <div class="flex items-center gap-3 text-xs text-dream-accent">
              <span class="flex items-center gap-1">
                <Film class="w-3 h-3" />
                {{ item.theater.scenes.length }} 幕
              </span>
              <span class="flex items-center gap-1">
                <Clock class="w-3 h-3" />
                {{ formatDuration(item.theater.totalDuration) }}
              </span>
              <span>{{ formatDate(item.savedAt) }}</span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <button
              class="pixel-btn p-1.5"
              title="导出"
              @click="(e) => exportHistoryItem(item, e)"
            >
              <Download class="w-3.5 h-3.5" />
            </button>
            <button
              class="pixel-btn p-1.5 text-dream-error hover:bg-dream-error/20"
              title="删除"
              @click="(e) => deleteHistoryItem(item, e)"
            >
              <Trash2 class="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div class="mt-2 pt-2 border-t border-dream-border flex flex-wrap gap-1">
          <span
            v-for="scene in item.theater.scenes.slice(0, 5)"
            :key="scene.id"
            class="text-[10px] px-1.5 py-0.5 bg-dream-dark text-dream-accent pixel-border"
          >
            {{ scene.actNumber }}. {{ scene.title }}
          </span>
          <span
            v-if="item.theater.scenes.length > 5"
            class="text-[10px] px-1.5 py-0.5 text-dream-accent"
          >
            +{{ item.theater.scenes.length - 5 }} 更多
          </span>
        </div>
      </div>
    </div>

    <div v-if="historyStore.error" class="text-dream-error text-sm text-center">
      {{ historyStore.error }}
    </div>
  </div>
</template>
