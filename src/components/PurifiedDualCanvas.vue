<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue';
import type { DreamScene, PurifiedScene, PurifyViewMode } from '@/types';
import { createLayoutSystem } from '@/engine/layoutSystem';
import { healingSanctuary } from '@/data/ruleSets/healingSanctuary';

const props = defineProps<{
  originalScene?: DreamScene | null;
  purifiedScene?: PurifiedScene | null;
  viewMode: PurifyViewMode;
  isPlaying?: boolean;
}>();

const emit = defineEmits<{
  (e: 'frame-click'): void;
}>();

const originalCanvas = ref<HTMLCanvasElement | null>(null);
const purifiedCanvas = ref<HTMLCanvasElement | null>(null);
const compareContainer = ref<HTMLDivElement | null>(null);

const scale = 8;

const showOriginal = computed(() => 
  props.viewMode === 'original' || props.viewMode === 'compare'
);

const showPurified = computed(() => 
  props.viewMode === 'purified' || props.viewMode === 'compare'
);

const renderScene = (
  canvas: HTMLCanvasElement,
  scene: DreamScene | PurifiedScene | null | undefined,
  background: string
) => {
  if (!canvas || !scene) return;

  const { pixelData } = scene.frame;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  canvas.width = pixelData.width * scale;
  canvas.height = pixelData.height * scale;

  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < pixelData.height; y++) {
    for (let x = 0; x < pixelData.width; x++) {
      ctx.fillStyle = pixelData.pixels[y][x];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
};

const renderOriginal = () => {
  if (originalCanvas.value && props.originalScene) {
    renderScene(originalCanvas.value, props.originalScene, '#0a0a0f');
  }
};

const renderPurified = () => {
  if (purifiedCanvas.value && props.purifiedScene) {
    renderScene(purifiedCanvas.value, props.purifiedScene, healingSanctuary.background);
  }
};

watch(
  () => [props.originalScene, props.purifiedScene, props.viewMode],
  () => {
    if (showOriginal.value) {
      setTimeout(renderOriginal, 0);
    }
    if (showPurified.value) {
      setTimeout(renderPurified, 0);
    }
  },
  { deep: true, immediate: true }
);

const handleClick = () => {
  emit('frame-click');
};

onMounted(() => {
  if (showOriginal.value) {
    renderOriginal();
  }
  if (showPurified.value) {
    renderPurified();
  }
});
</script>

<template>
  <div class="purified-dual-canvas" ref="compareContainer">
    <div
      v-if="viewMode === 'original'"
      class="canvas-wrapper single"
    >
      <div class="canvas-label original">
        <span class="font-pixel text-xs">原始梦境</span>
      </div>
      <canvas
        ref="originalCanvas"
        class="pixel-canvas"
        :class="{ 'cursor-pointer': true }"
        @click="handleClick"
      />
    </div>

    <div
      v-else-if="viewMode === 'purified'"
      class="canvas-wrapper single"
    >
      <div class="canvas-label purified">
        <span class="font-pixel text-xs">净化梦境</span>
        <span class="ml-2 text-xs">✨</span>
      </div>
      <canvas
        ref="purifiedCanvas"
        class="pixel-canvas"
        :class="{ 'cursor-pointer': true }"
        @click="handleClick"
      />
    </div>

    <div
      v-else-if="viewMode === 'compare'"
      class="canvas-wrapper compare"
    >
      <div class="compare-side">
        <div class="canvas-label original">
          <span class="font-pixel text-xs">原始梦境</span>
        </div>
        <canvas
          ref="originalCanvas"
          class="pixel-canvas"
          :class="{ 'cursor-pointer': true }"
          @click="handleClick"
        />
      </div>

      <div class="compare-divider">
        <div class="divider-arrow">→</div>
        <div class="divider-text font-pixel text-xs">净化</div>
        <div class="divider-arrow">→</div>
      </div>

      <div class="compare-side">
        <div class="canvas-label purified">
          <span class="font-pixel text-xs">净化梦境</span>
          <span class="ml-2 text-xs">✨</span>
        </div>
        <canvas
          ref="purifiedCanvas"
          class="pixel-canvas"
          :class="{ 'cursor-pointer': true }"
          @click="handleClick"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.purified-dual-canvas {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.canvas-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.canvas-wrapper.single {
  width: 100%;
  max-width: 400px;
}

.canvas-wrapper.compare {
  flex-direction: row;
  justify-content: center;
  align-items: flex-start;
  gap: 1.5rem;
  width: 100%;
  flex-wrap: wrap;
}

.compare-side {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.canvas-label {
  padding: 0.375rem 0.75rem;
  border-radius: 4px;
  font-weight: 500;
}

.canvas-label.original {
  background-color: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 2px solid rgba(239, 68, 68, 0.3);
}

.canvas-label.purified {
  background-color: rgba(34, 197, 94, 0.15);
  color: #22c55e;
  border: 2px solid rgba(34, 197, 94, 0.3);
}

.compare-divider {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 1rem 0.5rem;
  color: var(--dream-primary);
}

.divider-arrow {
  font-size: 1.25rem;
  color: var(--dream-primary);
  animation: pulse 1.5s ease-in-out infinite;
}

.divider-text {
  color: var(--dream-accent);
  font-size: 0.625rem;
}

.pixel-canvas {
  border: 3px solid var(--dream-border);
  box-shadow: 4px 4px 0 rgba(0, 0, 0, 0.4);
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}

.pixel-canvas:hover {
  border-color: var(--dream-primary);
  box-shadow: 4px 4px 0 rgba(233, 69, 96, 0.3);
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: translateX(0);
  }
  50% {
    opacity: 0.6;
    transform: translateX(4px);
  }
}

@media (max-width: 768px) {
  .canvas-wrapper.compare {
    flex-direction: column;
    gap: 1rem;
  }

  .compare-divider {
    flex-direction: row;
    padding: 0.5rem 1rem;
  }

  .divider-arrow {
    transform: rotate(90deg);
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
      transform: rotate(90deg) translateX(0);
    }
    50% {
      opacity: 0.6;
      transform: rotate(90deg) translateX(4px);
    }
  }
}
</style>
