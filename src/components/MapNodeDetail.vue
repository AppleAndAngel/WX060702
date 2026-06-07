<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { MapNode, Entity } from '@/types/dreamMap';
import { useDreamStore } from '@/stores/dream';
import { X, Play, Pause, Users, FileText, Image, ChevronLeft, ChevronRight } from 'lucide-vue-next';

const props = defineProps<{
  node: MapNode | null;
  allNodes: MapNode[];
}>();

const emit = defineEmits<{
  (e: 'close'): void;
  (e: 'prevNode'): void;
  (e: 'nextNode'): void;
}>();

const dreamStore = useDreamStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isPlaying = ref(false);
const currentFrame = ref(0);
const pixelSize = ref(6);
const activeTab = ref<'animation' | 'description' | 'characters'>('animation');

const scene = computed(() => {
  if (!props.node) return null;
  return dreamStore.currentDreamTheater?.scenes.find(
    s => s.id === props.node?.sceneId
  );
});

const currentIndex = computed(() => {
  if (!props.node) return -1;
  return props.allNodes.findIndex(n => n.id === props.node?.id);
});

const hasPrev = computed(() => currentIndex.value > 0);
const hasNext = computed(() => currentIndex.value < props.allNodes.length - 1);

const drawFrame = () => {
  const canvas = canvasRef.value;
  const node = props.node;

  if (!canvas || !node || !node.thumbnail) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height, pixels } = node.thumbnail;

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

let animationInterval: number | null = null;

const startAnimation = () => {
  if (!scene.value) return;
  
  isPlaying.value = true;
  const fps = dreamStore.currentDreamTheater?.fps || 4;
  const interval = 1000 / fps;
  
  animationInterval = window.setInterval(() => {
    currentFrame.value = (currentFrame.value + 1) % 8;
    drawAnimatedFrame();
  }, interval);
};

const stopAnimation = () => {
  isPlaying.value = false;
  if (animationInterval) {
    clearInterval(animationInterval);
    animationInterval = null;
  }
};

const drawAnimatedFrame = () => {
  const canvas = canvasRef.value;
  const node = props.node;

  if (!canvas || !node || !node.thumbnail) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { width, height, pixels } = node.thumbnail;
  const progress = currentFrame.value / 8;

  canvas.width = width * pixelSize.value;
  canvas.height = height * pixelSize.value;

  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let color = pixels[y][x];
      
      const entityAtPixel = node.entities.find(e => 
        x >= e.x && x < e.x + e.width &&
        y >= e.y && y < e.y + e.height
      );
      
      if (entityAtPixel) {
        if (entityAtPixel.properties.floating) {
          const floatOffset = Math.sin(progress * Math.PI * 2) * 1;
          if (y + floatOffset >= 0 && y + floatOffset < height) {
            color = pixels[Math.round(y + floatOffset)]?.[x] || color;
          }
        }
        if (entityAtPixel.properties.twinkling) {
          const alpha = 0.5 + Math.sin(progress * Math.PI * 4) * 0.5;
          color = adjustColorAlpha(color, alpha);
        }
        if (entityAtPixel.properties.pulsing) {
          const scale = 1 + Math.sin(progress * Math.PI * 2) * 0.1;
          if (Math.random() < scale) {
            color = lightenColor(color, 10);
          }
        }
      }
      
      ctx.fillStyle = color;
      ctx.fillRect(
        x * pixelSize.value,
        y * pixelSize.value,
        pixelSize.value,
        pixelSize.value
      );
    }
  }
};

const adjustColorAlpha = (hex: string, alpha: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : null;
};

const lightenColor = (hex: string, percent: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  
  const r = Math.min(255, Math.round(rgb.r + (255 - rgb.r) * percent / 100));
  const g = Math.min(255, Math.round(rgb.g + (255 - rgb.g) * percent / 100));
  const b = Math.min(255, Math.round(rgb.b + (255 - rgb.b) * percent / 100));
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const togglePlay = () => {
  if (isPlaying.value) {
    stopAnimation();
  } else {
    startAnimation();
  }
};

const getEntityIcon = (type: string): string => {
  const icons: Record<string, string> = {
    character: '👤',
    creature: '🐉',
    object: '📦',
    plant: '🌿',
    building: '🏠',
    vehicle: '🚗',
    weather: '🌤️',
    effect: '✨',
  };
  return icons[type] || '❓';
};

const getEntityTypeName = (type: string): string => {
  const names: Record<string, string> = {
    character: '角色',
    creature: '生物',
    object: '物品',
    plant: '植物',
    building: '建筑',
    vehicle: '载具',
    weather: '天气',
    effect: '特效',
  };
  return names[type] || '其他';
};

watch(() => props.node, () => {
  currentFrame.value = 0;
  stopAnimation();
  if (props.node) {
    drawFrame();
  }
}, { immediate: true });

watch(activeTab, () => {
  if (activeTab.value === 'animation' && props.node) {
    drawFrame();
  }
});

onMounted(() => {
  if (props.node) {
    drawFrame();
  }
});

onUnmounted(() => {
  stopAnimation();
});
</script>

<template>
  <div
    v-if="node"
    class="fixed inset-0 bg-dream-dark/90 flex items-center justify-center z-50 p-4"
    @click.self="emit('close')"
  >
    <div class="relative max-w-4xl w-full max-h-[90vh] overflow-hidden bg-dream-dark pixel-border flex flex-col">
      <div class="flex items-center justify-between px-4 py-3 bg-dream-bg border-b-2 border-dream-border">
        <div class="flex items-center gap-3">
          <button
            v-if="hasPrev"
            class="pixel-btn w-8 h-8 flex items-center justify-center p-0"
            @click="emit('prevNode')"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          
          <div>
            <div class="flex items-center gap-2">
              <span class="font-pixel text-xs text-dream-primary">
                第 {{ node.actNumber }} 幕
              </span>
              <span
                class="text-xs px-2 py-0.5"
                :class="node.isVisited ? 'bg-dream-success/20 text-dream-success' : 'bg-dream-accent/20 text-dream-accent'"
              >
                {{ node.isVisited ? '已探索' : '未探索' }}
              </span>
            </div>
            <h3 class="font-pixel text-dream-secondary text-sm mt-1">
              {{ node.title }}
            </h3>
          </div>
          
          <button
            v-if="hasNext"
            class="pixel-btn w-8 h-8 flex items-center justify-center p-0"
            @click="emit('nextNode')"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
        
        <div class="flex items-center gap-2">
          <span class="text-dream-accent text-xs">
            {{ currentIndex + 1 }} / {{ allNodes.length }}
          </span>
          <button
            class="pixel-btn w-8 h-8 flex items-center justify-center p-0"
            @click="emit('close')"
          >
            <X class="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <div class="flex border-b-2 border-dream-border">
        <button
          class="flex-1 px-4 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2"
          :class="activeTab === 'animation' ? 'bg-dream-primary/20 text-dream-primary border-b-2 border-dream-primary' : 'text-dream-accent hover:text-white'"
          @click="activeTab = 'animation'"
        >
          <Image class="w-4 h-4" />
          动画片段
        </button>
        <button
          class="flex-1 px-4 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2"
          :class="activeTab === 'description' ? 'bg-dream-primary/20 text-dream-primary border-b-2 border-dream-primary' : 'text-dream-accent hover:text-white'"
          @click="activeTab = 'description'"
        >
          <FileText class="w-4 h-4" />
          节点说明
        </button>
        <button
          class="flex-1 px-4 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-2"
          :class="activeTab === 'characters' ? 'bg-dream-primary/20 text-dream-primary border-b-2 border-dream-primary' : 'text-dream-accent hover:text-white'"
          @click="activeTab = 'characters'"
        >
          <Users class="w-4 h-4" />
          出现角色
          <span class="bg-dream-secondary/30 text-dream-secondary px-1.5 py-0.5 text-xs">
            {{ node.entities.length }}
          </span>
        </button>
      </div>
      
      <div class="flex-1 overflow-auto p-4">
        <div v-if="activeTab === 'animation'" class="space-y-4">
          <div class="relative bg-dream-bg pixel-border p-4 flex items-center justify-center">
            <canvas
              ref="canvasRef"
              class="block"
              :style="{ imageRendering: 'pixelated' }"
            />
            
            <button
              class="absolute bottom-4 right-4 pixel-btn-primary flex items-center gap-2 text-xs"
              @click="togglePlay"
            >
              <Play v-if="!isPlaying" class="w-4 h-4" />
              <Pause v-else class="w-4 h-4" />
              {{ isPlaying ? '暂停' : '播放' }}
            </button>
          </div>
          
          <div v-if="scene" class="pixel-card">
            <h4 class="font-pixel text-xs text-dream-secondary mb-2">场景信息</h4>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span class="text-dream-accent">持续时间:</span>
                <span class="text-white ml-2">{{ (scene.duration / 1000).toFixed(1) }}s</span>
              </div>
              <div>
                <span class="text-dream-accent">实体数量:</span>
                <span class="text-white ml-2">{{ node.entities.length }}</span>
              </div>
              <div>
                <span class="text-dream-accent">背景色:</span>
                <span class="inline-block w-4 h-4 ml-2 align-middle" :style="{ backgroundColor: node.background }" />
                <span class="text-white ml-1 font-mono">{{ node.background }}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else-if="activeTab === 'description'" class="space-y-4">
          <div class="pixel-card">
            <h4 class="font-pixel text-xs text-dream-secondary mb-3">场景描述</h4>
            <p class="text-sm text-white leading-relaxed">
              {{ node.description }}
            </p>
          </div>
          
          <div v-if="scene" class="pixel-card">
            <h4 class="font-pixel text-xs text-dream-secondary mb-3">原始提示词</h4>
            <p class="text-sm text-dream-accent leading-relaxed font-mono">
              {{ scene.prompt }}
            </p>
          </div>
          
          <div class="pixel-card">
            <h4 class="font-pixel text-xs text-dream-secondary mb-3">场景位置</h4>
            <div class="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span class="text-dream-accent">X 坐标:</span>
                <span class="text-white ml-2">{{ node.x }}</span>
              </div>
              <div>
                <span class="text-dream-accent">Y 坐标:</span>
                <span class="text-white ml-2">{{ node.y }}</span>
              </div>
              <div>
                <span class="text-dream-accent">宽度:</span>
                <span class="text-white ml-2">{{ node.width }}px</span>
              </div>
              <div>
                <span class="text-dream-accent">高度:</span>
                <span class="text-white ml-2">{{ node.height }}px</span>
              </div>
            </div>
          </div>
        </div>
        
        <div v-else-if="activeTab === 'characters'" class="space-y-3">
          <div
            v-for="entity in node.entities"
            :key="entity.id"
            class="pixel-card hover:bg-dream-bg/50 transition-colors"
          >
            <div class="flex items-start gap-3">
              <div
                class="w-12 h-12 flex items-center justify-center text-2xl pixel-border"
                :style="{ backgroundColor: entity.color + '30' }"
              >
                {{ getEntityIcon(entity.type) }}
              </div>
              
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-1">
                  <h5 class="font-pixel text-xs text-white truncate">
                    {{ entity.name }}
                  </h5>
                  <span class="text-xs px-1.5 py-0.5 bg-dream-secondary/20 text-dream-secondary">
                    {{ getEntityTypeName(entity.type) }}
                  </span>
                </div>
                
                <div class="grid grid-cols-2 gap-2 text-xs text-dream-accent">
                  <div>
                    位置: ({{ entity.x }}, {{ entity.y }})
                  </div>
                  <div>
                    大小: {{ entity.width }}×{{ entity.height }}
                  </div>
                </div>
                
                <div class="flex flex-wrap gap-1 mt-2">
                  <span
                    v-if="entity.properties.floating"
                    class="text-xs px-1.5 py-0.5 bg-dream-primary/20 text-dream-primary"
                  >
                    漂浮
                  </span>
                  <span
                    v-if="entity.properties.twinkling"
                    class="text-xs px-1.5 py-0.5 bg-dream-warning/20 text-dream-warning"
                  >
                    闪烁
                  </span>
                  <span
                    v-if="entity.properties.falling"
                    class="text-xs px-1.5 py-0.5 bg-dream-accent/20 text-dream-accent"
                  >
                    下落
                  </span>
                  <span
                    v-if="entity.properties.flowing"
                    class="text-xs px-1.5 py-0.5 bg-dream-success/20 text-dream-success"
                  >
                    流动
                  </span>
                  <span
                    v-if="entity.properties.pulsing"
                    class="text-xs px-1.5 py-0.5 bg-dream-secondary/20 text-dream-secondary"
                  >
                    脉动
                  </span>
                </div>
              </div>
              
              <div
                class="w-6 h-6 pixel-border flex-shrink-0"
                :style="{ backgroundColor: entity.color }"
              />
            </div>
          </div>
          
          <div v-if="node.entities.length === 0" class="text-center py-8 text-dream-accent">
            <Users class="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p class="text-sm">该场景没有出现任何角色</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
