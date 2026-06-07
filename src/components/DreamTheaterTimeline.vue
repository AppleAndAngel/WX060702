<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDreamStore } from '@/stores/dream';
import { useAnimationStore } from '@/stores/animation';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  RefreshCw,
  Clock,
  Trash2,
  Copy,
  Plus,
  GripVertical,
  Edit3,
  Check,
  X,
} from 'lucide-vue-next';

const dreamStore = useDreamStore();
const animationStore = useAnimationStore();

const editingSceneId = ref<string | null>(null);
const editingTitle = ref('');
const editingDescription = ref('');

const scenes = computed(() => {
  return dreamStore.currentDreamTheater?.scenes || [];
});

const currentSceneIndex = computed(() => {
  return dreamStore.currentSceneIndex;
});

const isPlaying = computed(() => {
  return dreamStore.isPlaying;
});

const totalDuration = computed(() => {
  return dreamStore.totalDuration;
});

const canAddScene = computed(() => {
  return scenes.value.length < dreamStore.generateOptions.maxActs;
});

const canRemoveScene = computed(() => {
  return scenes.value.length > dreamStore.generateOptions.minActs;
});

const selectScene = (index: number) => {
  dreamStore.setCurrentScene(index);
};

const togglePlay = () => {
  dreamStore.togglePlay();
  if (animationStore.animation) {
    animationStore.animation.isPlaying = dreamStore.isPlaying;
  }
};

const regenerateScene = async (sceneId: string) => {
  await dreamStore.regenerateScene(sceneId);
};

const handleDurationChange = (sceneId: string, event: Event) => {
  const target = event.target as HTMLInputElement;
  const duration = parseFloat(target.value) * 1000;
  dreamStore.setSceneDuration(sceneId, duration);
};

const startEditing = (sceneId: string) => {
  const scene = scenes.value.find(s => s.id === sceneId);
  if (scene) {
    editingSceneId.value = sceneId;
    editingTitle.value = scene.title;
    editingDescription.value = scene.description;
  }
};

const saveEditing = () => {
  if (editingSceneId.value) {
    dreamStore.updateSceneTitle(editingSceneId.value, editingTitle.value);
    dreamStore.updateSceneDescription(editingSceneId.value, editingDescription.value);
    editingSceneId.value = null;
  }
};

const cancelEditing = () => {
  editingSceneId.value = null;
};

const duplicateScene = (sceneId: string) => {
  dreamStore.duplicateScene(sceneId);
};

const removeScene = (sceneId: string) => {
  if (confirm('确定要删除这一幕吗？')) {
    dreamStore.removeScene(sceneId);
  }
};

const addScene = () => {
  dreamStore.addScene();
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

const formatDuration = (ms: number) => {
  return (ms / 1000).toFixed(1) + 's';
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
        <h3 class="font-pixel text-sm text-dream-primary">梦境分镜剧场</h3>
      </div>
      <span class="text-dream-accent text-xs">
        总时长: {{ formatDuration(totalDuration) }}
      </span>
    </div>

    <div v-if="dreamStore.currentDreamTheater" class="space-y-4">
      <div class="text-center">
        <h2 class="font-pixel text-lg text-dream-secondary mb-1">
          {{ dreamStore.currentDreamTheater.title }}
        </h2>
        <p class="text-xs text-dream-accent truncate">
          {{ dreamStore.currentDreamTheater.originalDream }}
        </p>
      </div>

      <div class="relative h-32 bg-dream-dark pixel-border overflow-x-auto">
        <div class="absolute inset-y-0 left-0 flex items-stretch min-w-full p-2 gap-2">
          <div
            v-for="(scene, index) in scenes"
            :key="scene.id"
            class="relative flex-shrink-0 cursor-pointer transition-all duration-200"
            :class="[
              currentSceneIndex === index
                ? 'ring-2 ring-dream-primary ring-offset-2 ring-offset-dream-dark scale-105 z-10'
                : 'hover:scale-102 opacity-80 hover:opacity-100',
              scene.isGenerating ? 'animate-pulse' : '',
            ]"
            :style="{ width: `${Math.max(80, getSceneWidth(scene) * 4)}px` }"
            @click="selectScene(index)"
          >
            <div class="relative w-full h-full pixel-border overflow-hidden bg-dream-dark">
              <img
                :src="renderThumbnail(scene)"
                :alt="scene.title"
                class="w-full h-16 object-cover"
                :style="{ imageRendering: 'pixelated' }"
              />

              <div class="absolute top-1 left-1 bg-dream-dark/80 px-1.5 py-0.5 text-xs font-pixel text-dream-primary">
                {{ scene.actNumber }}
              </div>

              <div v-if="scene.isGenerating" class="absolute inset-0 bg-dream-dark/80 flex items-center justify-center">
                <RefreshCw class="w-5 h-5 text-dream-primary animate-spin" />
              </div>

              <div v-else-if="currentSceneIndex === index" class="absolute top-1 right-1">
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
            class="absolute top-0 left-0 h-full bg-dream-primary transition-all duration-300"
            :style="{
              width: `${getTimelinePosition(scenes[currentSceneIndex] || scenes[0]) + (getSceneWidth(scenes[currentSceneIndex] || scenes[0]) * (isPlaying ? 0.5 : 0))}%`,
            }"
          />
        </div>
      </div>

      <div class="flex items-center justify-center gap-2">
        <button
          class="pixel-btn p-2"
          :disabled="scenes.length === 0"
          @click="dreamStore.prevScene()"
        >
          <SkipBack class="w-4 h-4" />
        </button>

        <button
          class="pixel-btn-primary px-8 py-2 flex items-center gap-2"
          :disabled="scenes.length === 0"
          @click="togglePlay"
        >
          <Pause v-if="isPlaying" class="w-5 h-5" />
          <Play v-else class="w-5 h-5" />
          <span>{{ isPlaying ? '暂停' : '播放' }}</span>
        </button>

        <button
          class="pixel-btn p-2"
          :disabled="scenes.length === 0"
          @click="dreamStore.nextScene()"
        >
          <SkipForward class="w-4 h-4" />
        </button>
      </div>

      <div class="flex items-center justify-center gap-2">
        <button
          class="pixel-btn px-3 py-1.5 flex items-center gap-1.5 text-sm"
          :disabled="!canAddScene"
          @click="addScene"
        >
          <Plus class="w-4 h-4" />
          添加幕
        </button>
      </div>

      <div v-if="dreamStore.currentScene" class="space-y-3 pt-3 border-t border-dream-border">
        <div v-if="editingSceneId === dreamStore.currentScene.id" class="space-y-3">
          <div>
            <label class="block text-xs text-dream-accent mb-1">标题</label>
            <input
              v-model="editingTitle"
              type="text"
              class="pixel-input w-full text-sm"
              placeholder="输入幕标题"
            />
          </div>
          <div>
            <label class="block text-xs text-dream-accent mb-1">剧情说明</label>
            <textarea
              v-model="editingDescription"
              rows="2"
              class="pixel-textarea w-full text-sm"
              placeholder="输入剧情说明"
            />
          </div>
          <div class="flex gap-2">
            <button
              class="pixel-btn-primary px-3 py-1.5 flex items-center gap-1.5 text-sm"
              @click="saveEditing"
            >
              <Check class="w-4 h-4" />
              保存
            </button>
            <button
              class="pixel-btn px-3 py-1.5 flex items-center gap-1.5 text-sm"
              @click="cancelEditing"
            >
              <X class="w-4 h-4" />
              取消
            </button>
          </div>
        </div>

        <div v-else>
          <div class="flex items-start justify-between gap-2 mb-2">
            <div class="flex-1">
              <div class="flex items-center gap-2 mb-1">
                <span class="font-pixel text-sm text-dream-primary">
                  第 {{ dreamStore.currentScene.actNumber }} 幕
                </span>
                <span class="text-xs text-dream-accent flex items-center gap-1">
                  <Clock class="w-3 h-3" />
                  {{ formatDuration(dreamStore.currentScene.duration) }}
                </span>
              </div>
              <h4 class="font-pixel text-dream-secondary text-sm mb-1">
                {{ dreamStore.currentScene.title }}
              </h4>
              <p class="text-xs text-dream-accent">
                {{ dreamStore.currentScene.description }}
              </p>
            </div>
            <button
              class="pixel-btn p-1.5"
              title="编辑"
              @click="startEditing(dreamStore.currentScene!.id)"
            >
              <Edit3 class="w-4 h-4" />
            </button>
          </div>

          <div class="space-y-3">
            <div>
              <label class="flex items-center justify-between text-xs text-dream-accent mb-1">
                <span class="flex items-center gap-1">
                  <Clock class="w-3 h-3" />
                  幕间时长
                </span>
                <span>{{ formatDuration(dreamStore.currentScene.duration) }}</span>
              </label>
              <input
                type="range"
                :min="0.5"
                :max="10"
                :step="0.5"
                :value="dreamStore.currentScene.duration / 1000"
                class="pixel-slider w-full"
                @input="(e) => handleDurationChange(dreamStore.currentScene!.id, e)"
              />
              <div class="flex justify-between text-xs text-dream-accent mt-1">
                <span>0.5s</span>
                <span>10s</span>
              </div>
            </div>

            <div class="flex items-center gap-2 flex-wrap">
              <button
                class="pixel-btn px-3 py-1.5 flex items-center gap-1.5 text-sm"
                :disabled="dreamStore.currentScene.isGenerating"
                @click="regenerateScene(dreamStore.currentScene!.id)"
              >
                <RefreshCw
                  class="w-4 h-4"
                  :class="{ 'animate-spin': dreamStore.currentScene.isGenerating }"
                />
                重绘此幕
              </button>

              <button
                class="pixel-btn px-3 py-1.5 flex items-center gap-1.5 text-sm"
                :disabled="!canAddScene"
                @click="duplicateScene(dreamStore.currentScene!.id)"
              >
                <Copy class="w-4 h-4" />
                复制
              </button>

              <button
                class="pixel-btn px-3 py-1.5 flex items-center gap-1.5 text-sm text-dream-error hover:bg-dream-error/20"
                :disabled="!canRemoveScene"
                @click="removeScene(dreamStore.currentScene!.id)"
              >
                <Trash2 class="w-4 h-4" />
                删除
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else class="text-center py-8 text-dream-accent">
      <div class="text-4xl mb-2">🎬</div>
      <p class="text-sm">生成梦境后将在这里显示分镜剧场</p>
    </div>
  </div>
</template>
