<script setup lang="ts">
import { computed } from 'vue';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  ChevronsLeft,
  ChevronsRight,
  Plus,
  Trash2,
  Copy,
} from 'lucide-vue-next';

const props = defineProps<{
  currentFrame: number;
  totalFrames: number;
  isPlaying: boolean;
}>();

const emit = defineEmits<{
  (e: 'frame-change', index: number): void;
  (e: 'toggle-play'): void;
  (e: 'prev'): void;
  (e: 'next'): void;
  (e: 'add-frame'): void;
  (e: 'remove-frame'): void;
  (e: 'duplicate-frame'): void;
}>();

const progressPercent = computed(() => {
  if (props.totalFrames <= 1) return 0;
  return ((props.currentFrame - 1) / (props.totalFrames - 1)) * 100;
});

const handleSliderChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  emit('frame-change', parseInt(target.value));
};
</script>

<template>
  <div class="pixel-card space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="font-pixel text-sm text-dream-primary">帧控制</h3>
      <span class="text-dream-accent text-sm">
        {{ currentFrame }} / {{ totalFrames }}
      </span>
    </div>

    <div class="relative">
      <div class="h-2 bg-dream-dark pixel-border overflow-hidden">
        <div
          class="h-full bg-dream-primary transition-all duration-200"
          :style="{ width: `${progressPercent}%` }"
        />
      </div>
      <input
        type="range"
        :min="1"
        :max="totalFrames"
        :value="currentFrame"
        class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        @input="handleSliderChange"
      />
    </div>

    <div class="flex items-center justify-center gap-2">
      <button
        class="pixel-btn p-2"
        title="跳到第一帧"
        :disabled="currentFrame === 1"
        @click="emit('frame-change', 1)"
      >
        <ChevronsLeft class="w-4 h-4" />
      </button>

      <button
        class="pixel-btn p-2"
        title="上一帧"
        @click="emit('prev')"
      >
        <SkipBack class="w-4 h-4" />
      </button>

      <button
        class="pixel-btn-primary px-6 py-2 flex items-center gap-2"
        title="播放/暂停"
        @click="emit('toggle-play')"
      >
        <Pause v-if="isPlaying" class="w-5 h-5" />
        <Play v-else class="w-5 h-5" />
        <span class="text-sm">{{ isPlaying ? '暂停' : '播放' }}</span>
      </button>

      <button
        class="pixel-btn p-2"
        title="下一帧"
        @click="emit('next')"
      >
        <SkipForward class="w-4 h-4" />
      </button>

      <button
        class="pixel-btn p-2"
        title="跳到最后一帧"
        :disabled="currentFrame === totalFrames"
        @click="emit('frame-change', totalFrames)"
      >
        <ChevronsRight class="w-4 h-4" />
      </button>
    </div>

    <div class="flex items-center justify-center gap-2 pt-2 border-t border-dream-border">
      <button
        class="pixel-btn px-3 py-1.5 flex items-center gap-1.5 text-sm"
        title="添加帧"
        @click="emit('add-frame')"
      >
        <Plus class="w-4 h-4" />
        添加
      </button>

      <button
        class="pixel-btn px-3 py-1.5 flex items-center gap-1.5 text-sm"
        title="复制当前帧"
        @click="emit('duplicate-frame')"
      >
        <Copy class="w-4 h-4" />
        复制
      </button>

      <button
        class="pixel-btn px-3 py-1.5 flex items-center gap-1.5 text-sm text-dream-error hover:bg-dream-error/20"
        title="删除当前帧"
        :disabled="totalFrames <= 1"
        @click="emit('remove-frame')"
      >
        <Trash2 class="w-4 h-4" />
        删除
      </button>
    </div>
  </div>
</template>
