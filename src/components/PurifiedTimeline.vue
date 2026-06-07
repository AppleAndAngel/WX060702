<script setup lang="ts">
import { computed } from 'vue';
import { Play, Pause, SkipBack, SkipForward, ChevronLeft, ChevronRight } from 'lucide-vue-next';
import type { PurifiedDreamTheater, PurifyViewMode } from '@/types';

const props = defineProps<{
  theater?: PurifiedDreamTheater | null;
  currentIndex: number;
  isPlaying: boolean;
  viewMode: PurifyViewMode;
  originalDuration?: number;
  purifiedDuration?: number;
}>();

const emit = defineEmits<{
  (e: 'update:currentIndex', index: number): void;
  (e: 'play'): void;
  (e: 'prev'): void;
  (e: 'next'): void;
}>();

const scenes = computed(() => props.theater?.scenes || []);
const sceneCount = computed(() => scenes.value.length);

const currentDuration = computed(() => {
  if (props.viewMode === 'original') {
    return props.originalDuration || 0;
  }
  return props.purifiedDuration || 0;
});

const handleSceneClick = (index: number) => {
  emit('update:currentIndex', index);
};

const formatDuration = (ms: number) => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};
</script>

<template>
  <div class="purified-timeline space-y-4">
    <div class="pixel-card">
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <div class="text-sm">
            <span class="text-dream-accent">显示模式：</span>
            <span 
              class="font-pixel text-xs px-2 py-1 rounded"
              :class="{
                'text-red-400 bg-red-500/20': viewMode === 'original',
                'text-green-400 bg-green-500/20': viewMode === 'purified',
                'text-blue-400 bg-blue-500/20': viewMode === 'compare',
              }"
            >
              {{ viewMode === 'original' ? '原始梦境' : viewMode === 'purified' ? '净化梦境 ✨' : '对比模式' }}
            </span>
          </div>
        </div>
        <div class="text-xs text-dream-accent">
          总时长：{{ formatDuration(currentDuration) }}
        </div>
      </div>

      <div class="flex items-center justify-center gap-4 mb-4">
        <button
          class="pixel-btn w-10 h-10 flex items-center justify-center p-0"
          :disabled="sceneCount === 0"
          @click="emit('prev')"
        >
          <SkipBack class="w-4 h-4" />
        </button>
        <button
          class="pixel-btn w-10 h-10 flex items-center justify-center p-0"
          :disabled="sceneCount === 0"
          @click="emit('play')"
        >
          <Pause v-if="isPlaying" class="w-4 h-4" />
          <Play v-else class="w-4 h-4" />
        </button>
        <button
          class="pixel-btn w-10 h-10 flex items-center justify-center p-0"
          :disabled="sceneCount === 0"
          @click="emit('next')"
        >
          <SkipForward class="w-4 h-4" />
        </button>
      </div>

      <div class="text-center text-xs text-dream-accent mb-3">
        第 {{ currentIndex + 1 }} 幕 / 共 {{ sceneCount }} 幕
      </div>

      <div class="flex gap-2 overflow-x-auto pb-2 timeline-scroller">
        <button
          v-for="(scene, index) in scenes"
          :key="scene.id"
          class="flex-shrink-0 w-24 p-2 pixel-border transition-all"
          :class="[
            currentIndex === index
              ? 'bg-dream-primary/30 border-dream-primary'
              : 'bg-dream-dark hover:bg-dream-primary/10',
          ]"
          @click="handleSceneClick(index)"
        >
          <div class="text-xs font-pixel mb-1" :class="currentIndex === index ? 'text-dream-primary' : 'text-dream-accent'">
            第{{ index + 1 }}幕
          </div>
          <div class="text-xs text-dream-secondary line-clamp-1">
            {{ scene.title }}
          </div>
          <div class="text-xs text-dream-accent mt-1">
            {{ (scene.duration / 1000).toFixed(1) }}s
          </div>
          <div v-if="scene.purificationNotes" class="mt-1 text-xs text-green-400">
            ✨ 已净化
          </div>
        </button>
      </div>
    </div>

    <div v-if="theater && scenes[currentIndex]" class="pixel-card">
      <div class="flex items-start justify-between mb-3">
        <div>
          <h3 class="font-pixel text-sm text-dream-primary mb-1">
            {{ scenes[currentIndex].title }}
          </h3>
          <div class="text-xs text-dream-accent">
            第{{ currentIndex + 1 }}幕
          </div>
        </div>
        <div class="text-right">
          <div class="text-xs text-dream-accent">
            时长
          </div>
          <div class="font-pixel text-sm text-dream-secondary">
            {{ (scenes[currentIndex].duration / 1000).toFixed(1) }}s
          </div>
        </div>
      </div>

      <p class="text-sm text-dream-secondary mb-3">
        {{ scenes[currentIndex].description }}
      </p>

      <div v-if="scenes[currentIndex].purificationNotes" class="pixel-border p-3 bg-green-500/5 border-green-500/30">
        <div class="text-xs font-pixel text-green-400 mb-1">净化说明 ✨</div>
        <p class="text-xs text-dream-accent">
          {{ scenes[currentIndex].purificationNotes }}
        </p>
      </div>

      <div v-if="scenes[currentIndex].colorTransform && scenes[currentIndex].colorTransform.length > 0" class="mt-3">
        <div class="text-xs font-pixel text-dream-accent mb-2">颜色转换</div>
        <div class="flex flex-wrap gap-2">
          <div
            v-for="(transform, i) in scenes[currentIndex].colorTransform.slice(0, 4)"
            :key="i"
            class="flex items-center gap-1 text-xs"
          >
            <div class="w-4 h-4 pixel-border" :style="{ backgroundColor: transform.original }" />
            <span class="text-dream-accent">→</span>
            <div class="w-4 h-4 pixel-border" :style="{ backgroundColor: transform.purified }" />
          </div>
          <span v-if="scenes[currentIndex].colorTransform.length > 4" class="text-xs text-dream-accent">
            +{{ scenes[currentIndex].colorTransform.length - 4 }} 更多
          </span>
        </div>
      </div>

      <div class="mt-4 flex items-center gap-2">
        <div class="text-xs text-dream-accent">
          原始梦境提示词：
        </div>
        <div class="text-xs text-dream-secondary flex-1 truncate">
          {{ scenes[currentIndex].prompt }}
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.timeline-scroller::-webkit-scrollbar {
  height: 6px;
}

.timeline-scroller::-webkit-scrollbar-track {
  background: var(--dream-dark);
}

.timeline-scroller::-webkit-scrollbar-thumb {
  background: var(--dream-secondary);
  border-radius: 3px;
}

.timeline-scroller::-webkit-scrollbar-thumb:hover {
  background: var(--dream-primary);
}
</style>
