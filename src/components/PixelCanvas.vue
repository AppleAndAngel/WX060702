<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useDreamStore } from '@/stores/dream';
import type { PixelData } from '@/types';

const dreamStore = useDreamStore();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const pixelSize = ref(12);

const currentPixelData = computed<PixelData | null>(() => {
  return dreamStore.currentScene?.frame.pixels || null;
});

const isEmpty = computed(() => !currentPixelData.value);

const drawPixelData = () => {
  const canvas = canvasRef.value;
  const pixelData = currentPixelData.value;

  if (!canvas || !pixelData) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height, pixels } = pixelData;

  canvas.width = width * pixelSize.value;
  canvas.height = height * pixelSize.value;

  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      ctx.fillStyle = pixels[y][x];
      ctx.fillRect(
        x * pixelSize.value,
        y * pixelSize.value,
        pixelSize.value,
        pixelSize.value
      );
    }
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
  for (let y = 0; y <= height; y++) {
    ctx.beginPath();
    ctx.moveTo(0, y * pixelSize.value);
    ctx.lineTo(width * pixelSize.value, y * pixelSize.value);
    ctx.stroke();
  }
  for (let x = 0; x <= width; x++) {
    ctx.beginPath();
    ctx.moveTo(x * pixelSize.value, 0);
    ctx.lineTo(x * pixelSize.value, height * pixelSize.value);
    ctx.stroke();
  }
};

const handleWheel = (e: WheelEvent) => {
  if (e.ctrlKey || e.metaKey) {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -2 : 2;
    pixelSize.value = Math.max(4, Math.min(24, pixelSize.value + delta));
    drawPixelData();
  }
};

const fitToContainer = () => {
  if (!containerRef.value || !currentPixelData.value) return;

  const containerWidth = containerRef.value.clientWidth - 32;
  const containerHeight = containerRef.value.clientHeight - 32;
  const { width, height } = currentPixelData.value;

  const scaleX = containerWidth / width;
  const scaleY = containerHeight / height;
  const scale = Math.min(scaleX, scaleY);

  pixelSize.value = Math.max(4, Math.min(24, Math.floor(scale)));
  drawPixelData();
};

watch(currentPixelData, () => {
  drawPixelData();
  fitToContainer();
}, { deep: true });

watch(pixelSize, () => {
  drawPixelData();
});

let resizeObserver: ResizeObserver | null = null;

onMounted(() => {
  if (containerRef.value) {
    resizeObserver = new ResizeObserver(fitToContainer);
    resizeObserver.observe(containerRef.value);
  }
  drawPixelData();
  setTimeout(fitToContainer, 100);
});

onUnmounted(() => {
  if (resizeObserver) {
    resizeObserver.disconnect();
  }
});
</script>

<template>
  <div ref="containerRef" class="relative w-full h-96 flex items-center justify-center bg-dream-dark pixel-border overflow-hidden">
    <div v-if="isEmpty" class="text-center text-dream-accent">
      <div class="text-6xl mb-4">🌙</div>
      <p class="font-pixel text-sm">等待梦境生成...</p>
      <p class="text-xs mt-2">输入你的梦境描述，然后点击生成</p>
    </div>

    <canvas
      v-else
      ref="canvasRef"
      class="cursor-move select-none"
      :style="{ imageRendering: 'pixelated' }"
      @wheel.passive="handleWheel"
    />

    <div v-if="!isEmpty" class="absolute bottom-2 right-2 text-xs text-dream-accent bg-dream-dark/80 px-2 py-1 pixel-border">
      缩放: {{ pixelSize }}x (Ctrl+滚轮)
    </div>

    <div
      v-if="dreamStore.currentScene && !dreamStore.isGenerating"
      class="absolute top-2 left-2 bg-dream-dark/90 pixel-border p-3 max-w-xs"
    >
      <div class="flex items-center gap-2 mb-2">
        <span class="font-pixel text-xs text-dream-primary">
          第 {{ dreamStore.currentScene.actNumber }} 幕
        </span>
        <span class="text-dream-accent text-xs">
          {{ (dreamStore.currentScene.duration / 1000).toFixed(1) }}s
        </span>
      </div>
      <h4 class="font-pixel text-dream-secondary text-sm mb-1">
        {{ dreamStore.currentScene.title }}
      </h4>
      <p class="text-xs text-dream-accent line-clamp-2">
        {{ dreamStore.currentScene.description }}
      </p>
    </div>

    <div
      v-if="dreamStore.currentScene?.isGenerating"
      class="absolute inset-0 bg-dream-dark/80 flex items-center justify-center"
    >
      <div class="text-center">
        <div class="animate-spin text-4xl mb-2">✨</div>
        <p class="font-pixel text-dream-primary text-sm">重新生成中...</p>
      </div>
    </div>
  </div>
</template>
