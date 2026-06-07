<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { DualDreamTheater, ViewMode, Entity } from '@/types';
import { createDualDreamMerger } from '@/engine/dualDreamMerger';
import { useRuleSetStore } from '@/stores/ruleSet';

const props = defineProps<{
  theater: DualDreamTheater;
  viewMode: ViewMode;
  currentSceneIndex: number;
  isPlaying: boolean;
}>();

const ruleSetStore = useRuleSetStore();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const pixelSize = ref(12);

const currentScene = computed(() => props.theater.scenes[props.currentSceneIndex]);

const filteredEntities = computed(() => {
  if (!currentScene.value || !ruleSetStore.currentRuleSet) return [];

  const merger = createDualDreamMerger(ruleSetStore.currentRuleSet);
  return merger.filterEntitiesByViewMode(currentScene.value.entities, props.viewMode);
});

const viewModeLabel = computed(() => {
  const labels: Record<ViewMode, string> = {
    merged: '融合视图',
    player1: `${props.theater.player1.name}视角`,
    player2: `${props.theater.player2.name}视角`,
    diff: '差异视图',
  };
  return labels[props.viewMode];
});

const drawPixelData = () => {
  const canvas = canvasRef.value;
  const scene = currentScene.value;

  if (!canvas || !scene || !ruleSetStore.currentRuleSet) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const layoutSystem = createLayoutSystemLocal(
    ruleSetStore.currentRuleSet.gridSize.width,
    ruleSetStore.currentRuleSet.gridSize.height,
    ruleSetStore.currentRuleSet.background,
    ruleSetStore.currentRuleSet.palette
  );

  const pixelData = layoutSystem.renderEntitiesToPixelData(filteredEntities.value);
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

  drawEntityBorders(ctx, filteredEntities.value);
  drawViewModeIndicator(ctx, width, height);
};

const createLayoutSystemLocal = (width: number, height: number, bg: string, palette: string[]) => {
  return {
    renderEntitiesToPixelData: (entities: Entity[]) => {
      const pixels: string[][] = [];
      for (let y = 0; y < height; y++) {
        pixels[y] = [];
        for (let x = 0; x < width; x++) {
          pixels[y][x] = bg;
        }
      }

      entities.forEach(entity => {
        const opacity = (entity.properties?.opacity as number) ?? 1;
        for (let dy = 0; dy < entity.height; dy++) {
          for (let dx = 0; dx < entity.width; dx++) {
            const px = entity.x + dx;
            const py = entity.y + dy;
            if (px >= 0 && px < width && py >= 0 && py < height) {
              if (opacity < 1 && pixels[py][px] !== bg) {
                pixels[py][px] = mixColors(pixels[py][px], entity.color, opacity);
              } else {
                pixels[py][px] = entity.color;
              }
            }
          }
        }
      });

      return { width, height, pixels };
    },
  };
};

const mixColors = (color1: string, color2: string, ratio: number): string => {
  const hex = (c: string) => parseInt(c, 16);
  const r1 = hex(color1.slice(1, 3));
  const g1 = hex(color1.slice(3, 5));
  const b1 = hex(color1.slice(5, 7));
  const r2 = hex(color2.slice(1, 3));
  const g2 = hex(color2.slice(3, 5));
  const b2 = hex(color2.slice(5, 7));

  const r = Math.round(r1 * (1 - ratio) + r2 * ratio);
  const g = Math.round(g1 * (1 - ratio) + g2 * ratio);
  const b = Math.round(b1 * (1 - ratio) + b2 * ratio);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const drawEntityBorders = (ctx: CanvasRenderingContext2D, entities: Entity[]) => {
  entities.forEach(entity => {
    const x = entity.x * pixelSize.value;
    const y = entity.y * pixelSize.value;
    const w = entity.width * pixelSize.value;
    const h = entity.height * pixelSize.value;

    ctx.save();

    let borderColor = '';
    if (entity.owner === 'player1') {
      borderColor = props.theater.player1.color;
    } else if (entity.owner === 'player2') {
      borderColor = props.theater.player2.color;
    } else if (entity.owner === 'shared') {
      borderColor = '#FFD700';
    }

    if (borderColor && props.viewMode === 'merged') {
      ctx.strokeStyle = borderColor;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 2]);
      ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
      ctx.setLineDash([]);
    }

    if (props.viewMode === 'diff' && entity.properties?.highlightDiff) {
      ctx.strokeStyle = entity.owner === 'player1' ? '#FF6B6B' :
                        entity.owner === 'player2' ? '#4ECDC4' : '#FFD700';
      ctx.lineWidth = 3;
      ctx.strokeRect(x - 2, y - 2, w + 4, h + 4);
    }

    ctx.restore();
  });
};

const drawViewModeIndicator = (ctx: CanvasRenderingContext2D, width: number, height: number) => {
  const indicatorWidth = 120;
  const indicatorHeight = 24;
  const x = width * pixelSize.value - indicatorWidth - 8;
  const y = 8;

  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(x, y, indicatorWidth, indicatorHeight);

  let indicatorColor = '#9B59B6';
  if (props.viewMode === 'player1') indicatorColor = props.theater.player1.color;
  else if (props.viewMode === 'player2') indicatorColor = props.theater.player2.color;
  else if (props.viewMode === 'diff') indicatorColor = '#FFD700';

  ctx.strokeStyle = indicatorColor;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, indicatorWidth, indicatorHeight);

  ctx.fillStyle = indicatorColor;
  ctx.font = '10px "Press Start 2P", monospace';
  ctx.fillText(viewModeLabel.value, x + 8, y + 16);
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
  if (!containerRef.value || !currentScene.value || !ruleSetStore.currentRuleSet) return;

  const containerWidth = containerRef.value.clientWidth - 32;
  const containerHeight = containerRef.value.clientHeight - 32;
  const { width, height } = ruleSetStore.currentRuleSet.gridSize;

  const scaleX = containerWidth / width;
  const scaleY = containerHeight / height;
  const scale = Math.min(scaleX, scaleY);

  pixelSize.value = Math.max(4, Math.min(24, Math.floor(scale)));
  drawPixelData();
};

watch([() => props.currentSceneIndex, () => props.viewMode, () => filteredEntities], () => {
  drawPixelData();
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
    <canvas
      ref="canvasRef"
      class="cursor-move select-none"
      :style="{ imageRendering: 'pixelated' }"
      @wheel.passive="handleWheel"
    />

    <div class="absolute bottom-2 right-2 flex items-center gap-2">
      <div class="text-xs text-dream-accent bg-dream-dark/80 px-2 py-1 pixel-border">
        缩放: {{ pixelSize }}x (Ctrl+滚轮)
      </div>
    </div>

    <div
      v-if="currentScene"
      class="absolute top-2 left-2 bg-dream-dark/90 pixel-border p-3 max-w-xs"
    >
      <div class="flex items-center gap-2 mb-2">
        <span class="font-pixel text-xs text-dream-primary">
          第 {{ currentScene.actNumber }} 幕
        </span>
        <span class="text-dream-accent text-xs">
          {{ (currentScene.duration / 1000).toFixed(1) }}s
        </span>
        <span
          class="text-xs px-1.5 py-0.5 pixel-border"
          :style="{
            backgroundColor: currentScene.owner === 'player1' ? theater.player1.color + '30' :
                             currentScene.owner === 'player2' ? theater.player2.color + '30' : '#FFD70030',
            color: currentScene.owner === 'player1' ? theater.player1.color :
                   currentScene.owner === 'player2' ? theater.player2.color : '#FFD700'
          }"
        >
          {{ currentScene.owner === 'player1' ? theater.player1.name :
             currentScene.owner === 'player2' ? theater.player2.name : '共享' }}
        </span>
      </div>
      <h4 class="font-pixel text-dream-secondary text-sm mb-1">
        {{ currentScene.title }}
      </h4>
      <p class="text-xs text-dream-accent line-clamp-2">
        {{ currentScene.description }}
      </p>
    </div>

    <div
      class="absolute bottom-2 left-2 flex gap-2"
    >
      <div
        class="flex items-center gap-1 text-xs px-2 py-1 pixel-border"
        :style="{ backgroundColor: theater.player1.color + '20', borderColor: theater.player1.color + '40' }"
      >
        <div
          class="w-2 h-2 rounded-full"
          :style="{ backgroundColor: theater.player1.color }"
        />
        <span :style="{ color: theater.player1.color }">
          {{ currentScene?.player1Entities.length || 0 }}
        </span>
      </div>
      <div
        class="flex items-center gap-1 text-xs px-2 py-1 pixel-border"
        style="background-color: #FFD70020; border-color: #FFD70040;"
      >
        <div class="w-2 h-2 rounded-full" style="background-color: #FFD700;" />
        <span style="color: #FFD700;">
          {{ currentScene?.entities.filter(e => e.owner === 'shared').length || 0 }}
        </span>
      </div>
      <div
        class="flex items-center gap-1 text-xs px-2 py-1 pixel-border"
        :style="{ backgroundColor: theater.player2.color + '20', borderColor: theater.player2.color + '40' }"
      >
        <div
          class="w-2 h-2 rounded-full"
          :style="{ backgroundColor: theater.player2.color }"
        />
        <span :style="{ color: theater.player2.color }">
          {{ currentScene?.player2Entities.length || 0 }}
        </span>
      </div>
    </div>
  </div>
</template>
