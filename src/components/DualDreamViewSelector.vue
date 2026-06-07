<script setup lang="ts">
import { computed } from 'vue';
import { Users, User, Eye, GitCompare } from 'lucide-vue-next';
import { useDualDreamStore } from '@/stores/dualDream';
import type { ViewMode } from '@/types';

const dualDreamStore = useDualDreamStore();

const currentViewMode = computed(() => dualDreamStore.currentViewMode);
const player1 = computed(() => dualDreamStore.player1);
const player2 = computed(() => dualDreamStore.player2);
const elementStats = computed(() => dualDreamStore.elementStats);

const viewModes: { value: ViewMode; label: string; icon: any; color: string }[] = [
  { value: 'merged', label: '融合视图', icon: Users, color: '#9B59B6' },
  { value: 'player1', label: computed(() => `${player1.value.name}视角`), icon: User, color: computed(() => player1.value.color) },
  { value: 'player2', label: computed(() => `${player2.value.name}视角`), icon: User, color: computed(() => player2.value.color) },
  { value: 'diff', label: '差异对比', icon: GitCompare, color: '#FFD700' },
];

const handleViewModeChange = (mode: ViewMode) => {
  dualDreamStore.setViewMode(mode);
};

const getLabel = (mode: typeof viewModes[0]) => {
  return typeof mode.label === 'function' ? mode.label() : mode.label;
};

const getColor = (mode: typeof viewModes[0]) => {
  return typeof mode.color === 'function' ? mode.color() : mode.color;
};
</script>

<template>
  <div class="pixel-card space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Eye class="w-5 h-5 text-dream-primary" />
        <h3 class="font-pixel text-sm text-dream-primary">视角切换</h3>
      </div>
    </div>

    <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
      <button
        v-for="mode in viewModes"
        :key="mode.value"
        class="p-3 pixel-border text-center transition-all hover:scale-105"
        :class="[
          currentViewMode === mode.value
            ? 'bg-dream-primary/30 border-dream-primary scale-105'
            : 'bg-dream-dark hover:bg-dream-primary/10'
        ]"
        :style="currentViewMode === mode.value ? { borderColor: getColor(mode) } : {}"
        @click="handleViewModeChange(mode.value)"
      >
        <component
          :is="mode.icon"
          class="w-5 h-5 mx-auto mb-2"
          :style="{ color: getColor(mode) }"
        />
        <div
          class="text-xs font-pixel"
          :style="{ color: currentViewMode === mode.value ? getColor(mode) : undefined }"
        >
          {{ getLabel(mode) }}
        </div>
      </button>
    </div>

    <div class="grid grid-cols-3 gap-2 pt-2 border-t border-dream-border">
      <div class="text-center">
        <div
          class="text-lg font-pixel"
          :style="{ color: player1.color }"
        >
          {{ elementStats.player1Count }}
        </div>
        <div class="text-xs text-dream-accent">{{ player1.name }}的元素</div>
      </div>
      <div class="text-center">
        <div class="text-lg font-pixel text-yellow-400">
          {{ elementStats.sharedCount }}
        </div>
        <div class="text-xs text-dream-accent">共享元素</div>
      </div>
      <div class="text-center">
        <div
          class="text-lg font-pixel"
          :style="{ color: player2.color }"
        >
          {{ elementStats.player2Count }}
        </div>
        <div class="text-xs text-dream-accent">{{ player2.name }}的元素</div>
      </div>
    </div>

    <div class="text-xs text-dream-accent space-y-1 pt-2 border-t border-dream-border">
      <p><span class="text-dream-primary">💡 提示：</span></p>
      <p v-if="currentViewMode === 'merged'">当前显示双方所有元素交织在一起的完整梦境</p>
      <p v-else-if="currentViewMode === 'player1'">只显示 {{ player1.name }} 带来的元素和共享元素</p>
      <p v-else-if="currentViewMode === 'player2'">只显示 {{ player2.name }} 带来的元素和共享元素</p>
      <p v-else-if="currentViewMode === 'diff'">高亮显示双方元素的差异，点击差异对比查看详情</p>
    </div>
  </div>
</template>
