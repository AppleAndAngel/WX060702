<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useDreamStore } from '@/stores/dream';
import { createDreamMapGenerator } from '@/engine/dreamMapGenerator';
import { createMapExporter } from '@/exporters/mapExporter';
import type { DreamMap, MapNode, MapPlaybackState, MapViewMode } from '@/types/dreamMap';
import DreamMapCanvas from '@/components/DreamMapCanvas.vue';
import MapNodeDetail from '@/components/MapNodeDetail.vue';
import { MapPin, Play, Pause, Settings, Download, X, Image, FileText } from 'lucide-vue-next';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const dreamStore = useDreamStore();
const dreamMap = ref<DreamMap | null>(null);
const selectedNode = ref<MapNode | null>(null);
const showExportOptions = ref(false);
const isGeneratingMap = ref(false);

const viewMode = ref<MapViewMode>('explore');
const playbackState = ref<MapPlaybackState>({
  isPlaying: false,
  currentNodeIndex: 0,
  progress: 0,
  speed: 1,
});

const exportOptions = ref({
  format: 'png' as 'png' | 'jpeg',
  quality: 0.95,
  scale: 2,
  includeTitle: true,
  includeLegend: true,
  includeNodeLabels: true,
  includeWatermark: true,
});

const playbackSpeedOptions = [
  { value: 0.5, label: '0.5x' },
  { value: 1, label: '1x' },
  { value: 1.5, label: '1.5x' },
  { value: 2, label: '2x' },
];

const hasDreamTheater = computed(() => !!dreamStore.currentDreamTheater);

const generateMap = () => {
  if (!dreamStore.currentDreamTheater) return;

  isGeneratingMap.value = true;

  try {
    const mapGenerator = createDreamMapGenerator();
    dreamMap.value = mapGenerator.generateMap(dreamStore.currentDreamTheater);
    playbackState.value.currentNodeIndex = 0;
    playbackState.value.progress = 0;
  } catch (error) {
    console.error('生成地图失败:', error);
  } finally {
    isGeneratingMap.value = false;
  }
};

const handleNodeClick = (node: MapNode) => {
  if (viewMode.value === 'playback') return;

  selectedNode.value = node;

  if (dreamMap.value) {
    const mapGenerator = createDreamMapGenerator();
    dreamMap.value = mapGenerator.updateNodeVisited(dreamMap.value, node.id);
    dreamMap.value = mapGenerator.updateCurrentNode(dreamMap.value, node.id);
  }

  const sceneIndex = dreamStore.currentDreamTheater?.scenes.findIndex(
    s => s.id === node.sceneId
  );
  if (sceneIndex !== undefined && sceneIndex >= 0) {
    dreamStore.setCurrentScene(sceneIndex);
  }
};

const handleNodeHover = (node: MapNode | null) => {
};

const handleCloseNodeDetail = () => {
  selectedNode.value = null;
};

const handlePrevNode = () => {
  if (!dreamMap.value) return;
  const currentIndex = dreamMap.value.nodes.findIndex(
    n => n.id === selectedNode.value?.id
  );
  if (currentIndex > 0) {
    handleNodeClick(dreamMap.value.nodes[currentIndex - 1]);
  }
};

const handleNextNode = () => {
  if (!dreamMap.value) return;
  const currentIndex = dreamMap.value.nodes.findIndex(
    n => n.id === selectedNode.value?.id
  );
  if (currentIndex < dreamMap.value.nodes.length - 1) {
    handleNodeClick(dreamMap.value.nodes[currentIndex + 1]);
  }
};

const togglePlayback = () => {
  playbackState.value.isPlaying = !playbackState.value.isPlaying;
  if (playbackState.value.isPlaying) {
    viewMode.value = 'playback';
    startPlayback();
  } else {
    stopPlayback();
  }
};

let playbackInterval: number | null = null;

const startPlayback = () => {
  if (!dreamMap.value) return;

  const nodeDuration = 2000 / playbackState.value.speed;
  const transitionDuration = 1000 / playbackState.value.speed;

  const playStep = () => {
    if (!playbackState.value.isPlaying || !dreamMap.value) return;

    const currentIndex = playbackState.value.currentNodeIndex;
    const totalNodes = dreamMap.value.nodes.length;

    if (playbackState.value.progress >= 1) {
      playbackState.value.progress = 0;
      playbackState.value.currentNodeIndex++;

      if (playbackState.value.currentNodeIndex >= totalNodes) {
        stopPlayback();
        playbackState.value.currentNodeIndex = 0;
        return;
      }

      const nextNode = dreamMap.value.nodes[playbackState.value.currentNodeIndex];
      handleNodeClick(nextNode);
    } else {
      playbackState.value.progress += 0.05;
    }

    dreamMap.value = { ...dreamMap.value };
  };

  playbackInterval = window.setInterval(playStep, 50);
};

const stopPlayback = () => {
  playbackState.value.isPlaying = false;
  if (playbackInterval) {
    clearInterval(playbackInterval);
    playbackInterval = null;
  }
};

const handlePrevNodePlayback = () => {
  if (!dreamMap.value) return;
  if (playbackState.value.currentNodeIndex > 0) {
    playbackState.value.currentNodeIndex--;
    playbackState.value.progress = 0;
    const prevNode = dreamMap.value.nodes[playbackState.value.currentNodeIndex];
    handleNodeClick(prevNode);
  }
};

const handleNextNodePlayback = () => {
  if (!dreamMap.value) return;
  if (playbackState.value.currentNodeIndex < dreamMap.value.nodes.length - 1) {
    playbackState.value.currentNodeIndex++;
    playbackState.value.progress = 0;
    const nextNode = dreamMap.value.nodes[playbackState.value.currentNodeIndex];
    handleNodeClick(nextNode);
  }
};

const handleExport = () => {
  showExportOptions.value = true;
};

const executeExport = async () => {
  if (!dreamMap.value) return;

  try {
    const exporter = createMapExporter(exportOptions.value);
    await exporter.exportMap(dreamMap.value);
    showExportOptions.value = false;
  } catch (error) {
    console.error('导出失败:', error);
    alert('导出失败，请重试');
  }
};

const toggleViewMode = () => {
  if (viewMode.value === 'explore') {
    viewMode.value = 'playback';
  } else {
    viewMode.value = 'explore';
    stopPlayback();
  }
};

watch(() => props.visible, (newVal) => {
  if (newVal && hasDreamTheater.value) {
    generateMap();
  }
});

watch(hasDreamTheater, (newVal) => {
  if (newVal && props.visible && !dreamMap.value) {
    generateMap();
  }
});

watch(() => dreamStore.currentDreamTheater, () => {
  if (props.visible) {
    generateMap();
  }
}, { deep: true });

onMounted(() => {
  if (props.visible && hasDreamTheater.value) {
    generateMap();
  }
});

onUnmounted(() => {
  stopPlayback();
});
</script>

<template>
  <div
    v-if="visible"
    class="fixed inset-0 bg-dream-dark/95 flex flex-col z-50"
  >
    <div class="flex items-center justify-between px-6 py-4 bg-dream-bg border-b-4 border-dream-border">
      <div class="flex items-center gap-4">
        <div class="w-10 h-10 bg-dream-primary flex items-center justify-center pixel-border">
          <MapPin class="w-5 h-5 text-white" />
        </div>
        <div>
          <h2 class="font-pixel text-lg text-dream-primary text-glow-primary">梦境地图</h2>
          <p class="text-dream-accent text-xs">
            {{ dreamMap ? `共 ${dreamMap.nodes.length} 个场景节点` : '等待生成...' }}
          </p>
        </div>
      </div>

      <div class="flex items-center gap-3">
        <div
          v-if="dreamMap"
          class="flex items-center gap-2 bg-dream-dark px-3 py-1.5 pixel-border"
        >
          <span class="text-xs text-dream-accent">模式:</span>
          <button
            class="text-xs px-2 py-1 transition-colors"
            :class="viewMode === 'explore' ? 'bg-dream-primary text-white' : 'text-dream-accent hover:text-white'"
            @click="toggleViewMode"
          >
            探索
          </button>
          <button
            class="text-xs px-2 py-1 transition-colors"
            :class="viewMode === 'playback' ? 'bg-dream-primary text-white' : 'text-dream-accent hover:text-white'"
            @click="toggleViewMode"
          >
            漫游
          </button>
        </div>

        <div v-if="viewMode === 'playback' && dreamMap" class="flex items-center gap-2">
          <span class="text-xs text-dream-accent">速度:</span>
          <select
            v-model="playbackState.speed"
            class="pixel-input text-xs py-1 w-16"
          >
            <option v-for="opt in playbackSpeedOptions" :key="opt.value" :value="opt.value">
              {{ opt.label }}
            </option>
          </select>
        </div>

        <button
          v-if="dreamMap"
          class="pixel-btn flex items-center gap-2"
          @click="handleExport"
        >
          <Download class="w-4 h-4" />
          <span>导出长图</span>
        </button>

        <button
          class="pixel-btn w-9 h-9 flex items-center justify-center p-0"
          @click="emit('close')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>
    </div>

    <div class="flex-1 p-6 overflow-hidden">
      <div v-if="!hasDreamTheater" class="h-full flex items-center justify-center">
        <div class="text-center text-dream-accent">
          <div class="text-8xl mb-4">🌙</div>
          <p class="font-pixel text-lg mb-2">暂无梦境数据</p>
          <p class="text-sm">请先生成梦境剧场，然后查看地图</p>
        </div>
      </div>

      <div v-else-if="isGeneratingMap" class="h-full flex items-center justify-center">
        <div class="text-center">
          <div class="animate-spin text-6xl mb-4">✨</div>
          <p class="font-pixel text-dream-primary text-lg">正在生成梦境地图...</p>
        </div>
      </div>

      <DreamMapCanvas
        v-else-if="dreamMap"
        :dream-map="dreamMap"
        :is-playback-mode="viewMode === 'playback'"
        :playback-progress="playbackState.progress"
        :current-node-index="playbackState.currentNodeIndex"
        class="h-full"
        @node-click="handleNodeClick"
        @node-hover="handleNodeHover"
        @toggle-playback="togglePlayback"
        @prev-node="handlePrevNodePlayback"
        @next-node="handleNextNodePlayback"
        @export="handleExport"
      />
    </div>

    <MapNodeDetail
      :node="selectedNode"
      :all-nodes="dreamMap?.nodes || []"
      @close="handleCloseNodeDetail"
      @prev-node="handlePrevNode"
      @next-node="handleNextNode"
    />

    <div
      v-if="showExportOptions && dreamMap"
      class="fixed inset-0 bg-dream-dark/90 flex items-center justify-center z-60 p-4"
      @click.self="showExportOptions = false"
    >
      <div class="relative max-w-md w-full bg-dream-dark pixel-border">
        <div class="flex items-center justify-between px-4 py-3 bg-dream-bg border-b-2 border-dream-border">
          <h3 class="font-pixel text-sm text-dream-primary">导出设置</h3>
          <button
            class="pixel-btn w-7 h-7 flex items-center justify-center p-0"
            @click="showExportOptions = false"
          >
            <X class="w-3 h-3" />
          </button>
        </div>

        <div class="p-4 space-y-4">
          <div class="space-y-2">
            <label class="block text-xs text-dream-accent">图片格式</label>
            <div class="flex gap-2">
              <button
                class="flex-1 pixel-btn text-xs py-2"
                :class="exportOptions.format === 'png' ? 'bg-dream-primary text-white' : ''"
                @click="exportOptions.format = 'png'"
              >
                PNG
              </button>
              <button
                class="flex-1 pixel-btn text-xs py-2"
                :class="exportOptions.format === 'jpeg' ? 'bg-dream-primary text-white' : ''"
                @click="exportOptions.format = 'jpeg'"
              >
                JPEG
              </button>
            </div>
          </div>

          <div class="space-y-2">
            <label class="block text-xs text-dream-accent">
              导出质量: {{ Math.round(exportOptions.quality * 100) }}%
            </label>
            <input
              v-model.number="exportOptions.quality"
              type="range"
              min="0.5"
              max="1"
              step="0.05"
              class="pixel-slider"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-xs text-dream-accent">
              缩放比例: {{ exportOptions.scale }}x
            </label>
            <input
              v-model.number="exportOptions.scale"
              type="range"
              min="1"
              max="4"
              step="0.5"
              class="pixel-slider"
            />
          </div>

          <div class="space-y-2">
            <label class="block text-xs text-dream-accent mb-2">包含内容</label>
            
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="exportOptions.includeTitle"
                type="checkbox"
                class="w-4 h-4 accent-dream-primary"
              />
              <span class="text-sm text-white">标题栏</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="exportOptions.includeLegend"
                type="checkbox"
                class="w-4 h-4 accent-dream-primary"
              />
              <span class="text-sm text-white">图例说明</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="exportOptions.includeNodeLabels"
                type="checkbox"
                class="w-4 h-4 accent-dream-primary"
              />
              <span class="text-sm text-white">节点标签</span>
            </label>

            <label class="flex items-center gap-2 cursor-pointer">
              <input
                v-model="exportOptions.includeWatermark"
                type="checkbox"
                class="w-4 h-4 accent-dream-primary"
              />
              <span class="text-sm text-white">水印</span>
            </label>
          </div>

          <div class="pixel-card">
            <div class="text-xs text-dream-accent mb-2">预览信息</div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-dream-accent">预计尺寸:</span>
                <span class="text-white ml-1">
                  {{ Math.round(dreamMap.width * exportOptions.scale) }} × {{ Math.round((dreamMap.height + 200) * exportOptions.scale) }} px
                </span>
              </div>
              <div>
                <span class="text-dream-accent">节点数量:</span>
                <span class="text-white ml-1">{{ dreamMap.nodes.length }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex gap-3 px-4 py-3 bg-dream-bg border-t-2 border-dream-border">
          <button
            class="flex-1 pixel-btn"
            @click="showExportOptions = false"
          >
            取消
          </button>
          <button
            class="flex-1 pixel-btn-primary flex items-center justify-center gap-2"
            @click="executeExport"
          >
            <Download class="w-4 h-4" />
            导出图片
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
