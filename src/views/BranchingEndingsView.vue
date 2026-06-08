<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import {
  Wand2,
  Save,
  Loader2,
  BookOpen,
  Layers,
  RotateCcw,
  Download,
  GitBranch,
  Home,
  Sparkles,
  ArrowLeft,
} from 'lucide-vue-next';
import { useBranchingEndingsStore } from '@/stores/branchingEndings';
import { useDreamStore } from '@/stores/dream';
import { useRuleSetStore } from '@/stores/ruleSet';
import { useHistoryStore } from '@/stores/history';
import EndingCard from '@/components/EndingCard.vue';
import type { EndingBranch } from '@/types';

const router = useRouter();
const branchingStore = useBranchingEndingsStore();
const dreamStore = useDreamStore();
const ruleSetStore = useRuleSetStore();
const historyStore = useHistoryStore();

const showConfirmModal = ref(false);
const navigateTo = ref('');

const currentTheater = computed(() => branchingStore.currentBranchingTheater);
const isGenerating = computed(() => branchingStore.isGenerating);
const selectedEnding = computed(() => branchingStore.selectedEnding);
const allEndingsGenerated = computed(() => branchingStore.allEndingsGenerated);
const canGenerate = computed(() => branchingStore.canGenerate);
const baseDreamText = computed(() => dreamStore.currentDreamTheater?.originalDream || '');
const baseTheaterTitle = computed(() => dreamStore.currentDreamTheater?.title || '');

const handleGenerate = async () => {
  const result = await branchingStore.generateBranchingEndings();
  if (result) {
    console.log('多结局生成成功！');
  }
};

const handleSelectEnding = (endingId: string) => {
  branchingStore.selectEnding(endingId);
};

const handleRegenerateEnding = async (endingId: string) => {
  await branchingStore.regenerateEnding(endingId);
};

const handleLoadEnding = (endingId: string) => {
  const ending = currentTheater.value?.endings.find(e => e.id === endingId);
  if (!ending) return;
  
  showConfirmModal.value = true;
  navigateTo.value = endingId;
};

const confirmLoadEnding = () => {
  const success = branchingStore.loadSelectedEndingToDream();
  if (success) {
    showConfirmModal.value = false;
    router.push('/');
  }
};

const handleSave = async () => {
  const saved = await branchingStore.saveToHistory();
  if (saved) {
    alert('多结局作品已保存到历史记录！');
  } else {
    alert('请先生成多结局作品');
  }
};

const handleExport = () => {
  const exportData = branchingStore.exportBranchingEndings();
  if (!exportData) {
    alert('请先生成多结局作品');
    return;
  }

  const blob = new Blob([exportData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `branching-endings-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const handleReset = () => {
  if (confirm('确定要重新生成本次多结局吗？这将清除当前所有结局。')) {
    branchingStore.clearBranchingEndings();
  }
};

const handleBackToBase = () => {
  router.push('/');
};

const endingVariantLabel = (variant: string) => {
  switch (variant) {
    case 'ending-a': return '结局 A';
    case 'ending-b': return '结局 B';
    case 'ending-c': return '结局 C';
    default: return variant;
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
          <div class="w-12 h-12 bg-gradient-to-br from-yellow-400 via-purple-500 to-red-500 flex items-center justify-center pixel-border">
            <GitBranch class="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 class="font-pixel text-xl text-dream-primary text-glow-primary">梦境结局分支</h1>
            <p class="text-dream-accent text-sm font-body">Dream Ending Branches</p>
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
              <Sparkles class="w-16 h-16 text-dream-primary mx-auto mb-4" />
              <h2 class="font-pixel text-xl text-dream-secondary mb-2">生成三种不同的梦境结局</h2>
              <p class="text-dream-accent">
                基于你的基础梦境，一次生成三种不同走向的像素动画结局，选择你最喜欢的继续创作。
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

            <div class="grid grid-cols-3 gap-4 mb-6">
              <div class="p-4 pixel-border text-center" style="background-color: rgba(255, 217, 61, 0.1); border-color: #FFD93D;">
                <div class="w-12 h-12 mx-auto mb-2 pixel-border flex items-center justify-center" style="background-color: #FFD93D30; border-color: #FFD93D;">
                  <span class="font-pixel text-xs" style="color: #FFD93D;">A</span>
                </div>
                <h4 class="font-pixel text-xs mb-1" style="color: #FFD93D;">温暖治愈</h4>
                <p class="text-xs text-dream-accent">温馨、感动、希望</p>
              </div>
              <div class="p-4 pixel-border text-center" style="background-color: rgba(108, 99, 255, 0.1); border-color: #6C63FF;">
                <div class="w-12 h-12 mx-auto mb-2 pixel-border flex items-center justify-center" style="background-color: #6C63FF30; border-color: #6C63FF;">
                  <span class="font-pixel text-xs" style="color: #6C63FF;">B</span>
                </div>
                <h4 class="font-pixel text-xs mb-1" style="color: #6C63FF;">神秘悬疑</h4>
                <p class="text-xs text-dream-accent">神秘、悬疑、反转</p>
              </div>
              <div class="p-4 pixel-border text-center" style="background-color: rgba(255, 107, 107, 0.1); border-color: #FF6B6B;">
                <div class="w-12 h-12 mx-auto mb-2 pixel-border flex items-center justify-center" style="background-color: #FF6B6B30; border-color: #FF6B6B;">
                  <span class="font-pixel text-xs" style="color: #FF6B6B;">C</span>
                </div>
                <h4 class="font-pixel text-xs mb-1" style="color: #FF6B6B;">壮烈史诗</h4>
                <p class="text-xs text-dream-accent">壮烈、史诗、永恒</p>
              </div>
            </div>

            <div class="space-y-4">
              <div class="space-y-2">
                <label class="block text-sm text-dream-accent">
                  共同基础场景数量: {{ branchingStore.generateOptions.baseSceneCount }} 幕
                </label>
                <input
                  v-model.number="branchingStore.generateOptions.baseSceneCount"
                  type="range"
                  min="2"
                  max="4"
                  class="pixel-slider"
                />
              </div>
              <div class="space-y-2">
                <label class="block text-sm text-dream-accent">
                  结局扩展场景数量: {{ branchingStore.generateOptions.endingSceneCount }} 幕
                </label>
                <input
                  v-model.number="branchingStore.generateOptions.endingSceneCount"
                  type="range"
                  min="1"
                  max="3"
                  class="pixel-slider"
                />
              </div>
              <div class="space-y-2">
                <label class="block text-sm text-dream-accent">
                  关键画面展示数量: {{ branchingStore.generateOptions.keyFrameCount }} 帧
                </label>
                <input
                  v-model.number="branchingStore.generateOptions.keyFrameCount"
                  type="range"
                  min="2"
                  max="4"
                  class="pixel-slider"
                />
              </div>
            </div>

            <button
              class="w-full pixel-btn-primary flex items-center justify-center gap-2 text-lg py-4"
              :disabled="isGenerating || !canGenerate"
              @click="handleGenerate"
            >
              <Loader2
                v-if="isGenerating"
                class="w-5 h-5 animate-spin"
              />
              <GitBranch v-else class="w-5 h-5" />
              <span>{{ isGenerating ? '生成中...' : '生成三种结局' }}</span>
            </button>

            <p v-if="branchingStore.error" class="text-center text-dream-error text-sm">
              {{ branchingStore.error }}
            </p>
          </div>
        </div>

        <div v-else class="space-y-6">
          <div class="pixel-card">
            <div class="flex items-start justify-between mb-4">
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
                  v-if="allEndingsGenerated"
                  class="text-xs px-3 py-1 pixel-border bg-dream-success/20 text-dream-success"
                >
                  ✓ 全部生成完成
                </span>
                <span
                  v-else
                  class="text-xs px-3 py-1 pixel-border bg-dream-warning/20 text-dream-warning"
                >
                  ⚡ 生成中
                </span>
              </div>
            </div>

            <div v-if="selectedEnding" class="p-4 pixel-border bg-dream-primary/10 border-dream-primary mb-4">
              <div class="flex items-center gap-3">
                <div
                  class="w-10 h-10 pixel-border flex items-center justify-center"
                  :style="{ backgroundColor: selectedEnding.theme.color + '30', borderColor: selectedEnding.theme.color }"
                >
                  <span class="font-pixel text-xs" :style="{ color: selectedEnding.theme.color }">
                    {{ selectedEnding.variant === 'ending-a' ? 'A' : selectedEnding.variant === 'ending-b' ? 'B' : 'C' }}
                  </span>
                </div>
                <div class="flex-1">
                  <h4 class="font-pixel text-sm" :style="{ color: selectedEnding.theme.color }">
                    已选择：{{ selectedEnding.theme.name }}结局
                  </h4>
                  <p class="text-xs text-dream-accent">
                    点击「继续编辑」将把此结局加载到主编辑区进行后续创作
                  </p>
                </div>
                <button
                  class="pixel-btn-primary flex items-center gap-2"
                  :style="{ backgroundColor: selectedEnding.theme.color }"
                  :disabled="!allEndingsGenerated"
                  @click="handleLoadEnding(selectedEnding.id)"
                >
                  <Wand2 class="w-4 h-4" />
                  继续编辑
                </button>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <EndingCard
              v-for="ending in currentTheater.endings"
              :key="ending.id"
              :ending="ending"
              :is-selected="ending.isSelected"
              @select="handleSelectEnding"
              @regenerate="handleRegenerateEnding"
              @load="handleLoadEnding"
            />
          </div>

          <div class="pixel-card space-y-4">
            <h3 class="font-pixel text-sm text-dream-secondary">操作</h3>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
              <button
                class="pixel-btn flex items-center justify-center gap-2"
                :disabled="!allEndingsGenerated"
                @click="handleSave"
              >
                <Save class="w-4 h-4" />
                保存全部
              </button>
              <button
                class="pixel-btn flex items-center justify-center gap-2"
                :disabled="!allEndingsGenerated"
                @click="handleExport"
              >
                <Download class="w-4 h-4" />
                导出JSON
              </button>
              <button
                class="pixel-btn flex items-center justify-center gap-2"
                @click="handleGenerate"
              >
                <Loader2
                  v-if="isGenerating"
                  class="w-4 h-4 animate-spin"
                />
                <Sparkles v-else class="w-4 h-4" />
                重新生成全部
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
          选择此结局后，将跳转到主编辑区，你可以对该结局的分镜进行进一步的编辑和调整。
          <br /><br />
          <span class="text-dream-warning">注意：当前梦境剧场的内容将被替换为此结局的内容。</span>
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
            :style="{ backgroundColor: selectedEnding?.theme.color }"
            @click="confirmLoadEnding"
          >
            确认继续
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
