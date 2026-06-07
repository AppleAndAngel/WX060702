<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { X, GitCompare, CircleDot, Layers } from 'lucide-vue-next';
import { useDualDreamStore } from '@/stores/dualDream';
import { useRuleSetStore } from '@/stores/ruleSet';
import { createDualDreamMerger } from '@/engine/dualDreamMerger';
import type { DualDreamDiff } from '@/types';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const dualDreamStore = useDualDreamStore();
const ruleSetStore = useRuleSetStore();

const activeSceneIndex = ref(0);
const diffData = ref<DualDreamDiff[]>([]);
const showPixelDiff = ref(false);
const pixelDiffCanvas = ref<HTMLCanvasElement | null>(null);

const currentTheater = computed(() => dualDreamStore.currentDualTheater);
const player1 = computed(() => dualDreamStore.player1);
const player2 = computed(() => dualDreamStore.player2);
const currentSceneDiff = computed(() => diffData.value[activeSceneIndex.value]);
const allScenesDiff = computed(() => diffData.value);

const totalStats = computed(() => {
  let p1Only = 0;
  let p2Only = 0;
  let shared = 0;

  diffData.value.forEach(diff => {
    p1Only += diff.player1Only.length;
    p2Only += diff.player2Only.length;
    shared += diff.shared.length;
  });

  return { p1Only, p2Only, shared };
});

const loadDiffData = () => {
  if (!currentTheater.value) return;
  diffData.value = dualDreamStore.getAllScenesDiff();
  activeSceneIndex.value = dualDreamStore.currentSceneIndex;
};

const renderPixelDiff = () => {
  if (!currentTheater.value || !pixelDiffCanvas.value || !ruleSetStore.currentRuleSet) return;

  const scene = currentTheater.value.scenes[activeSceneIndex.value];
  if (!scene) return;

  const merger = createDualDreamMerger(ruleSetStore.currentRuleSet);
  const diffPixelData = merger.generateDiffPixelData(
    scene.player1Entities,
    scene.player2Entities,
    scene.entities
  );

  const canvas = pixelDiffCanvas.value;
  const { width, height } = scene.frame.pixelData;
  const scale = 6;

  canvas.width = width * scale * 2 + scale;
  canvas.height = height * scale * 2 + scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const renderPixels = (pixels: string[][], offsetX: number, offsetY: number, label: string, color: string) => {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        ctx.fillStyle = pixels[y][x];
        ctx.fillRect(offsetX + x * scale, offsetY + y * scale, scale, scale);
      }
    }
    ctx.fillStyle = color;
    ctx.font = '10px "Press Start 2P", monospace';
    ctx.fillText(label, offsetX, offsetY - 4);
  };

  renderPixels(diffPixelData.player1, 0, 20, `${player1.value.name}的梦境`, player1.value.color);
  renderPixels(diffPixelData.player2, width * scale + scale, 20, `${player2.value.name}的梦境`, player2.value.color);
  renderPixels(diffPixelData.merged, 0, height * scale + scale + 20, '融合结果', '#9B59B6');
  renderPixels(diffPixelData.diff, width * scale + scale, height * scale + scale + 20, '差异图', '#FFD700');

  ctx.fillStyle = '#FF6B6B';
  ctx.fillRect(0, canvas.height - 60, 12, 12);
  ctx.fillStyle = '#e0e0e0';
  ctx.font = '8px "Press Start 2P", monospace';
  ctx.fillText(`仅${player1.value.name}`, 16, canvas.height - 50);

  ctx.fillStyle = '#4ECDC4';
  ctx.fillRect(120, canvas.height - 60, 12, 12);
  ctx.fillStyle = '#e0e0e0';
  ctx.fillText(`仅${player2.value.name}`, 136, canvas.height - 50);

  ctx.fillStyle = '#FFD700';
  ctx.fillRect(240, canvas.height - 60, 12, 12);
  ctx.fillStyle = '#e0e0e0';
  ctx.fillText('双方共有', 256, canvas.height - 50);

  ctx.fillStyle = '#9B59B6';
  ctx.fillRect(360, canvas.height - 60, 12, 12);
  ctx.fillStyle = '#e0e0e0';
  ctx.fillText('重叠不同', 376, canvas.height - 50);
};

watch(() => props.visible, (newVal) => {
  if (newVal) {
    loadDiffData();
  }
});

watch([activeSceneIndex, showPixelDiff], () => {
  if (showPixelDiff.value) {
    setTimeout(renderPixelDiff, 50);
  }
});

const handleClose = () => {
  emit('close');
};

const handleSceneClick = (index: number) => {
  activeSceneIndex.value = index;
  dualDreamStore.setCurrentScene(index);
};

const jumpToScene = (index: number) => {
  dualDreamStore.setCurrentScene(index);
  handleClose();
};
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible && currentTheater"
        class="fixed inset-0 bg-dream-dark/95 flex items-center justify-center z-50 p-4"
        @click.self="handleClose"
      >
        <div class="relative max-w-5xl w-full max-h-[90vh] overflow-auto pixel-card">
          <button
            class="absolute -top-2 -right-2 pixel-btn w-8 h-8 flex items-center justify-center z-10"
            @click="handleClose"
          >
            <X class="w-4 h-4" />
          </button>

          <div class="space-y-6">
            <div class="flex items-center gap-3">
              <GitCompare class="w-6 h-6 text-dream-primary" />
              <div>
                <h2 class="font-pixel text-lg text-dream-primary">梦境融合差异分析</h2>
                <p class="text-dream-accent text-sm">对比双方梦境元素的异同</p>
              </div>
            </div>

            <div class="grid grid-cols-3 gap-4">
              <div class="pixel-border p-4 text-center" :style="{ borderColor: player1.color + '60' }">
                <div class="text-2xl font-pixel" :style="{ color: player1.color }">
                  {{ totalStats.p1Only }}
                </div>
                <div class="text-xs text-dream-accent">仅{{ player1.name }}的元素</div>
              </div>
              <div class="pixel-border p-4 text-center" :style="{ borderColor: '#FFD70060' }">
                <div class="text-2xl font-pixel text-yellow-400">
                  {{ totalStats.shared }}
                </div>
                <div class="text-xs text-dream-accent">双方共享元素</div>
              </div>
              <div class="pixel-border p-4 text-center" :style="{ borderColor: player2.color + '60' }">
                <div class="text-2xl font-pixel" :style="{ color: player2.color }">
                  {{ totalStats.p2Only }}
                </div>
                <div class="text-xs text-dream-accent">仅{{ player2.name }}的元素</div>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <h3 class="font-pixel text-sm text-dream-secondary">场景差异详情</h3>
                <button
                  class="pixel-btn text-xs flex items-center gap-1"
                  @click="showPixelDiff = !showPixelDiff"
                >
                  <Layers class="w-3 h-3" />
                  {{ showPixelDiff ? '隐藏' : '显示' }}像素差异图
                </button>
              </div>

              <div class="flex gap-2 overflow-x-auto pb-2">
                <button
                  v-for="(diff, index) in allScenesDiff"
                  :key="index"
                  class="flex-shrink-0 px-4 py-2 pixel-border text-xs transition-all"
                  :class="[
                    activeSceneIndex === index
                      ? 'bg-dream-primary/30 border-dream-primary'
                      : 'bg-dream-dark hover:bg-dream-primary/10'
                  ]"
                  @click="handleSceneClick(index)"
                >
                  第{{ index + 1 }}幕
                  <span class="ml-2 text-dream-accent">
                    ({{ diff.player1Only.length }}|{{ diff.shared.length }}|{{ diff.player2Only.length }})
                  </span>
                </button>
              </div>
            </div>

            <div v-if="currentSceneDiff" class="space-y-4">
              <div class="flex items-center justify-between">
                <h4 class="font-pixel text-sm text-dream-primary">
                  第{{ activeSceneIndex + 1 }}幕：{{ currentTheater.scenes[activeSceneIndex]?.title }}
                </h4>
                <button
                  class="pixel-btn text-xs"
                  @click="jumpToScene(activeSceneIndex)"
                >
                  跳转到该场景
                </button>
              </div>

              <div v-if="showPixelDiff" class="pixel-border p-4 bg-dream-dark">
                <canvas ref="pixelDiffCanvas" class="w-full" />
              </div>

              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <CircleDot class="w-4 h-4" :style="{ color: player1.color }" />
                    <span class="text-sm font-pixel" :style="{ color: player1.color }">
                      仅{{ player1.name }}
                    </span>
                    <span class="text-xs text-dream-accent">
                      ({{ currentSceneDiff.player1Only.length }}个)
                    </span>
                  </div>
                  <div v-if="currentSceneDiff.player1Only.length === 0" class="text-xs text-dream-accent italic">
                    无独有元素
                  </div>
                  <div
                    v-for="entity in currentSceneDiff.player1Only"
                    :key="entity.id"
                    class="pixel-border p-2 text-xs"
                    :style="{ borderColor: player1.color + '40', backgroundColor: player1.color + '10' }"
                  >
                    <div class="flex items-center gap-2">
                      <div
                        class="w-4 h-4 pixel-border"
                        :style="{ backgroundColor: entity.color }"
                      />
                      <span class="text-dream-secondary">{{ entity.name }}</span>
                    </div>
                    <div class="text-dream-accent mt-1">类型: {{ entity.type }}</div>
                  </div>
                </div>

                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <CircleDot class="w-4 h-4 text-yellow-400" />
                    <span class="text-sm font-pixel text-yellow-400">共享元素</span>
                    <span class="text-xs text-dream-accent">
                      ({{ currentSceneDiff.shared.length }}个)
                    </span>
                  </div>
                  <div v-if="currentSceneDiff.shared.length === 0" class="text-xs text-dream-accent italic">
                    无共享元素
                  </div>
                  <div
                    v-for="entity in currentSceneDiff.shared"
                    :key="entity.id"
                    class="pixel-border p-2 text-xs"
                    style="border-color: #FFD70040; background-color: #FFD70010;"
                  >
                    <div class="flex items-center gap-2">
                      <div
                        class="w-4 h-4 pixel-border"
                        :style="{ backgroundColor: entity.color }"
                      />
                      <span class="text-dream-secondary">{{ entity.name }}</span>
                    </div>
                    <div class="text-dream-accent mt-1">类型: {{ entity.type }}</div>
                    <div class="text-yellow-400/80 mt-1">✨ 双方梦境的共鸣点</div>
                  </div>
                </div>

                <div class="space-y-2">
                  <div class="flex items-center gap-2">
                    <CircleDot class="w-4 h-4" :style="{ color: player2.color }" />
                    <span class="text-sm font-pixel" :style="{ color: player2.color }">
                      仅{{ player2.name }}
                    </span>
                    <span class="text-xs text-dream-accent">
                      ({{ currentSceneDiff.player2Only.length }}个)
                    </span>
                  </div>
                  <div v-if="currentSceneDiff.player2Only.length === 0" class="text-xs text-dream-accent italic">
                    无独有元素
                  </div>
                  <div
                    v-for="entity in currentSceneDiff.player2Only"
                    :key="entity.id"
                    class="pixel-border p-2 text-xs"
                    :style="{ borderColor: player2.color + '40', backgroundColor: player2.color + '10' }"
                  >
                    <div class="flex items-center gap-2">
                      <div
                        class="w-4 h-4 pixel-border"
                        :style="{ backgroundColor: entity.color }"
                      />
                      <span class="text-dream-secondary">{{ entity.name }}</span>
                    </div>
                    <div class="text-dream-accent mt-1">类型: {{ entity.type }}</div>
                  </div>
                </div>
              </div>
            </div>

            <div class="pixel-border p-4 bg-dream-dark">
              <h4 class="font-pixel text-sm text-dream-secondary mb-2">融合说明</h4>
              <div class="text-xs text-dream-accent space-y-1">
                <p><span :style="{ color: player1.color }">●</span> 红色区域：仅存在于{{ player1.name }}梦境中的元素</p>
                <p><span :style="{ color: player2.color }">●</span> 青色区域：仅存在于{{ player2.name }}梦境中的元素</p>
                <p><span class="text-yellow-400">●</span> 金色区域：双方梦境中都存在的相似元素</p>
                <p><span class="text-purple-400">●</span> 紫色区域：双方在同一位置但不同的元素</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
