<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Sparkles,
  Wand2,
  Save,
  BookOpen,
  Layers,
  RotateCcw,
  Download,
  GitCompare,
  Users,
  GitBranch,
  Settings,
  Palette,
  Clock,
  BookText,
  Eye,
  Loader2,
} from 'lucide-vue-next';
import { useNightmarePurifierStore } from '@/stores/nightmarePurifier';
import { useRuleSetStore } from '@/stores/ruleSet';
import { useHistoryStore } from '@/stores/history';
import PurifiedDualCanvas from '@/components/PurifiedDualCanvas.vue';
import PurifiedTimeline from '@/components/PurifiedTimeline.vue';
import PurifiedComparison from '@/components/PurifiedComparison.vue';
import { downloadBlob } from '@/utils/pixelUtils';
import type { PurifyViewMode, PurifyIntensity } from '@/types';

const router = useRouter();
const purifierStore = useNightmarePurifierStore();
const ruleSetStore = useRuleSetStore();
const historyStore = useHistoryStore();

const showComparisonModal = ref(false);
const showExportPanel = ref(false);
const showSettings = ref(false);
let playInterval: number | null = null;

const currentTheater = computed(() => purifierStore.purifiedTheater);
const originalTheater = computed(() => purifierStore.originalTheater);
const isPurifying = computed(() => purifierStore.isPurifying);
const currentViewMode = computed(() => purifierStore.currentViewMode);
const currentSceneIndex = computed(() => purifierStore.currentSceneIndex);
const isPlaying = computed(() => purifierStore.isPlaying);
const dreamText = computed(() => purifierStore.dreamText);
const purificationOptions = computed(() => purifierStore.purificationOptions);
const transformationStats = computed(() => purifierStore.transformationStats);
const canPurify = computed(() => purifierStore.canPurify);

const intensityLabels: Record<PurifyIntensity, { label: string; desc: string }> = {
  mild: { label: '轻度', desc: '轻微调整，保留更多原始感觉' },
  moderate: { label: '中度', desc: '平衡的净化效果' },
  strong: { label: '强力', desc: '完全转换为治愈风格' },
};

const viewModeLabels: Record<PurifyViewMode, { label: string; icon: any }> = {
  original: { label: '原始梦境', icon: Eye },
  purified: { label: '净化梦境', icon: Sparkles },
  compare: { label: '对比模式', icon: GitCompare },
};

const handlePurify = async () => {
  const result = await purifierStore.purifyDream();
  if (result) {
    console.log('梦境净化成功！', result.transformationStats);
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

const handleExportOriginal = () => {
  const exportData = purifierStore.exportOriginal();
  if (!exportData) {
    alert('请先生成原始梦境');
    return;
  }

  const blob = new Blob([exportData], { type: 'application/json' });
  const filename = `original-dream-${Date.now()}.json`;
  downloadBlob(blob, filename);
};

const handleExportPurified = () => {
  const exportData = purifierStore.exportPurified();
  if (!exportData) {
    alert('请先生成净化梦境');
    return;
  }

  const blob = new Blob([exportData], { type: 'application/json' });
  const filename = `purified-dream-${Date.now()}.json`;
  downloadBlob(blob, filename);
};

const handleExportBoth = () => {
  const exportData = purifierStore.exportBoth();
  if (!exportData) {
    alert('请先生成净化梦境');
    return;
  }

  const blob = new Blob([exportData], { type: 'application/json' });
  const filename = `nightmare-purifier-pair-${Date.now()}.json`;
  downloadBlob(blob, filename);
};

const handleExportScenePNG = (mode: 'original' | 'purified') => {
  const scene = mode === 'original' 
    ? originalTheater.value?.scenes[currentSceneIndex.value]
    : currentTheater.value?.scenes[currentSceneIndex.value];
  
  if (!scene) {
    alert('请先生成梦境');
    return;
  }

  const { pixelData } = scene.frame;
  const scale = 8;

  const canvas = document.createElement('canvas');
  canvas.width = pixelData.width * scale;
  canvas.height = pixelData.height * scale;
  const ctx = canvas.getContext('2d');

  if (!ctx) return;

  ctx.imageSmoothingEnabled = false;

  for (let y = 0; y < pixelData.height; y++) {
    for (let x = 0; x < pixelData.width; x++) {
      ctx.fillStyle = pixelData.pixels[y][x];
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }

  canvas.toBlob((blob) => {
    if (blob) {
      const filename = `${mode === 'original' ? 'original' : 'purified'}-第${scene.actNumber}幕-${Date.now()}.png`;
      downloadBlob(blob, filename);
    }
  }, 'image/png');
};

const handleReset = () => {
  if (confirm('确定要重置所有输入吗？')) {
    purifierStore.reset();
  }
};

const handleShowComparison = () => {
  if (currentTheater.value) {
    showComparisonModal.value = true;
  }
};

const handleSetViewMode = (mode: PurifyViewMode) => {
  purifierStore.setViewMode(mode);
};

const handleSetIntensity = (intensity: PurifyIntensity) => {
  purifierStore.setIntensity(intensity);
};

const handleToggleOption = (key: keyof typeof purificationOptions.value) => {
  if (key !== 'intensity') {
    purifierStore.setPurificationOptions({
      [key]: !purificationOptions.value[key],
    });
  }
};

const startPlayback = () => {
  if (playInterval) return;

  const fps = 2;
  const interval = 1000 / fps;

  playInterval = window.setInterval(() => {
    purifierStore.nextScene();
  }, interval);
};

const stopPlayback = () => {
  if (playInterval) {
    clearInterval(playInterval);
    playInterval = null;
  }
};

watch(isPlaying, (newVal) => {
  if (newVal) {
    startPlayback();
  } else {
    stopPlayback();
  }
});

watch(currentSceneIndex, () => {
  if (currentTheater.value && currentSceneIndex.value >= currentTheater.value.scenes.length - 1 && isPlaying.value) {
    setTimeout(() => {
      if (isPlaying.value) {
        purifierStore.setCurrentScene(0);
      }
    }, 1000);
  }
});

onMounted(() => {
  if (isPlaying.value) {
    startPlayback();
  }
});

onUnmounted(() => {
  stopPlayback();
});
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-dream-dark border-b-4 border-dream-border py-4 px-6">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-green-400 to-emerald-600 flex items-center justify-center pixel-border">
            <Sparkles class="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 class="font-pixel text-xl text-green-400">噩梦净化模式</h1>
            <p class="text-dream-accent text-sm font-body">Nightmare Purifier</p>
          </div>
        </div>

        <nav class="flex items-center gap-4">
          <button
            class="pixel-btn flex items-center gap-2"
            @click="router.push('/')"
          >
            <Wand2 class="w-4 h-4" />
            <span>单人模式</span>
          </button>
          <button
            class="pixel-btn flex items-center gap-2"
            @click="router.push('/dual')"
          >
            <Users class="w-4 h-4" />
            <span>双人合梦</span>
          </button>
          <button
            class="pixel-btn flex items-center gap-2"
            @click="router.push('/branching')"
          >
            <GitBranch class="w-4 h-4" />
            <span>结局分支</span>
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
        <div v-if="!currentTheater" class="max-w-3xl mx-auto space-y-6">
          <div class="pixel-card space-y-4">
            <div class="flex items-center gap-3">
              <Sparkles class="w-6 h-6 text-green-400" />
              <div>
                <h2 class="font-pixel text-lg text-green-400">梦境净化</h2>
                <p class="text-dream-accent text-sm">
                  将压抑或惊悚的梦境一键转化为治愈风格版本
                </p>
              </div>
            </div>

            <div class="space-y-2">
              <label class="block text-sm text-dream-accent">输入你的梦境描述</label>
              <textarea
                :value="dreamText"
                @input="(e) => purifierStore.setDreamText((e.target as HTMLTextAreaElement).value)"
                class="pixel-textarea"
                placeholder="描述你的噩梦或压抑的梦境，例如：我在黑暗的走廊里被怪物追逐，四周传来令人恐惧的声音..."
                rows="5"
              />
            </div>

            <div class="flex justify-end">
              <button
                class="pixel-btn-primary flex items-center gap-2 px-6"
                :disabled="isPurifying || !canPurify"
                @click="handlePurify"
              >
                <Loader2 v-if="isPurifying" class="w-4 h-4 animate-spin" />
                <Sparkles v-else class="w-4 h-4" />
                <span>{{ isPurifying ? '净化中...' : '一键净化' }}</span>
              </button>
            </div>
          </div>

          <div class="pixel-card space-y-4">
            <div class="flex items-center justify-between">
              <h3 class="font-pixel text-sm text-dream-secondary">净化设置</h3>
              <button
                class="pixel-btn text-xs flex items-center gap-1"
                @click="showSettings = !showSettings"
              >
                <Settings class="w-3 h-3" />
                {{ showSettings ? '收起' : '展开' }}
              </button>
            </div>

            <div class="space-y-4" v-show="showSettings">
              <div class="space-y-2">
                <label class="block text-sm text-dream-accent">净化强度</label>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    v-for="(config, key) in intensityLabels"
                    :key="key"
                    class="pixel-btn text-xs py-2"
                    :class="{
                      'bg-green-500/30 border-green-500 text-green-400': purificationOptions.intensity === key,
                    }"
                    @click="handleSetIntensity(key as PurifyIntensity)"
                  >
                    <div class="font-pixel">{{ config.label }}</div>
                    <div class="text-dream-accent text-xs mt-1">{{ config.desc }}</div>
                  </button>
                </div>
              </div>

              <div class="space-y-2">
                <label class="block text-sm text-dream-accent">净化选项</label>
                <div class="space-y-2">
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="purificationOptions.keepEntityStructure"
                      @change="handleToggleOption('keepEntityStructure')"
                      class="w-4 h-4"
                    />
                    <span class="text-sm text-dream-secondary">
                      <Users class="w-3 h-3 inline mr-1" />
                      保留角色关系和事件顺序
                    </span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="purificationOptions.transformColors"
                      @change="handleToggleOption('transformColors')"
                      class="w-4 h-4"
                    />
                    <span class="text-sm text-dream-secondary">
                      <Palette class="w-3 h-3 inline mr-1" />
                      转换为柔和配色
                    </span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="purificationOptions.adjustDuration"
                      @change="handleToggleOption('adjustDuration')"
                      class="w-4 h-4"
                    />
                    <span class="text-sm text-dream-secondary">
                      <Clock class="w-3 h-3 inline mr-1" />
                      调整节奏为更舒缓
                    </span>
                  </label>
                  <label class="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      :checked="purificationOptions.rewriteDescriptions"
                      @change="handleToggleOption('rewriteDescriptions')"
                      class="w-4 h-4"
                    />
                    <span class="text-sm text-dream-secondary">
                      <BookText class="w-3 h-3 inline mr-1" />
                      重写描述文本
                    </span>
                  </label>
                </div>
              </div>
            </div>

            <div class="text-xs text-dream-accent p-3 pixel-border bg-dream-primary/5">
              <p>💡 提示：净化过程会自动保留原始的角色关系和事件顺序，只转换为更温暖柔和的视觉风格和描述。</p>
            </div>
          </div>
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-4 space-y-6">
            <div class="pixel-card space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="font-pixel text-sm text-dream-primary">净化信息</h3>
                <span
                  class="text-xs px-2 py-1 pixel-border bg-green-500/20 text-green-400"
                >
                  ✨ 已净化
                </span>
              </div>

              <div class="text-center space-y-1">
                <h2 class="font-pixel text-lg text-green-400">
                  {{ currentTheater.title }}
                </h2>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div
                  class="p-3 pixel-border"
                  style="border-color: rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05);"
                >
                  <div class="flex items-center gap-2 mb-1">
                    <div class="w-3 h-3 rounded-full bg-red-400" />
                    <span class="text-xs font-pixel text-red-400">原始梦境</span>
                  </div>
                  <p class="text-xs text-dream-accent line-clamp-2">
                    {{ originalTheater?.originalDream }}
                  </p>
                </div>
                <div
                  class="p-3 pixel-border"
                  style="border-color: rgba(34, 197, 94, 0.3); background: rgba(34, 197, 94, 0.05);"
                >
                  <div class="flex items-center gap-2 mb-1">
                    <div class="w-3 h-3 rounded-full bg-green-400" />
                    <span class="text-xs font-pixel text-green-400">净化版本 ✨</span>
                  </div>
                  <p class="text-xs text-green-300 whitespace-pre-line line-clamp-3">
                    {{ currentTheater.purifiedDream }}
                  </p>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-2 text-xs">
                <div class="p-2 pixel-border text-center">
                  <div class="font-pixel text-dream-accent">原始时长</div>
                  <div class="text-dream-secondary">
                    {{ ((originalTheater?.totalDuration || 0) / 1000).toFixed(1) }}s
                  </div>
                </div>
                <div class="p-2 pixel-border text-center" style="border-color: rgba(34, 197, 94, 0.3);">
                  <div class="font-pixel text-green-400">净化时长</div>
                  <div class="text-green-400">
                    {{ (currentTheater.totalDuration / 1000).toFixed(1) }}s
                  </div>
                </div>
              </div>
            </div>

            <div class="pixel-card space-y-4">
              <h3 class="font-pixel text-sm text-dream-secondary">视图切换</h3>
              <div class="grid grid-cols-3 gap-2">
                <button
                  v-for="(config, key) in viewModeLabels"
                  :key="key"
                  class="pixel-btn py-2 flex flex-col items-center gap-1"
                  :class="{
                    'bg-green-500/30 border-green-500': currentViewMode === key,
                  }"
                  @click="handleSetViewMode(key as PurifyViewMode)"
                >
                  <component :is="config.icon" class="w-4 h-4" />
                  <span class="text-xs">{{ config.label }}</span>
                </button>
              </div>
            </div>

            <div class="pixel-card space-y-4">
              <h3 class="font-pixel text-sm text-dream-secondary">转换统计</h3>
              <div class="grid grid-cols-2 gap-2">
                <div class="p-2 pixel-border text-center" style="border-color: rgba(239, 68, 68, 0.3);">
                  <Palette class="w-4 h-4 mx-auto mb-1 text-red-400" />
                  <div class="text-lg font-pixel text-red-400">
                    {{ transformationStats.colorsTransformed }}
                  </div>
                  <div class="text-xs text-dream-accent">颜色转换</div>
                </div>
                <div class="p-2 pixel-border text-center" style="border-color: rgba(34, 197, 94, 0.3);">
                  <Users class="w-4 h-4 mx-auto mb-1 text-green-400" />
                  <div class="text-lg font-pixel text-green-400">
                    {{ transformationStats.entitiesSoftened }}
                  </div>
                  <div class="text-xs text-dream-accent">角色柔化</div>
                </div>
                <div class="p-2 pixel-border text-center" style="border-color: rgba(59, 130, 246, 0.3);">
                  <BookText class="w-4 h-4 mx-auto mb-1 text-blue-400" />
                  <div class="text-lg font-pixel text-blue-400">
                    {{ transformationStats.descriptionsRewritten }}
                  </div>
                  <div class="text-xs text-dream-accent">文本重写</div>
                </div>
                <div class="p-2 pixel-border text-center" style="border-color: rgba(245, 158, 11, 0.3);">
                  <Clock class="w-4 h-4 mx-auto mb-1 text-yellow-400" />
                  <div class="text-lg font-pixel text-yellow-400">
                    {{ transformationStats.durationAdjusted }}
                  </div>
                  <div class="text-xs text-dream-accent">节奏调整</div>
                </div>
              </div>
            </div>

            <div class="pixel-card space-y-4">
              <h3 class="font-pixel text-sm text-dream-secondary">操作</h3>

              <div class="grid grid-cols-2 gap-2">
                <button
                  class="pixel-btn flex items-center justify-center gap-2"
                  @click="handleSave"
                >
                  <Save class="w-4 h-4" />
                  保存
                </button>
                <button
                  class="pixel-btn flex items-center justify-center gap-2"
                  @click="handleShowComparison"
                >
                  <GitCompare class="w-4 h-4" />
                  净化分析
                </button>
              </div>

              <div class="space-y-2">
                <div class="text-xs text-dream-accent font-pixel">分别导出</div>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    class="pixel-btn flex items-center justify-center gap-2 text-xs py-2"
                    style="border-color: rgba(239, 68, 68, 0.3);"
                    @click="handleExportOriginal"
                  >
                    <Download class="w-3 h-3" />
                    导出原始
                  </button>
                  <button
                    class="pixel-btn flex items-center justify-center gap-2 text-xs py-2"
                    style="border-color: rgba(34, 197, 94, 0.3);"
                    @click="handleExportPurified"
                  >
                    <Download class="w-3 h-3" />
                    导出净化
                  </button>
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <button
                    class="pixel-btn flex items-center justify-center gap-2 text-xs py-2"
                    style="border-color: rgba(239, 68, 68, 0.3);"
                    @click="handleExportScenePNG('original')"
                  >
                    <Download class="w-3 h-3" />
                    原始截图
                  </button>
                  <button
                    class="pixel-btn flex items-center justify-center gap-2 text-xs py-2"
                    style="border-color: rgba(34, 197, 94, 0.3);"
                    @click="handleExportScenePNG('purified')"
                  >
                    <Download class="w-3 h-3" />
                    净化截图
                  </button>
                </div>
                <button
                  class="w-full pixel-btn-primary flex items-center justify-center gap-2"
                  @click="handleExportBoth"
                >
                  <Download class="w-4 h-4" />
                  导出完整数据包
                </button>
              </div>

              <button
                class="w-full pixel-btn flex items-center justify-center gap-2 text-dream-error hover:bg-dream-error/20"
                @click="handleReset"
              >
                <RotateCcw class="w-4 h-4" />
                重新开始
              </button>
            </div>
          </div>

          <div class="lg:col-span-8 space-y-6">
            <div class="pixel-card">
              <PurifiedDualCanvas
                :original-scene="originalTheater?.scenes[currentSceneIndex]"
                :purified-scene="currentTheater.scenes[currentSceneIndex]"
                :view-mode="currentViewMode"
                :is-playing="isPlaying"
              />
            </div>

            <PurifiedTimeline
              :theater="currentTheater"
              :current-index="currentSceneIndex"
              :is-playing="isPlaying"
              :view-mode="currentViewMode"
              :original-duration="originalTheater?.totalDuration"
              :purified-duration="currentTheater.totalDuration"
              @update:current-index="purifierStore.setCurrentScene"
              @play="purifierStore.togglePlay"
              @prev="purifierStore.prevScene"
              @next="purifierStore.nextScene"
            />
          </div>
        </div>
      </div>
    </main>

    <PurifiedComparison
      :visible="showComparisonModal"
      @close="showComparisonModal = false"
    />
  </div>
</template>
