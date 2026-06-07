<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Wand2,
  Save,
  Loader2,
  BookOpen,
  Layers,
  RotateCcw,
  Download,
  GitCompare,
  Users,
  GitBranch,
  Sparkles,
} from 'lucide-vue-next';
import { useDualDreamStore } from '@/stores/dualDream';
import { useRuleSetStore } from '@/stores/ruleSet';
import { useHistoryStore } from '@/stores/history';
import DualDreamInput from '@/components/DualDreamInput.vue';
import DualDreamViewSelector from '@/components/DualDreamViewSelector.vue';
import DualDreamComparison from '@/components/DualDreamComparison.vue';
import DualDreamTimeline from '@/components/DualDreamTimeline.vue';
import DualDreamCanvas from '@/components/DualDreamCanvas.vue';
import { createDualDreamMerger } from '@/engine/dualDreamMerger';

const router = useRouter();
const dualDreamStore = useDualDreamStore();
const ruleSetStore = useRuleSetStore();
const historyStore = useHistoryStore();

const showDiffModal = ref(false);
const showExportPanel = ref(false);
let playInterval: number | null = null;

const currentTheater = computed(() => dualDreamStore.currentDualTheater);
const isGenerating = computed(() => dualDreamStore.isGenerating);
const player1 = computed(() => dualDreamStore.player1);
const player2 = computed(() => dualDreamStore.player2);
const currentViewMode = computed(() => dualDreamStore.currentViewMode);
const currentSceneIndex = computed(() => dualDreamStore.currentSceneIndex);
const isPlaying = computed(() => dualDreamStore.isPlaying);

const handleGenerate = async () => {
  const result = await dualDreamStore.generateDualDream();
  if (result) {
    console.log('合梦生成成功！', result.elementStats);
  }
};

const handleSave = async () => {
  const saved = await dualDreamStore.saveToHistory();
  if (saved) {
    alert('合梦作品已保存到历史记录！');
  } else {
    alert('请先生成合梦作品');
  }
};

const handleExport = () => {
  const exportData = dualDreamStore.exportDualDream();
  if (!exportData) {
    alert('请先生成合梦作品');
    return;
  }

  const blob = new Blob([exportData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `dual-dream-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const handleReset = () => {
  if (confirm('确定要重置所有输入吗？')) {
    dualDreamStore.resetInputs();
  }
};

const handleShowDiff = () => {
  if (currentTheater.value) {
    showDiffModal.value = true;
  }
};

const handleGenerateGif = async () => {
  alert('GIF导出功能开发中，敬请期待！');
};

const startPlayback = () => {
  if (playInterval) return;

  const fps = dualDreamStore.generateOptions.fps;
  const interval = 1000 / fps;

  playInterval = window.setInterval(() => {
    dualDreamStore.nextScene();
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
        dualDreamStore.setCurrentScene(0);
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
          <div class="w-12 h-12 bg-gradient-to-br from-pink-500 to-cyan-500 flex items-center justify-center pixel-border">
            <Users class="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 class="font-pixel text-xl text-dream-primary text-glow-primary">双人合梦</h1>
            <p class="text-dream-accent text-sm font-body">Dual Dream Collaboration</p>
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
          <button
            class="pixel-btn flex items-center gap-2"
            @click="router.push('/purifier')"
          >
            <Sparkles class="w-4 h-4" />
            <span>噩梦净化</span>
          </button>
        </nav>
      </div>
    </header>

    <main class="flex-1 p-6">
      <div class="max-w-7xl mx-auto">
        <div v-if="!currentTheater" class="max-w-3xl mx-auto">
          <DualDreamInput @generate="handleGenerate" />
        </div>

        <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-4 space-y-6">
            <div class="pixel-card space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="font-pixel text-sm text-dream-primary">合梦信息</h3>
                <span
                  class="text-xs px-2 py-1 pixel-border"
                  :class="currentTheater.mergeStrategy === 'overlay' ? 'bg-purple-500/20 text-purple-300' :
                          currentTheater.mergeStrategy === 'split' ? 'bg-blue-500/20 text-blue-300' :
                          'bg-green-500/20 text-green-300'"
                >
                  {{ currentTheater.mergeStrategy === 'overlay' ? '交融叠加' :
                     currentTheater.mergeStrategy === 'split' ? '分屏交替' : '轮转突出' }}
                </span>
              </div>

              <div class="text-center space-y-1">
                <h2 class="font-pixel text-lg text-dream-secondary">
                  {{ currentTheater.title }}
                </h2>
              </div>

              <div class="grid grid-cols-2 gap-3">
                <div
                  class="p-3 pixel-border"
                  :style="{ borderColor: player1.color + '40', backgroundColor: player1.color + '10' }"
                >
                  <div class="flex items-center gap-2 mb-1">
                    <div
                      class="w-3 h-3 rounded-full"
                      :style="{ backgroundColor: player1.color }"
                    />
                    <span class="text-xs font-pixel" :style="{ color: player1.color }">
                      {{ player1.name }}
                    </span>
                  </div>
                  <p class="text-xs text-dream-accent line-clamp-2">
                    {{ player1.dreamText }}
                  </p>
                </div>
                <div
                  class="p-3 pixel-border"
                  :style="{ borderColor: player2.color + '40', backgroundColor: player2.color + '10' }"
                >
                  <div class="flex items-center gap-2 mb-1">
                    <div
                      class="w-3 h-3 rounded-full"
                      :style="{ backgroundColor: player2.color }"
                    />
                    <span class="text-xs font-pixel" :style="{ color: player2.color }">
                      {{ player2.name }}
                    </span>
                  </div>
                  <p class="text-xs text-dream-accent line-clamp-2">
                    {{ player2.dreamText }}
                  </p>
                </div>
              </div>
            </div>

            <DualDreamViewSelector />

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
                  @click="handleShowDiff"
                >
                  <GitCompare class="w-4 h-4" />
                  差异对比
                </button>
                <button
                  class="pixel-btn flex items-center justify-center gap-2"
                  @click="handleExport"
                >
                  <Download class="w-4 h-4" />
                  导出JSON
                </button>
                <button
                  class="pixel-btn flex items-center justify-center gap-2"
                  @click="handleGenerateGif"
                >
                  <Loader2 class="w-4 h-4" />
                  导出GIF
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
              <DualDreamCanvas
                :theater="currentTheater"
                :view-mode="currentViewMode"
                :current-scene-index="currentSceneIndex"
                :is-playing="isPlaying"
              />
            </div>

            <DualDreamTimeline
              :theater="currentTheater"
              :current-index="currentSceneIndex"
              :is-playing="isPlaying"
              :view-mode="currentViewMode"
              :player1-color="player1.color"
              :player2-color="player2.color"
              @update:current-index="dualDreamStore.setCurrentScene"
              @play="dualDreamStore.togglePlay"
              @prev="dualDreamStore.prevScene"
              @next="dualDreamStore.nextScene"
            />
          </div>
        </div>
      </div>
    </main>

    <DualDreamComparison
      :visible="showDiffModal"
      @close="showDiffModal = false"
    />
  </div>
</template>
