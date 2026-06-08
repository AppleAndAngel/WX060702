<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Wand2,
  Save,
  Loader2,
  BookOpen,
  Layers,
  RotateCcw,
  Download,
  Home,
  Sparkles,
  ArrowLeft,
  Eye,
  EyeOff,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Sun,
  Shield,
  Heart,
  Zap,
} from 'lucide-vue-next';
import { useNightmarePurifierStore } from '@/stores/nightmarePurifier';
import { useDreamStore } from '@/stores/dream';
import { useRuleSetStore } from '@/stores/ruleSet';
import { useHistoryStore } from '@/stores/history';
import PixelCanvas from '@/components/PixelCanvas.vue';
import { PURIFICATION_THEMES } from '@/types/nightmarePurifier';

const router = useRouter();
const purifierStore = useNightmarePurifierStore();
const dreamStore = useDreamStore();
const ruleSetStore = useRuleSetStore();
const historyStore = useHistoryStore();

const showConfirmModal = ref(false);
const navigateTo = ref('');
const previewMode = ref<'original' | 'purified'>('purified');

const currentTheater = computed(() => purifierStore.currentPurifiedTheater);
const isGenerating = computed(() => purifierStore.isGenerating);
const selectedTheme = computed(() => purifierStore.selectedTheme);
const canGenerate = computed(() => purifierStore.canGenerate);
const isGenerated = computed(() => purifierStore.isGenerated);
const baseDreamText = computed(() => dreamStore.currentDreamTheater?.originalDream || '');
const baseTheaterTitle = computed(() => dreamStore.currentDreamTheater?.title || '');

const activeTheater = computed(() => {
  if (!currentTheater.value) return null;
  return previewMode.value === 'original' 
    ? currentTheater.value.originalTheater 
    : currentTheater.value.purifiedTheater;
});

const activeScenes = computed(() => {
  return activeTheater.value?.scenes || [];
});

const activeCurrentSceneIndex = computed(() => {
  return activeTheater.value?.currentSceneIndex || 0;
});

const activeIsPlaying = computed(() => {
  return activeTheater.value?.isPlaying || false;
});

const handleGenerate = async () => {
  const result = await purifierStore.generatePurification();
  if (result) {
    console.log('净化生成成功！');
    previewMode.value = 'purified';
  }
};

const handleRegenerate = async () => {
  await purifierStore.regeneratePurification();
};

const handleLoadPurified = () => {
  showConfirmModal.value = true;
  navigateTo.value = 'purified';
};

const handleLoadOriginal = () => {
  showConfirmModal.value = true;
  navigateTo.value = 'original';
};

const confirmLoad = () => {
  let success = false;
  if (navigateTo.value === 'purified') {
    success = purifierStore.loadPurifiedToDream();
  } else {
    success = purifierStore.loadOriginalToDream();
  }
  
  if (success) {
    showConfirmModal.value = false;
    router.push('/');
  }
};

const handleSave = async () => {
  const saved = await purifierStore.saveToHistory();
  if (saved) {
    alert('净化作品已保存到历史记录！');
  } else {
    alert('请先生成净化作品');
  }
};

const handleExport = () => {
  const exportData = purifierStore.exportPurification();
  if (!exportData) {
    alert('请先生成净化作品');
    return;
  }

  const blob = new Blob([exportData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nightmare-purifier-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const handleReset = () => {
  if (confirm('确定要重新生成本次净化吗？这将清除当前内容。')) {
    purifierStore.clearPurification();
  }
};

const handleBackToBase = () => {
  router.push('/');
};

const selectActiveScene = (index: number) => {
  if (activeTheater.value) {
    activeTheater.value.currentSceneIndex = index;
  }
};

const toggleActivePlay = () => {
  if (activeTheater.value) {
    activeTheater.value.isPlaying = !activeTheater.value.isPlaying;
  }
};

const activePrevScene = () => {
  if (!activeTheater.value) return;
  const prevIndex = activeTheater.value.currentSceneIndex - 1;
  if (prevIndex >= 0) {
    activeTheater.value.currentSceneIndex = prevIndex;
  } else {
    activeTheater.value.currentSceneIndex = activeTheater.value.scenes.length - 1;
  }
};

const activeNextScene = () => {
  if (!activeTheater.value) return;
  const nextIndex = activeTheater.value.currentSceneIndex + 1;
  if (nextIndex < activeTheater.value.scenes.length) {
    activeTheater.value.currentSceneIndex = nextIndex;
  } else {
    activeTheater.value.currentSceneIndex = 0;
  }
};

const getThemeIcon = (themeId: string) => {
  switch (themeId) {
    case 'healing-light': return Sun;
    case 'courage-face': return Shield;
    case 'gentle-awakening': return Heart;
    case 'transcend-dream': return Zap;
    default: return Sparkles;
  }
};

onMounted(() => {
  if (!dreamStore.currentDreamTheater && !currentTheater.value) {
    if (confirm('请先生成基础梦境剧场。是否返回首页？')) {
      router.push('/');
    }
  }
});
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-dream-dark border-b-4 border-dream-border py-4 px-6">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-yellow-400 via-orange-400 to-red-400 flex items-center justify-center pixel-border">
            <Sun class="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 class="font-pixel text-xl text-dream-primary text-glow-primary">噩梦净化</h1>
            <p class="text-dream-accent text-sm font-body">Nightmare Purifier</p>
          </div>
        </div>

        <nav class="flex items-center gap-4">
          <button
            class="pixel-btn flex items-center gap-2"
            @click="handleBackToBase"
          >
            <Home class="w-4 h-4" />
            <span>返回</span>
          </button>
          <button
            class="pixel-btn flex items-center gap-2"
            @click="router.push('/history')"
          >
            <BookOpen class="w-4 h-4" />
            <span>历史</span>
          </button>
          <button
            class="pixel-btn flex items-center gap-2"
            @click="router.push('/rulesets')"
          >
            <Layers class="w-4 h-4" />
            <span>规则集</span>
          </button>
        </nav>
      </div>
    </header>

    <main class="flex-1 p-6">
      <div class="max-w-7xl mx-auto">
        <div v-if="!currentTheater" class="max-w-3xl mx-auto">
          <div class="pixel-card space-y-6">
            <div class="text-center mb-6">
              <Sun class="w-16 h-16 text-yellow-400 mx-auto mb-4" />
              <h2 class="font-pixel text-xl text-dream-secondary mb-2">净化你的噩梦</h2>
              <p class="text-dream-accent">
                选择一种净化主题，将恐惧转化为力量，让噩梦变成美好的梦境体验。
              </p>
            </div>

            <div v-if="baseDreamText" class="p-4 pixel-border bg-dream-dark/50">
              <div class="flex items-center gap-2 mb-2">
                <ArrowLeft class="w-4 h-4 text-dream-primary" />
                <span class="font-pixel text-xs text-dream-primary">基础梦境</span>
              </div>
              <h3 class="font-pixel text-sm text-dream-secondary mb-2">{{ baseTheaterTitle }}</h3>
              <p class="text-sm text-dream-accent line-clamp-2">{{ baseDreamText }}</p>
            </div>

            <div class="grid grid-cols-2 gap-4 mb-6">
              <button
                v-for="theme in PURIFICATION_THEMES"
                :key="theme.id"
                class="p-4 pixel-border text-left transition-all"
                :class="{
                  'ring-2 ring-offset-2 ring-offset-dream-dark': purifierStore.selectedThemeId === theme.id
                }"
                :style="{
                  backgroundColor: purifierStore.selectedThemeId === theme.id ? theme.color + '30' : theme.color + '15',
                  borderColor: theme.color,
                  '--tw-ring-color': theme.color
                }"
                @click="purifierStore.setSelectedTheme(theme.id)"
              >
                <div class="flex items-center gap-3 mb-2">
                  <div 
                    class="w-10 h-10 pixel-border flex items-center justify-center"
                    :style="{ backgroundColor: theme.color + '40', borderColor: theme.color }"
                  >
                    <component :is="getThemeIcon(theme.id)" class="w-5 h-5" :style="{ color: theme.color }" />
                  </div>
                  <div>
                    <h4 class="font-pixel text-sm" :style="{ color: theme.color }">{{ theme.name }}</h4>
                    <p class="text-xs text-dream-accent">{{ theme.mood }}</p>
                  </div>
                </div>
                <p class="text-xs text-dream-accent">{{ theme.description }}</p>
              </button>
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <label class="block text-sm text-dream-accent">
                  净化场景数量: {{ purifierStore.generateOptions.sceneCount }} 幕
                </label>
                <input
                  v-model.number="purifierStore.generateOptions.sceneCount"
                  type="range"
                  min="3"
                  max="5"
                  class="pixel-slider"
                />
              </div>
            </div>

            <button
              class="w-full pixel-btn-primary flex items-center justify-center gap-2 text-lg py-4"
              :disabled="isGenerating || !canGenerate"
              :style="{ backgroundColor: selectedTheme.color }"
              @click="handleGenerate"
            >
              <Loader2
                v-if="isGenerating"
                class="w-5 h-5 animate-spin"
              />
              <Sparkles v-else class="w-5 h-5" />
              <span>{{ isGenerating ? '净化中...' : `开始${selectedTheme.name}净化` }}</span>
            </button>

            <p v-if="purifierStore.error" class="text-center text-dream-error text-sm">
              {{ purifierStore.error }}
            </p>
          </div>
        </div>

        <div v-else class="space-y-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1 space-y-6">
              <div class="pixel-card space-y-4">
                <h3 class="font-pixel text-sm text-dream-secondary flex items-center gap-2">
                  <component :is="getThemeIcon(selectedTheme.id)" class="w-4 h-4" :style="{ color: selectedTheme.color }" />
                  净化主题
                </h3>
                
                <div 
                  class="p-4 pixel-border"
                  :style="{ backgroundColor: selectedTheme.color + '15', borderColor: selectedTheme.color }"
                >
                  <div class="flex items-center gap-3 mb-2">
                    <div 
                      class="w-12 h-12 pixel-border flex items-center justify-center"
                      :style="{ backgroundColor: selectedTheme.color + '40', borderColor: selectedTheme.color }"
                    >
                      <component :is="getThemeIcon(selectedTheme.id)" class="w-6 h-6" :style="{ color: selectedTheme.color }" />
                    </div>
                    <div>
                      <h4 class="font-pixel text-sm" :style="{ color: selectedTheme.color }">{{ selectedTheme.name }}</h4>
                      <p class="text-xs text-dream-accent">{{ selectedTheme.mood }}</p>
                    </div>
                  </div>
                  <p class="text-xs text-dream-accent">{{ selectedTheme.description }}</p>
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <button
                    class="pixel-btn flex items-center justify-center gap-2"
                    @click="handleRegenerate"
                  >
                    <Loader2
                      v-if="isGenerating"
                      class="w-4 h-4 animate-spin"
                    />
                    <Sparkles v-else class="w-4 h-4" />
                    重新净化
                  </button>
                  <button
                    class="pixel-btn flex items-center justify-center gap-2 text-dream-error hover:bg-dream-error/20"
                    @click="handleReset"
                  >
                    <RotateCcw class="w-4 h-4" />
                    清空
                  </button>
                </div>
              </div>

              <div v-if="currentTheater.comparisonFrames.length > 0" class="pixel-card space-y-4">
                <h3 class="font-pixel text-sm text-dream-secondary flex items-center gap-2">
                  <Eye class="w-4 h-4" />
                  对比预览
                </h3>
                
                <div class="space-y-3">
                  <div
                    v-for="(framePair, index) in currentTheater.comparisonFrames"
                    :key="index"
                    class="grid grid-cols-2 gap-2"
                  >
                    <div class="space-y-1">
                      <span class="text-[10px] text-dream-error block text-center">原版</span>
                      <div class="pixel-border bg-dream-dark aspect-square flex items-center justify-center">
                        <div 
                          class="w-full h-full"
                          :style="{
                            background: `linear-gradient(135deg, ${framePair.original.background}40, ${framePair.original.background}10)`,
                            imageRendering: 'pixelated'
                          }"
                        ></div>
                      </div>
                    </div>
                    <div class="space-y-1">
                      <span class="text-[10px] text-dream-success block text-center">净化版</span>
                      <div class="pixel-border bg-dream-dark aspect-square flex items-center justify-center">
                        <div 
                          class="w-full h-full"
                          :style="{
                            background: `linear-gradient(135deg, ${framePair.purified.background}40, ${framePair.purified.background}10)`,
                            imageRendering: 'pixelated'
                          }"
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div class="pixel-card space-y-4">
                <h3 class="font-pixel text-sm text-dream-secondary">操作</h3>

                <div class="grid grid-cols-2 gap-2">
                  <button
                    class="pixel-btn flex items-center justify-center gap-2"
                    :disabled="!isGenerated"
                    @click="handleSave"
                  >
                    <Save class="w-4 h-4" />
                    保存
                  </button>
                  <button
                    class="pixel-btn flex items-center justify-center gap-2"
                    :disabled="!isGenerated"
                    @click="handleExport"
                  >
                    <Download class="w-4 h-4" />
                    导出
                  </button>
                </div>
              </div>
            </div>

            <div class="lg:col-span-2 space-y-6">
              <div class="pixel-card">
                <div class="flex items-center justify-between mb-4">
                  <div>
                    <h2 class="font-pixel text-lg text-dream-secondary mb-1">
                      {{ currentTheater.title }}
                    </h2>
                    <p class="text-sm text-dream-accent line-clamp-2">
                      {{ currentTheater.originalDream }}
                    </p>
                  </div>
                  <div class="flex items-center gap-2">
                    <span
                      v-if="previewMode === 'original'"
                      class="text-xs px-3 py-1 pixel-border bg-dream-error/20 text-dream-error"
                    >
                      原版预览
                    </span>
                    <span
                      v-else
                      class="text-xs px-3 py-1 pixel-border"
                      :style="{ backgroundColor: selectedTheme.color + '30', color: selectedTheme.color }"
                    >
                      净化版预览
                    </span>
                  </div>
                </div>

                <div class="p-4 pixel-border mb-4" :style="{ backgroundColor: selectedTheme.color + '10', borderColor: selectedTheme.color }">
                  <div class="flex items-center gap-3">
                    <div 
                      class="w-10 h-10 pixel-border flex items-center justify-center"
                      :style="{ backgroundColor: selectedTheme.color + '30', borderColor: selectedTheme.color }"
                    >
                      <Sparkles class="w-5 h-5" :style="{ color: selectedTheme.color }" />
                    </div>
                    <div class="flex-1">
                      <h4 class="font-pixel text-sm" :style="{ color: selectedTheme.color }">
                        {{ selectedTheme.name }}净化完成
                      </h4>
                      <p class="text-xs text-dream-accent">
                        点击「切换预览」在原版和净化版之间对比，或「继续编辑」加载到主编辑区
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        class="pixel-btn flex items-center gap-2"
                        @click="previewMode = previewMode === 'original' ? 'purified' : 'original'"
                      >
                        <template v-if="previewMode === 'original'">
                          <Eye class="w-4 h-4" />
                          看净化版
                        </template>
                        <template v-else>
                          <EyeOff class="w-4 h-4" />
                          看原版
                        </template>
                      </button>
                      <button
                        class="pixel-btn-primary flex items-center gap-2"
                        :style="{ backgroundColor: selectedTheme.color }"
                        @click="handleLoadPurified"
                      >
                        <Wand2 class="w-4 h-4" />
                        继续编辑
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="activeTheater" class="space-y-4">
                  <PixelCanvas />

                  <div class="space-y-3">
                    <div class="flex items-center justify-center gap-3">
                      <button class="pixel-btn p-2" @click="activePrevScene">
                        <SkipBack class="w-4 h-4" />
                      </button>
                      <button class="pixel-btn-primary p-2" @click="toggleActivePlay">
                        <Play v-if="!activeIsPlaying" class="w-5 h-5" />
                        <Pause v-else class="w-5 h-5" />
                      </button>
                      <button class="pixel-btn p-2" @click="activeNextScene">
                        <SkipForward class="w-4 h-4" />
                      </button>
                    </div>

                    <div class="flex items-center gap-3 overflow-x-auto pb-2">
                      <div
                        v-for="(scene, index) in activeScenes"
                        :key="scene.id"
                        class="shrink-0 p-2 pixel-border cursor-pointer transition-all min-w-[120px]"
                        :class="{
                          'bg-dream-primary/20 border-dream-primary': activeCurrentSceneIndex === index,
                          'bg-dream-dark/30 hover:bg-dream-dark/50': activeCurrentSceneIndex !== index
                        }"
                        @click="selectActiveScene(index)"
                      >
                        <div class="flex items-center gap-1 mb-1">
                          <span class="font-pixel text-xs text-dream-primary">
                            {{ scene.actNumber }}
                          </span>
                        </div>
                        <p class="font-pixel text-xs text-dream-secondary truncate">{{ scene.title }}</p>
                      </div>
                    </div>

                    <div v-if="activeScenes[activeCurrentSceneIndex]" class="p-3 pixel-border bg-dream-dark/30">
                      <h4 class="font-pixel text-sm text-dream-secondary mb-1">
                        {{ activeScenes[activeCurrentSceneIndex].title }}
                      </h4>
                      <p class="text-xs text-dream-accent">
                        {{ activeScenes[activeCurrentSceneIndex].description }}
                      </p>
                    </div>
                  </div>
                </div>

                <p v-if="purifierStore.error" class="text-center text-dream-error text-sm">
                  {{ purifierStore.error }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div
      v-if="showConfirmModal"
      class="fixed inset-0 bg-dream-dark/90 flex items-center justify-center z-50 p-4"
      @click.self="showConfirmModal = false"
    >
      <div class="pixel-card max-w-md w-full">
        <h3 class="font-pixel text-lg text-dream-secondary mb-4">确认继续编辑</h3>
        <p class="text-sm text-dream-accent mb-6">
          <template v-if="navigateTo === 'purified'">
            选择净化版后，将跳转到主编辑区，你可以对净化后的分镜进行进一步的编辑和调整。
          </template>
          <template v-else>
            将原版梦境加载到主编辑区，你可以对原始分镜进行进一步的编辑和调整。
          </template>
          <br /><br />
          <span class="text-dream-warning">注意：当前梦境剧场的内容将被替换。</span>
        </p>
        <div class="flex gap-3">
          <button
            class="flex-1 pixel-btn"
            @click="showConfirmModal = false"
          >
            取消
          </button>
          <button
            class="flex-1 pixel-btn-primary"
            :style="{ backgroundColor: navigateTo === 'purified' ? selectedTheme.color : '' }"
            @click="confirmLoad"
          >
            确认继续
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
