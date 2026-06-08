<script setup lang="ts">
import { ref, computed } from 'vue';
import { useHistoryStore } from '@/stores/history';
import { useDreamStore } from '@/stores/dream';
import { useBranchingEndingsStore } from '@/stores/branchingEndings';
import { useLucidDreamRewriteStore } from '@/stores/lucidDreamRewrite';
import { useNightmarePurifierStore } from '@/stores/nightmarePurifier';
import { useRouter } from 'vue-router';
import { Search, Trash2, Download, Upload, X, Clock, Film, BookMarked, Users, GitBranch, Wand2, Moon, Sun } from 'lucide-vue-next';
import type { HistoryItem, BranchingEndingsHistoryItem, DualDreamHistoryItem, LucidDreamRewriteHistoryItem, PurifiedDreamHistoryItem } from '@/stores/history';
import type { BranchingEndingsTheater, LucidDreamRewriteTheater, PurifiedDreamTheater } from '@/types';

const historyStore = useHistoryStore();
const dreamStore = useDreamStore();
const branchingStore = useBranchingEndingsStore();
const lucidRewriteStore = useLucidDreamRewriteStore();
const purifierStore = useNightmarePurifierStore();
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

const getTheaterForDisplay = (item: HistoryItem) => {
  if (item.isBranchingEndings) {
    const branchingItem = item as BranchingEndingsHistoryItem;
    return branchingItem.theater.baseTheater;
  }
  if (item.isLucidDreamRewrite) {
    const rewriteItem = item as LucidDreamRewriteHistoryItem;
    return rewriteItem.theater.originalTheater;
  }
  if (item.isPurified) {
    const purifiedItem = item as PurifiedDreamHistoryItem;
    return purifiedItem.theater.purifiedTheater;
  }
  return item.theater;
};

const getEndingCount = (item: HistoryItem) => {
  if (item.isBranchingEndings) {
    const branchingItem = item as BranchingEndingsHistoryItem;
    return branchingItem.theater.endings?.length || 0;
  }
  return 0;
};

const getBranchCount = (item: HistoryItem) => {
  if (item.isLucidDreamRewrite) {
    const rewriteItem = item as LucidDreamRewriteHistoryItem;
    return rewriteItem.theater.branches?.length || 0;
  }
  return 0;
};

const getPurificationTheme = (item: HistoryItem) => {
  if (item.isPurified) {
    const purifiedItem = item as PurifiedDreamHistoryItem;
    return purifiedItem.theater.selectedTheme?.name || '';
  }
  return '';
};

const loadHistoryItem = (item: HistoryItem) => {
  if (item.isBranchingEndings) {
    const branchingItem = item as BranchingEndingsHistoryItem;
    const theater = historyStore.loadBranchingEndingsFromHistory(item.id);
    if (theater) {
      branchingStore.loadBranchingTheater(theater);
      router.push('/branching');
    }
  } else if (item.isDualDream) {
    historyStore.loadDualDreamFromHistory(item.id);
    router.push('/dual');
  } else if (item.isLucidDreamRewrite) {
    const theater = historyStore.loadLucidDreamRewriteFromHistory(item.id);
    if (theater) {
      lucidRewriteStore.loadRewriteTheater(theater);
      router.push('/lucid-rewrite');
    }
  } else if (item.isPurified) {
    const theater = historyStore.loadPurifiedDreamFromHistory(item.id);
    if (theater) {
      purifierStore.loadPurifiedTheater(theater);
      router.push('/purifier');
    }
  } else {
    historyStore.loadFromHistory(item.id);
    router.push('/');
  }
};

const loadSelectedEnding = (item: HistoryItem, event: Event) => {
  event.stopPropagation();
  if (!item.isBranchingEndings) return;
  
  const branchingItem = item as BranchingEndingsHistoryItem;
  const theater = historyStore.loadBranchingEndingsFromHistory(item.id);
  if (!theater) return;
  
  const selectedEnding = theater.endings.find(e => e.id === theater.selectedEndingId);
  if (selectedEnding) {
    const theaterToLoad = JSON.parse(JSON.stringify(selectedEnding.theater));
    theaterToLoad.isPlaying = false;
    theaterToLoad.currentSceneIndex = 0;
    dreamStore.loadTheater(theaterToLoad);
    router.push('/');
  } else {
    alert('请先选择一个结局');
  }
};

const exportBranchingEndingsItem = (item: HistoryItem, event: Event) => {
  event.stopPropagation();
  const data = historyStore.exportBranchingEndingsItem(item.id);
  if (data) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getTheaterForDisplay(item).title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_多结局.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

const loadSelectedRewriteBranch = (item: HistoryItem, event: Event) => {
  event.stopPropagation();
  if (!item.isLucidDreamRewrite) return;
  
  const rewriteItem = item as LucidDreamRewriteHistoryItem;
  const theater = historyStore.loadLucidDreamRewriteFromHistory(item.id);
  if (!theater) return;
  
  const selectedBranch = theater.branches.find(b => b.id === theater.selectedBranchId);
  if (selectedBranch) {
    const theaterToLoad = JSON.parse(JSON.stringify(selectedBranch.fullTheater));
    theaterToLoad.isPlaying = false;
    theaterToLoad.currentSceneIndex = 0;
    dreamStore.loadTheater(theaterToLoad);
    router.push('/');
  } else {
    alert('请先选择一个改写分支');
  }
};

const loadPurifiedToDream = (item: HistoryItem, event: Event) => {
  event.stopPropagation();
  if (!item.isPurified) return;
  
  const purifiedItem = item as PurifiedDreamHistoryItem;
  const theater = historyStore.loadPurifiedDreamFromHistory(item.id);
  if (!theater) return;
  
  const theaterToLoad = JSON.parse(JSON.stringify(theater.purifiedTheater));
  theaterToLoad.isPlaying = false;
  theaterToLoad.currentSceneIndex = 0;
  dreamStore.loadTheater(theaterToLoad);
  router.push('/');
};

const exportLucidRewriteItem = (item: HistoryItem, event: Event) => {
  event.stopPropagation();
  const data = historyStore.exportLucidDreamRewriteItem(item.id);
  if (data) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getTheaterForDisplay(item).title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_清醒梦改写.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

const exportPurifiedItem = (item: HistoryItem, event: Event) => {
  event.stopPropagation();
  const data = historyStore.exportPurifiedDreamItem(item.id);
  if (data) {
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${getTheaterForDisplay(item).title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_噩梦净化.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
};

const deleteHistoryItem = (item: HistoryItem, event: Event) => {
  event.stopPropagation();
  if (confirm(`确定要删除「${getTheaterForDisplay(item).title}」吗？`)) {
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
          <div class="flex-shrink-0 w-20 h-20 pixel-border bg-dream-dark overflow-hidden relative">
            <img
              v-if="item.isBranchingEndings && (item as BranchingEndingsHistoryItem).selectedEndingThumbnail"
              :src="(item as BranchingEndingsHistoryItem).selectedEndingThumbnail"
              :alt="getTheaterForDisplay(item).title"
              class="w-full h-full object-cover"
              :style="{ imageRendering: 'pixelated' }"
            />
            <img
              v-else-if="item.isLucidDreamRewrite && (item as LucidDreamRewriteHistoryItem).rewrittenThumbnail"
              :src="(item as LucidDreamRewriteHistoryItem).rewrittenThumbnail"
              :alt="getTheaterForDisplay(item).title"
              class="w-full h-full object-cover"
              :style="{ imageRendering: 'pixelated' }"
            />
            <img
              v-else-if="item.thumbnail"
              :src="item.thumbnail"
              :alt="getTheaterForDisplay(item).title"
              class="w-full h-full object-cover"
              :style="{ imageRendering: 'pixelated' }"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-2xl">
              🎬
            </div>
            <div
              v-if="item.isBranchingEndings"
              class="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-500/80 via-purple-500/80 to-red-500/80 text-[8px] text-center py-0.5 font-pixel"
            >
              多结局
            </div>
            <div
              v-else-if="item.isLucidDreamRewrite"
              class="absolute top-0 left-0 right-0 bg-gradient-to-r from-indigo-500/80 via-purple-500/80 to-pink-500/80 text-[8px] text-center py-0.5 font-pixel"
            >
              清醒梦改写
            </div>
            <div
              v-else-if="item.isPurified"
              class="absolute top-0 left-0 right-0 bg-gradient-to-r from-yellow-400/80 via-orange-400/80 to-red-400/80 text-[8px] text-center py-0.5 font-pixel"
            >
              噩梦净化
            </div>
          </div>

          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <h4 class="font-pixel text-sm text-dream-secondary truncate">
                {{ getTheaterForDisplay(item).title }}
              </h4>
              <span
                v-if="item.isBranchingEndings"
                class="flex items-center gap-1 text-[10px] px-1.5 py-0.5 pixel-border bg-gradient-to-r from-yellow-500/20 via-purple-500/20 to-red-500/20 text-dream-accent"
              >
                <GitBranch class="w-3 h-3" />
                {{ getEndingCount(item) }} 结局
              </span>
              <span
                v-else-if="item.isDualDream"
                class="flex items-center gap-1 text-[10px] px-1.5 py-0.5 pixel-border bg-pink-500/20 text-pink-300"
              >
                <Users class="w-3 h-3" />
                双人合梦
              </span>
              <span
                v-else-if="item.isLucidDreamRewrite"
                class="flex items-center gap-1 text-[10px] px-1.5 py-0.5 pixel-border bg-gradient-to-r from-indigo-500/20 via-purple-500/20 to-pink-500/20 text-purple-300"
              >
                <Moon class="w-3 h-3" />
                {{ getBranchCount(item) }} 分支
              </span>
              <span
                v-else-if="item.isPurified"
                class="flex items-center gap-1 text-[10px] px-1.5 py-0.5 pixel-border bg-gradient-to-r from-yellow-400/20 via-orange-400/20 to-red-400/20 text-orange-300"
              >
                <Sun class="w-3 h-3" />
                {{ getPurificationTheme(item) }}
              </span>
              <span
                v-else
                class="text-[10px] px-1.5 py-0.5 pixel-border bg-dream-primary/20 text-dream-primary"
              >
                单人
              </span>
            </div>
            <p class="text-xs text-dream-accent line-clamp-1 mb-2">
              {{ getTheaterForDisplay(item).originalDream }}
            </p>
            <div class="flex items-center gap-3 text-xs text-dream-accent">
              <span class="flex items-center gap-1">
                <Film class="w-3 h-3" />
                {{ getTheaterForDisplay(item).scenes.length }} 幕
              </span>
              <span class="flex items-center gap-1">
                <Clock class="w-3 h-3" />
                {{ formatDuration(getTheaterForDisplay(item).totalDuration) }}
              </span>
              <span
                v-if="getTheaterForDisplay(item).encyclopedia"
                class="flex items-center gap-1 text-dream-secondary"
              >
                <BookMarked class="w-3 h-3" />
                {{ getTheaterForDisplay(item).encyclopedia.elements.length }} 元素
              </span>
              <span>{{ formatDate(item.savedAt) }}</span>
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <button
              v-if="item.isBranchingEndings && (item as BranchingEndingsHistoryItem).theater.selectedEndingId"
              class="pixel-btn p-1.5 text-dream-primary hover:bg-dream-primary/20"
              title="加载已选结局到编辑区"
              @click="(e) => loadSelectedEnding(item, e)"
            >
              <Wand2 class="w-3.5 h-3.5" />
            </button>
            <button
              v-if="item.isLucidDreamRewrite && (item as LucidDreamRewriteHistoryItem).theater.selectedBranchId"
              class="pixel-btn p-1.5 text-purple-400 hover:bg-purple-500/20"
              title="加载已选改写分支到编辑区"
              @click="(e) => loadSelectedRewriteBranch(item, e)"
            >
              <Wand2 class="w-3.5 h-3.5" />
            </button>
            <button
              v-if="item.isPurified"
              class="pixel-btn p-1.5 text-orange-400 hover:bg-orange-500/20"
              title="加载净化版到编辑区"
              @click="(e) => loadPurifiedToDream(item, e)"
            >
              <Wand2 class="w-3.5 h-3.5" />
            </button>
            <button
              v-if="getTheaterForDisplay(item).encyclopedia"
              class="pixel-btn p-1.5 text-dream-secondary hover:bg-dream-secondary/20"
              title="查看图鉴"
              @click.stop="loadHistoryItem(item)"
            >
              <BookMarked class="w-3.5 h-3.5" />
            </button>
            <button
              class="pixel-btn p-1.5"
              title="导出"
              @click="(e) => {
                if (item.isBranchingEndings) exportBranchingEndingsItem(item, e);
                else if (item.isLucidDreamRewrite) exportLucidRewriteItem(item, e);
                else if (item.isPurified) exportPurifiedItem(item, e);
                else exportHistoryItem(item, e);
              }"
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
            v-for="scene in getTheaterForDisplay(item).scenes.slice(0, 5)"
            :key="scene.id"
            class="text-[10px] px-1.5 py-0.5 bg-dream-dark text-dream-accent pixel-border"
          >
            {{ scene.actNumber }}. {{ scene.title }}
          </span>
          <span
            v-if="getTheaterForDisplay(item).scenes.length > 5"
            class="text-[10px] px-1.5 py-0.5 text-dream-accent"
          >
            +{{ getTheaterForDisplay(item).scenes.length - 5 }} 更多
          </span>
          <div
            v-if="item.isBranchingEndings"
            class="w-full mt-2 pt-2 border-t border-dream-border/50 flex items-center gap-2 flex-wrap"
          >
            <span class="text-[10px] text-dream-accent">结局:</span>
            <span
              v-for="ending in (item as BranchingEndingsHistoryItem).theater.endings"
              :key="ending.id"
              class="text-[10px] px-1.5 py-0.5 pixel-border"
              :style="{
                backgroundColor: ending.theme.color + '20',
                color: ending.theme.color,
                borderColor: ending.isSelected ? ending.theme.color : undefined,
              }"
              :class="ending.isSelected ? 'ring-1' : ''"
            >
              {{ ending.variant === 'ending-a' ? 'A' : ending.variant === 'ending-b' ? 'B' : 'C' }}. {{ ending.theme.name }}
              <span v-if="ending.isSelected" class="ml-1">✓</span>
            </span>
          </div>
          <div
            v-if="item.isLucidDreamRewrite"
            class="w-full mt-2 pt-2 border-t border-dream-border/50 flex items-center gap-2 flex-wrap"
          >
            <span class="text-[10px] text-dream-accent">改写分支:</span>
            <span
              v-for="branch in (item as LucidDreamRewriteHistoryItem).theater.branches"
              :key="branch.id"
              class="text-[10px] px-1.5 py-0.5 pixel-border"
              :style="{
                backgroundColor: branch.isSelected ? '#8B5CF620' : '#1e1b4b30',
                color: branch.isSelected ? '#A78BFA' : '#9CA3AF',
                borderColor: branch.isSelected ? '#8B5CF6' : undefined,
              }"
              :class="branch.isSelected ? 'ring-1' : ''"
            >
              {{ branch.name }}
              <span v-if="branch.isSelected" class="ml-1">✓</span>
            </span>
          </div>
          <div
            v-if="item.isPurified"
            class="w-full mt-2 pt-2 border-t border-dream-border/50 flex items-center gap-2 flex-wrap"
          >
            <span class="text-[10px] text-dream-accent">净化主题:</span>
            <span
              class="text-[10px] px-1.5 py-0.5 pixel-border ring-1"
              :style="{
                backgroundColor: (item as PurifiedDreamHistoryItem).theater.selectedTheme.color + '20',
                color: (item as PurifiedDreamHistoryItem).theater.selectedTheme.color,
                borderColor: (item as PurifiedDreamHistoryItem).theater.selectedTheme.color,
              }"
            >
              {{ (item as PurifiedDreamHistoryItem).theater.selectedTheme.name }}
              <span class="ml-1">✓</span>
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="historyStore.error" class="text-dream-error text-sm text-center">
      {{ historyStore.error }}
    </div>
  </div>
</template>
