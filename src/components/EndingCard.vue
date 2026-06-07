<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import type { EndingBranch, AnimationFrame, PixelData } from '@/types';
import { RefreshCw, Check, Play } from 'lucide-vue-next';

interface Props {
  ending: EndingBranch;
  isSelected: boolean;
  compact?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  compact: false,
});

const emit = defineEmits<{
  select: [endingId: string];
  regenerate: [endingId: string];
  load: [endingId: string];
}>();

const canvasRef = ref<HTMLCanvasElement | null>(null);
const currentKeyFrameIndex = ref(0);
let animationInterval: ReturnType<typeof setInterval> | null = null;

const currentKeyFrame = computed<AnimationFrame | null>(() => {
  if (!props.ending.keyFrames || props.ending.keyFrames.length === 0) return null;
  return props.ending.keyFrames[currentKeyFrameIndex.value] || null;
});

const accentColor = computed(() => props.ending.theme.color);

const statusText = computed(() => {
  if (props.ending.error) return '生成失败';
  if (props.ending.isGenerating) return `生成中 ${props.ending.generationProgress}%`;
  return props.isSelected ? '已选择' : '点击选择';
});

const drawPixelData = (pixelData: PixelData, canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const scale = 4;
  const { width, height, pixels } = pixelData;

  canvas.width = width * scale;
  canvas.height = height * scale;
  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      ctx.fillStyle = pixels[y][x];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
};

const startKeyFrameAnimation = () => {
  stopKeyFrameAnimation();
  if (props.ending.keyFrames.length <= 1) return;
  
  animationInterval = setInterval(() => {
    currentKeyFrameIndex.value = (currentKeyFrameIndex.value + 1) % props.ending.keyFrames.length;
  }, 1500);
};

const stopKeyFrameAnimation = () => {
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
};

watch(() => props.ending.keyFrames, (frames) => {
  currentKeyFrameIndex.value = 0;
  if (frames && frames.length > 0 && !props.ending.isGenerating) {
    startKeyFrameAnimation();
  }
}, { deep: true, immediate: true });

watch(currentKeyFrame, (frame) => {
  if (frame && canvasRef.value) {
    drawPixelData(frame.pixelData, canvasRef.value);
  }
});

watch(() => props.ending.isGenerating, (isGenerating) => {
  if (!isGenerating && props.ending.keyFrames.length > 0) {
    startKeyFrameAnimation();
  } else {
    stopKeyFrameAnimation();
  }
});

onMounted(() => {
  if (currentKeyFrame.value && canvasRef.value && !props.ending.isGenerating) {
    drawPixelData(currentKeyFrame.value.pixelData, canvasRef.value);
    startKeyFrameAnimation();
  }
});

const handleCardClick = () => {
  if (props.ending.isGenerating || props.ending.error) return;
  emit('select', props.ending.id);
};

const handleRegenerate = (e: Event) => {
  e.stopPropagation();
  emit('regenerate', props.ending.id);
};

const handleLoad = (e: Event) => {
  e.stopPropagation();
  emit('load', props.ending.id);
};
</script>

<template>
  <div
    class="pixel-card cursor-pointer transition-all duration-300 h-full flex flex-col"
    :class="{
      'ring-4 ring-offset-2 ring-offset-dream-bg': isSelected,
      'opacity-60': ending.isGenerating || ending.error,
      'hover:scale-[1.02]': !ending.isGenerating && !ending.error,
    }"
    :style="{ '--accent-color': accentColor }"
    @click="handleCardClick"
  >
    <div
      class="p-3 border-b-2 border-dream-border flex items-center justify-between"
      :style="{ borderColor: isSelected ? accentColor : undefined }"
    >
      <div class="flex items-center gap-3">
        <div
          class="w-10 h-10 pixel-border flex items-center justify-center"
          :style="{ backgroundColor: accentColor + '30', borderColor: accentColor }"
        >
          <span class="font-pixel text-xs" :style="{ color: accentColor }">
            {{ ending.variant === 'ending-a' ? 'A' : ending.variant === 'ending-b' ? 'B' : 'C' }}
          </span>
        </div>
        <div>
          <h3 class="font-pixel text-sm" :style="{ color: accentColor }">
            {{ ending.theme.name }}
          </h3>
          <p class="text-xs text-dream-accent">{{ ending.theme.description }}</p>
        </div>
      </div>
      <div
        v-if="isSelected"
        class="w-8 h-8 rounded-full flex items-center justify-center"
        :style="{ backgroundColor: accentColor }"
      >
        <Check class="w-5 h-5 text-white" />
      </div>
    </div>

    <div class="p-4 flex-1 flex flex-col">
      <div class="relative mb-4 pixel-border overflow-hidden bg-dream-dark flex items-center justify-center" style="min-height: 140px;">
        <div v-if="ending.isGenerating" class="absolute inset-0 flex items-center justify-center bg-dream-dark/90 z-10">
          <div class="text-center">
            <RefreshCw class="w-8 h-8 animate-spin mx-auto mb-2" :style="{ color: accentColor }" />
            <div class="font-pixel text-xs" :style="{ color: accentColor }">
              {{ ending.generationProgress }}%
            </div>
            <div class="w-32 h-2 bg-dream-border mt-2 mx-auto pixel-border">
              <div
                class="h-full transition-all duration-300"
                :style="{ width: ending.generationProgress + '%', backgroundColor: accentColor }"
              />
            </div>
          </div>
        </div>

        <div v-else-if="ending.error" class="absolute inset-0 flex items-center justify-center bg-dream-dark/90 z-10">
          <div class="text-center text-dream-error">
            <div class="text-3xl mb-2">⚠️</div>
            <p class="font-pixel text-xs">{{ ending.error }}</p>
          </div>
        </div>

        <canvas
          v-else-if="currentKeyFrame"
          ref="canvasRef"
          class="max-w-full max-h-full"
          :style="{ imageRendering: 'pixelated' }"
        />

        <div v-else class="text-center text-dream-accent">
          <div class="text-4xl mb-2">✨</div>
          <p class="font-pixel text-xs">等待生成...</p>
        </div>
      </div>

      <div v-if="!compact && ending.keyFrames.length > 1" class="flex justify-center gap-2 mb-4">
        <div
          v-for="(_, index) in ending.keyFrames"
          :key="index"
          class="w-2 h-2 rounded-full transition-colors cursor-pointer"
          :class="currentKeyFrameIndex === index ? '' : 'bg-dream-border'"
          :style="{ backgroundColor: currentKeyFrameIndex === index ? accentColor : undefined }"
          @click.stop="currentKeyFrameIndex = index"
        />
      </div>

      <div class="mb-4 flex-1">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-xs px-2 py-0.5 pixel-border" :style="{ backgroundColor: accentColor + '20', color: accentColor }">
            {{ ending.theme.mood }}
          </span>
          <span v-if="ending.theater?.scenes?.length" class="text-xs text-dream-accent">
            {{ ending.theater.scenes.length }} 幕
          </span>
        </div>
        <p class="text-xs text-dream-accent line-clamp-3 leading-relaxed">
          {{ ending.summary || '剧情摘要生成中...' }}
        </p>
      </div>

      <div class="flex gap-2">
        <button
          class="flex-1 pixel-btn flex items-center justify-center gap-1 text-xs"
          :disabled="ending.isGenerating || !!ending.error"
          @click="handleRegenerate"
        >
          <RefreshCw class="w-3 h-3" />
          重新生成
        </button>
        <button
          v-if="isSelected"
          class="flex-1 pixel-btn-primary flex items-center justify-center gap-1 text-xs"
          :style="{ backgroundColor: accentColor }"
          :disabled="ending.isGenerating || !!ending.error"
          @click="handleLoad"
        >
          <Play class="w-3 h-3" />
          继续编辑
        </button>
      </div>

      <div class="mt-3 text-center">
        <span
          class="text-xs font-pixel"
          :style="{ color: ending.error ? 'var(--dream-error)' : isSelected ? accentColor : 'var(--dream-accent)' }"
        >
          {{ statusText }}
        </span>
      </div>
    </div>
  </div>
</template>
