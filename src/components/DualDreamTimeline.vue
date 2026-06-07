<script setup lang="ts">
import { ref, computed } from 'vue';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Clock,
} from 'lucide-vue-next';
import type { DualDreamTheater, ViewMode } from '@/types';

const props = defineProps<{
  theater: DualDreamTheater;
  currentIndex: number;
  isPlaying: boolean;
  viewMode: ViewMode;
  player1Color: string;
  player2Color: string;
}>();

const emit = defineEmits<{
  (e: 'update:current-index', index: number): void;
  (e: 'play'): void;
  (e: 'prev'): void;
  (e: 'next'): void;
}>();

const scenes = computed(() => props.theater.scenes);
const totalDuration = computed(() => props.theater.totalDuration);

const selectScene = (index: number) => {
  emit('update:current-index', index);
};

const formatDuration = (ms: number) => {
  return (ms / 1000).toFixed(1) + 's';
};

const getSceneOwnerColor = (owner: string) => {
  if (owner === 'player1') return props.player1Color;
  if (owner === 'player2') return props.player2Color;
  return '#FFD700';
};

const getSceneOwnerLabel = (owner: string) => {
  if (owner === 'player1') return props.theater.player1.name;
  if (owner === 'player2') return props.theater.player2.name;
  return '共享';
};

const renderThumbnail = (scene: typeof scenes.value[0]) => {
  const { pixelData } = scene.frame;
  const canvas = document.createElement('canvas');
  const scale = 2;
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

const getTimelinePosition = (scene: typeof scenes.value[0]) => {
  const totalMs = totalDuration.value;
  const beforeMs = scenes.value
    .slice(0, scene.actNumber - 1)
    .reduce((sum, s) => sum + s.duration, 0);
  return (beforeMs / totalMs) * 100;
};

const getSceneWidth = (scene: typeof scenes.value[0]) => {
  return (scene.duration / totalDuration.value) * 100;
};
</script>

<template>
  <div class="pixel-card space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <span class="text-2xl">🎬</span>
        <h3 class="font-pixel text-sm text-dream-primary">双人合梦分镜剧场</h3>
      </div>
      <span class="text-dream-accent text-xs">
        总时长: {{ formatDuration(totalDuration) }}
      </span>
    </div>

    <div v-if="theater" class="space-y-4">
      <div class="text-center">
        <h2 class="font-pixel text-lg text-dream-secondary mb-1">
          {{ theater.title }}
        </h2>
        <div class="flex items-center justify-center gap-4 text-xs text-dream-accent">
          <span :style="{ color: player1Color }">{{ theater.player1.name }}</span>
          <span>×</span>
          <span :style="{ color: player2Color }">{{ theater.player2.name }}</span>
        </div>
      </div>

      <div class="flex items-center justify-center gap-2 mb-2">
        <div class="flex items-center gap-1">
          <div
            class="w-3 h-3 rounded-full"
            :style="{ backgroundColor: player1Color }"
          />
          <span class="text-xs text-dream-accent">{{ theater.player1.name }}的元素</span>
        </div>
        <div class="flex items-center gap-1">
          <div class="w-3 h-3 rounded-full" style="background-color: #FFD700;" />
          <span class="text-xs text-dream-accent">共享元素</span>
        </div>
        <div class="flex items-center gap-1">
          <div
            class="w-3 h-3 rounded-full"
            :style="{ backgroundColor: player2Color }"
          />
          <span class="text-xs text-dream-accent">{{ theater.player2.name }}的元素</span>
        </div>
      </div>

      <div class="relative h-36 bg-dream-dark pixel-border overflow-x-auto">
        <div class="absolute inset-y-0 left-0 flex items-stretch min-w-full p-2 gap-2">
          <div
            v-for="(scene, index) in scenes"
            :key="scene.id"
            class="relative flex-shrink-0 cursor-pointer transition-all duration-200"
            :class="[
              currentIndex === index
                ? 'ring-2 ring-dream-primary ring-offset-2 ring-offset-dream-dark scale-105 z-10'
                : 'hover:scale-102 opacity-80 hover:opacity-100',
            ]"
            :style="{
              width: `${Math.max(80, getSceneWidth(scene) * 4)}px`,
              borderTop: `3px solid ${getSceneOwnerColor(scene.owner)}`,
            }"
            @click="selectScene(index)"
          >
            <div class="relative w-full h-full pixel-border overflow-hidden bg-dream-dark">
              <img
                :src="renderThumbnail(scene)"
                :alt="scene.title"
                class="w-full h-16 object-cover"
                :style="{ imageRendering: 'pixelated' }"
              />

              <div class="absolute top-1 left-1 flex items-center gap-1">
                <span class="bg-dream-dark/80 px-1.5 py-0.5 text-xs font-pixel text-dream-primary">
                  {{ scene.actNumber }}
                </span>
                <span
                  class="text-xs px-1 py-0.5 pixel-border"
                  :style="{
                    backgroundColor: getSceneOwnerColor(scene.owner) + '30',
                    color: getSceneOwnerColor(scene.owner),
                    fontSize: '8px',
                  }"
                >
                  {{ getSceneOwnerLabel(scene.owner) }}
                </span>
              </div>

              <div class="absolute bottom-1 right-1 bg-dream-dark/80 px-1 py-0.5 text-xs text-dream-accent flex items-center gap-0.5">
                <span :style="{ color: player1Color }">{{ scene.player1Entities.length }}</span>
                <span>|</span>
                <span class="text-yellow-400">{{ scene.entities.filter(e => e.owner === 'shared').length }}</span>
                <span>|</span>
                <span :style="{ color: player2Color }">{{ scene.player2Entities.length }}</span>
              </div>

              <div v-if="currentIndex === index" class="absolute top-1 right-1">
                <div class="w-2 h-2 bg-dream-primary rounded-full animate-pulse" />
              </div>
            </div>

            <div class="mt-1 px-1">
              <p class="text-xs font-pixel text-dream-secondary truncate">
                {{ scene.title }}
              </p>
            </div>
          </div>
        </div>

        <div class="absolute bottom-0 left-0 right-0 h-1 bg-dream-border">
          <div
            class="absolute top-0 left-0 h-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 transition-all duration-300"
            :style="{
              width: `${getTimelinePosition(scenes[currentIndex] || scenes[0])}%`,
            }"
          />
        </div>
      </div>

      <div class="flex items-center justify-center gap-2">
        <button
          class="pixel-btn p-2"
          :disabled="scenes.length === 0"
          @click="emit('prev')"
        >
          <SkipBack class="w-4 h-4" />
        </button>

        <button
          class="pixel-btn-primary px-8 py-2 flex items-center gap-2"
          :disabled="scenes.length === 0"
          @click="emit('play')"
        >
          <Pause v-if="isPlaying" class="w-5 h-5" />
          <Play v-else class="w-5 h-5" />
          <span>{{ isPlaying ? '暂停' : '播放' }}</span>
        </button>

        <button
          class="pixel-btn p-2"
          :disabled="scenes.length === 0"
          @click="emit('next')"
        >
          <SkipForward class="w-4 h-4" />
        </button>
      </div>

      <div v-if="theater.scenes[currentIndex]" class="space-y-3 pt-3 border-t border-dream-border">
        <div class="flex items-start justify-between gap-2">
          <div class="flex-1">
            <div class="flex items-center gap-2 mb-1">
              <span class="font-pixel text-sm text-dream-primary">
                第 {{ theater.scenes[currentIndex].actNumber }} 幕
              </span>
              <span class="text-xs text-dream-accent flex items-center gap-1">
                <Clock class="w-3 h-3" />
                {{ formatDuration(theater.scenes[currentIndex].duration) }}
              </span>
              <span
                class="text-xs px-1.5 py-0.5 pixel-border"
                :style="{
                  backgroundColor: getSceneOwnerColor(theater.scenes[currentIndex].owner) + '30',
                  color: getSceneOwnerColor(theater.scenes[currentIndex].owner),
                }"
              >
                {{ getSceneOwnerLabel(theater.scenes[currentIndex].owner) }}主导
              </span>
            </div>
            <h4 class="font-pixel text-dream-secondary text-sm mb-1">
              {{ theater.scenes[currentIndex].title }}
            </h4>
            <p class="text-xs text-dream-accent">
              {{ theater.scenes[currentIndex].description }}
            </p>
          </div>
        </div>

        <div class="flex items-center justify-between text-xs">
          <div class="flex items-center gap-4">
            <span :style="{ color: player1Color }">
              {{ theater.player1.name }}元素: {{ theater.scenes[currentIndex].player1Entities.length }}
            </span>
            <span class="text-yellow-400">
              共享元素: {{ theater.scenes[currentIndex].entities.filter(e => e.owner === 'shared').length }}
            </span>
            <span :style="{ color: player2Color }">
              {{ theater.player2.name }}元素: {{ theater.scenes[currentIndex].player2Entities.length }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
