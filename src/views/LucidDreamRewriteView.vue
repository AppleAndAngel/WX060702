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
  Eye,
  EyeOff,
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Trash2,
  RefreshCw,
  Edit3,
  Check,
  X,
  Moon,
  Zap,
} from 'lucide-vue-next';
import { useLucidDreamRewriteStore } from '@/stores/lucidDreamRewrite';
import { useDreamStore } from '@/stores/dream';
import { useRuleSetStore } from '@/stores/ruleSet';
import { useHistoryStore } from '@/stores/history';
import PixelCanvas from '@/components/PixelCanvas.vue';
import type { RewriteBranch } from '@/types';
import { REWRITE_PROMPT_TEMPLATES } from '@/types/lucidDreamRewrite';

const router = useRouter();
const rewriteStore = useLucidDreamRewriteStore();
const dreamStore = useDreamStore();
const ruleSetStore = useRuleSetStore();
const historyStore = useHistoryStore();

const showConfirmModal = ref(false);
const navigateTo = ref('');
const showBranchForm = ref(false);
const selectedBranchPointIndex = ref<number | null>(null);
const newAction = ref('');
const newOutcome = ref('');
const branchName = ref('');
const selectedTemplateId = ref('');
const editingBranchId = ref<string | null>(null);
const editingBranchName = ref('');

const currentTheater = computed(() => rewriteStore.currentRewriteTheater);
const isGeneratingBranch = computed(() => rewriteStore.isGeneratingBranch);
const selectedBranch = computed(() => rewriteStore.selectedBranch);
const canGenerate = computed(() => rewriteStore.canGenerate);
const previewMode = computed(() => currentTheater.value?.previewMode || 'original');
const activeTheater = computed(() => rewriteStore.activePreviewTheater);
const baseDreamText = computed(() => dreamStore.currentDreamTheater?.originalDream || '');
const baseTheaterTitle = computed(() => dreamStore.currentDreamTheater?.title || '');

const originalScenes = computed(() => {
  return currentTheater.value?.originalTheater.scenes || [];
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

const isFormValid = computed(() => {
  return selectedBranchPointIndex.value !== null && 
         newAction.value.trim() && 
         newOutcome.value.trim();
});

const applyTemplate = () => {
  const template = REWRITE_PROMPT_TEMPLATES.find(t => t.id === selectedTemplateId.value);
  if (template) {
    const prompt = template.prompt.replace('{action}', newAction.value || '[行动]').replace('{outcome}', newOutcome.value || '[结果]');
    console.log('Template prompt:', prompt);
  }
};

const openBranchForm = (sceneIndex: number) => {
  selectedBranchPointIndex.value = sceneIndex;
  newAction.value = '';
  newOutcome.value = '';
  branchName.value = '';
  selectedTemplateId.value = '';
  showBranchForm.value = true;
};

const closeBranchForm = () => {
  showBranchForm.value = false;
  selectedBranchPointIndex.value = null;
  newAction.value = '';
  newOutcome.value = '';
  branchName.value = '';
  selectedTemplateId.value = '';
};

const handleGenerateBranch = async () => {
  if (selectedBranchPointIndex.value === null || !isFormValid.value) return;

  const result = await rewriteStore.generateRewriteBranch(
    selectedBranchPointIndex.value,
    newAction.value,
    newOutcome.value,
    branchName.value || undefined
  );

  if (result) {
    closeBranchForm();
    console.log('改写分支生成成功！');
  }
};

const handleSelectBranch = (branchId: string) => {
  rewriteStore.selectBranch(branchId);
};

const handleDeselectBranch = () => {
  rewriteStore.selectBranch(null);
};

const handleRegenerateBranch = async (branchId: string) => {
  await rewriteStore.regenerateBranch(branchId);
};

const handleDeleteBranch = (branchId: string) => {
  if (confirm('确定要删除这个改写分支吗？')) {
    rewriteStore.deleteBranch(branchId);
  }
};

const startEditBranchName = (branch: RewriteBranch) => {
  editingBranchId.value = branch.id;
  editingBranchName.value = branch.name;
};

const saveBranchName = () => {
  if (editingBranchId.value && editingBranchName.value.trim()) {
    rewriteStore.updateBranchName(editingBranchId.value, editingBranchName.value.trim());
  }
  editingBranchId.value = null;
  editingBranchName.value = '';
};

const cancelEditBranchName = () => {
  editingBranchId.value = null;
  editingBranchName.value = '';
};

const handleTogglePreview = () => {
  rewriteStore.togglePreviewMode();
};

const handleLoadRewrittenToDream = () => {
  showConfirmModal.value = true;
  navigateTo.value = 'rewritten';
};

const handleLoadOriginalToDream = () => {
  showConfirmModal.value = true;
  navigateTo.value = 'original';
};

const confirmLoad = () => {
  let success = false;
  if (navigateTo.value === 'rewritten') {
    success = rewriteStore.loadSelectedBranchToDream();
  } else {
    success = rewriteStore.loadOriginalToDream();
  }
  
  if (success) {
    showConfirmModal.value = false;
    router.push('/');
  }
};

const handleSave = async () => {
  const saved = await rewriteStore.saveToHistory();
  if (saved) {
    alert('清醒梦改写作品已保存到历史记录！');
  } else {
    alert('请先生成改写分支');
  }
};

const handleExport = () => {
  const exportData = rewriteStore.exportLucidDreamRewrite();
  if (!exportData) {
    alert('请先生成改写作品');
    return;
  }

  const blob = new Blob([exportData], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lucid-dream-rewrite-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

const handleReset = () => {
  if (confirm('确定要清空所有改写分支吗？这将清除当前所有内容。')) {
    rewriteStore.clearRewriteTheater();
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

const getBranchPointScene = (branch: RewriteBranch) => {
  return originalScenes.value[branch.branchPointSceneIndex];
};

onMounted(() => {
  if (!dreamStore.currentDreamTheater && !currentTheater.value) {
    if (confirm('请先生成基础梦境剧场。是否返回首页？')) {
      router.push('/');
    }
  } else if (dreamStore.currentDreamTheater && !currentTheater.value) {
    rewriteStore.initializeRewriteTheater();
  }
});
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-dream-dark border-b-4 border-dream-border py-4 px-6">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-gradient-to-br from-indigo-400 via-purple-500 to-pink-500 flex items-center justify-center pixel-border">
            <Moon class="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 class="font-pixel text-xl text-dream-primary text-glow-primary">清醒梦改写</h1>
            <p class="text-dream-accent text-sm font-body">Lucid Dream Rewrite</p>
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
              <Moon class="w-16 h-16 text-dream-primary mx-auto mb-4" />
              <h2 class="font-pixel text-xl text-dream-secondary mb-2">改写你的梦境</h2>
              <p class="text-dream-accent">
                在清醒梦中，你可以任意改写剧情。选择某一幕，重新指定行动和结果，系统将基于原有内容延续后续画面和剧情。
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

            <div class="space-y-4">
              <div class="space-y-2">
                <label class="block text-sm text-dream-accent">
                  改写后续场景数量: {{ rewriteStore.generateOptions.rewriteSceneCount }} 幕
                </label>
                <input
                  v-model.number="rewriteStore.generateOptions.rewriteSceneCount"
                  type="range"
                  min="2"
                  max="4"
                  class="pixel-slider"
                />
              </div>
            </div>

            <button
              class="w-full pixel-btn-primary flex items-center justify-center gap-2 text-lg py-4"
              :disabled="!canGenerate"
              @click="rewriteStore.initializeRewriteTheater()"
            >
              <Sparkles class="w-5 h-5" />
              <span>开始清醒梦改写</span>
            </button>

            <p v-if="rewriteStore.error" class="text-center text-dream-error text-sm">
              {{ rewriteStore.error }}
            </p>
          </div>
        </div>

        <div v-else class="space-y-6">
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div class="lg:col-span-1 space-y-6">
              <div class="pixel-card space-y-4">
                <h3 class="font-pixel text-sm text-dream-secondary flex items-center gap-2">
                  <GitBranch class="w-4 h-4" />
                  原始时间轴
                </h3>
                <p class="text-xs text-dream-accent">
                  点击任意场景，在该幕插入改写分支
                </p>
                
                <div class="space-y-2 max-h-80 overflow-y-auto">
                  <div
                    v-for="(scene, index) in originalScenes"
                    :key="scene.id"
                    class="p-3 pixel-border cursor-pointer transition-all hover:bg-dream-primary/10"
                    :class="{
                      'bg-dream-primary/20 border-dream-primary': selectedBranchPointIndex === index,
                      'bg-dream-dark/30': selectedBranchPointIndex !== index
                    }"
                    @click="openBranchForm(index)"
                  >
                    <div class="flex items-center justify-between mb-1">
                      <span class="font-pixel text-xs text-dream-primary">
                        第{{ scene.actNumber }}幕
                      </span>
                      <Zap class="w-3 h-3 text-dream-warning" />
                    </div>
                    <h4 class="font-pixel text-sm text-dream-secondary mb-1">{{ scene.title }}</h4>
                    <p class="text-xs text-dream-accent line-clamp-2">{{ scene.description }}</p>
                  </div>
                </div>
              </div>

              <div v-if="currentTheater.branches.length > 0" class="pixel-card space-y-4">
                <h3 class="font-pixel text-sm text-dream-secondary flex items-center gap-2">
                  <Sparkles class="w-4 h-4" />
                  改写分支 ({{ currentTheater.branches.length }})
                </h3>
                
                <div class="space-y-3 max-h-96 overflow-y-auto">
                  <div
                    v-for="branch in currentTheater.branches"
                    :key="branch.id"
                    class="p-3 pixel-border transition-all"
                    :class="{
                      'bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-purple-400': branch.isSelected,
                      'bg-dream-dark/30 hover:bg-dream-dark/50': !branch.isSelected
                    }"
                  >
                    <div v-if="branch.isGenerating" class="space-y-2">
                      <div class="flex items-center gap-2">
                        <Loader2 class="w-4 h-4 animate-spin text-dream-primary" />
                        <span class="font-pixel text-xs text-dream-accent">生成中...</span>
                      </div>
                      <div class="w-full bg-dream-dark rounded h-2">
                        <div 
                          class="bg-dream-primary h-2 rounded transition-all"
                          :style="{ width: branch.generationProgress + '%' }"
                        ></div>
                      </div>
                    </div>

                    <template v-else>
                      <div v-if="editingBranchId === branch.id" class="flex items-center gap-2 mb-2">
                        <input
                          v-model="editingBranchName"
                          type="text"
                          class="flex-1 pixel-input text-xs"
                          @keyup.enter="saveBranchName"
                          @keyup.esc="cancelEditBranchName"
                        />
                        <button class="pixel-btn p-1" @click="saveBranchName">
                          <Check class="w-3 h-3 text-dream-success" />
                        </button>
                        <button class="pixel-btn p-1" @click="cancelEditBranchName">
                          <X class="w-3 h-3 text-dream-error" />
                        </button>
                      </div>
                      <div v-else class="flex items-center justify-between mb-2">
                        <span class="font-pixel text-sm text-dream-secondary">{{ branch.name }}</span>
                        <div class="flex items-center gap-1">
                          <button class="pixel-btn p-1" @click="startEditBranchName(branch)">
                            <Edit3 class="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      <div class="text-xs space-y-1 mb-3">
                        <div class="flex items-start gap-1">
                          <span class="text-dream-primary shrink-0">📍</span>
                          <span class="text-dream-accent">
                            分支点: 第{{ branch.branchPointSceneIndex + 1 }}幕
                            <span class="text-dream-secondary">
                              {{ getBranchPointScene(branch)?.title }}
                            </span>
                          </span>
                        </div>
                        <div class="flex items-start gap-1">
                          <span class="text-dream-success shrink-0">→</span>
                          <span class="text-dream-accent">
                            <span class="text-dream-success">行动:</span> {{ branch.newAction }}
                          </span>
                        </div>
                        <div class="flex items-start gap-1">
                          <span class="text-dream-warning shrink-0">✦</span>
                          <span class="text-dream-accent">
                            <span class="text-dream-warning">结果:</span> {{ branch.newOutcome }}
                          </span>
                        </div>
                      </div>

                      <p v-if="branch.error" class="text-xs text-dream-error mb-2">
                        {{ branch.error }}
                      </p>

                      <div class="flex flex-wrap gap-2">
                        <button
                          v-if="!branch.isSelected"
                          class="pixel-btn-primary flex-1 flex items-center justify-center gap-1 text-xs py-1"
                          @click="handleSelectBranch(branch.id)"
                        >
                          <Eye class="w-3 h-3" />
                          预览
                        </button>
                        <button
                          v-else
                          class="pixel-btn flex-1 flex items-center justify-center gap-1 text-xs py-1"
                          @click="handleDeselectBranch"
                        >
                          <EyeOff class="w-3 h-3" />
                          取消预览
                        </button>
                        <button
                          class="pixel-btn flex items-center justify-center gap-1 text-xs py-1 px-2"
                          @click="handleRegenerateBranch(branch.id)"
                        >
                          <RefreshCw class="w-3 h-3" />
                        </button>
                        <button
                          class="pixel-btn flex items-center justify-center gap-1 text-xs py-1 px-2 text-dream-error hover:bg-dream-error/20"
                          @click="handleDeleteBranch(branch.id)"
                        >
                          <Trash2 class="w-3 h-3" />
                        </button>
                      </div>
                    </template>
                  </div>
                </div>
              </div>

              <div class="pixel-card space-y-4">
                <h3 class="font-pixel text-sm text-dream-secondary">操作</h3>

                <div class="grid grid-cols-2 gap-2">
                  <button
                    class="pixel-btn flex items-center justify-center gap-2"
                    :disabled="!selectedBranch"
                    @click="handleSave"
                  >
                    <Save class="w-4 h-4" />
                    保存
                  </button>
                  <button
                    class="pixel-btn flex items-center justify-center gap-2"
                    :disabled="!selectedBranch"
                    @click="handleExport"
                  >
                    <Download class="w-4 h-4" />
                    导出
                  </button>
                  <button
                    class="pixel-btn flex items-center justify-center gap-2"
                    @click="showBranchForm = true"
                  >
                    <GitBranch class="w-4 h-4" />
                    新增分支
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
                      class="text-xs px-3 py-1 pixel-border bg-dream-primary/20 text-dream-primary"
                    >
                      原版预览
                    </span>
                    <span
                      v-else
                      class="text-xs px-3 py-1 pixel-border bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-300"
                    >
                      改写版预览
                    </span>
                  </div>
                </div>

                <div v-if="selectedBranch" class="p-4 pixel-border bg-gradient-to-r from-purple-500/10 to-pink-500/10 border-purple-400 mb-4">
                  <div class="flex items-center gap-3">
                    <div class="w-10 h-10 pixel-border flex items-center justify-center bg-gradient-to-br from-purple-500/30 to-pink-500/30">
                      <Sparkles class="w-5 h-5 text-purple-300" />
                    </div>
                    <div class="flex-1">
                      <h4 class="font-pixel text-sm text-purple-300">
                        当前预览：{{ selectedBranch.name }}
                      </h4>
                      <p class="text-xs text-dream-accent">
                        点击「切换预览」在原版和改写版之间对比，或「继续编辑」加载到主编辑区
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <button
                        class="pixel-btn flex items-center gap-2"
                        @click="handleTogglePreview"
                      >
                        <template v-if="previewMode === 'original'">
                          <Eye class="w-4 h-4" />
                          看改写版
                        </template>
                        <template v-else>
                          <EyeOff class="w-4 h-4" />
                          看原版
                        </template>
                      </button>
                      <button
                        class="pixel-btn-primary flex items-center gap-2"
                        style="background: linear-gradient(to right, #8B5CF6, #EC4899);"
                        @click="handleLoadRewrittenToDream"
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
                          'bg-dream-dark/30 hover:bg-dream-dark/50': activeCurrentSceneIndex !== index,
                          'border-dashed border-purple-400/50': previewMode === 'rewritten' && 
                            index >= selectedBranch?.branchPointSceneIndex
                        }"
                        @click="selectActiveScene(index)"
                      >
                        <div class="flex items-center gap-1 mb-1">
                          <span class="font-pixel text-xs text-dream-primary">
                            {{ scene.actNumber }}
                          </span>
                          <Zap 
                            v-if="previewMode === 'rewritten' && index === (selectedBranch?.branchPointSceneIndex)"
                            class="w-3 h-3 text-purple-400"
                          />
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

                <p v-if="rewriteStore.error" class="text-center text-dream-error text-sm">
                  {{ rewriteStore.error }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div
      v-if="showBranchForm"
      class="fixed inset-0 bg-dream-dark/90 flex items-center justify-center z-50 p-4"
      @click.self="closeBranchForm"
    >
      <div class="pixel-card max-w-lg w-full">
        <h3 class="font-pixel text-lg text-dream-secondary mb-4">创建改写分支</h3>
        
        <div v-if="selectedBranchPointIndex !== null && originalScenes[selectedBranchPointIndex]" class="mb-4 p-3 pixel-border bg-dream-dark/50">
          <div class="text-xs text-dream-primary mb-1">
            分支点：第{{ originalScenes[selectedBranchPointIndex].actNumber }}幕
          </div>
          <h4 class="font-pixel text-sm text-dream-secondary mb-1">
            {{ originalScenes[selectedBranchPointIndex].title }}
          </h4>
          <p class="text-xs text-dream-accent">
            {{ originalScenes[selectedBranchPointIndex].description }}
          </p>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-sm text-dream-secondary mb-1">分支名称（可选）</label>
            <input
              v-model="branchName"
              type="text"
              class="w-full pixel-input"
              placeholder="例如：勇敢面对版"
            />
          </div>

          <div>
            <label class="block text-sm text-dream-secondary mb-1">
              新的行动 <span class="text-dream-error">*</span>
            </label>
            <input
              v-model="newAction"
              type="text"
              class="w-full pixel-input"
              placeholder="例如：转身逃跑"
            />
          </div>

          <div>
            <label class="block text-sm text-dream-secondary mb-1">
              新的结果 <span class="text-dream-error">*</span>
            </label>
            <input
              v-model="newOutcome"
              type="text"
              class="w-full pixel-input"
              placeholder="例如：成功逃脱"
            />
          </div>

          <div>
            <label class="block text-sm text-dream-secondary mb-2">快速模板</label>
            <div class="grid grid-cols-2 gap-2">
              <button
                v-for="template in REWRITE_PROMPT_TEMPLATES"
                :key="template.id"
                class="p-2 pixel-border text-left transition-all text-xs"
                :class="{
                  'bg-dream-primary/20 border-dream-primary': selectedTemplateId === template.id,
                  'bg-dream-dark/30 hover:bg-dream-dark/50': selectedTemplateId !== template.id
                }"
                @click="selectedTemplateId = template.id"
              >
                <div class="font-pixel text-dream-secondary mb-1">{{ template.name }}</div>
                <div class="text-dream-accent text-[10px]">{{ template.description }}</div>
              </button>
            </div>
          </div>
        </div>

        <div class="flex gap-3 mt-6">
          <button
            class="flex-1 pixel-btn"
            @click="closeBranchForm"
          >
            取消
          </button>
          <button
            class="flex-1 pixel-btn-primary flex items-center justify-center gap-2"
            :disabled="!isFormValid || isGeneratingBranch"
            @click="handleGenerateBranch"
          >
            <Loader2
              v-if="isGeneratingBranch"
              class="w-4 h-4 animate-spin"
            />
            <Sparkles v-else class="w-4 h-4" />
            {{ isGeneratingBranch ? '生成中...' : '生成改写分支' }}
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="showConfirmModal"
      class="fixed inset-0 bg-dream-dark/90 flex items-center justify-center z-50 p-4"
      @click.self="showConfirmModal = false"
    >
      <div class="pixel-card max-w-md w-full">
        <h3 class="font-pixel text-lg text-dream-secondary mb-4">确认继续编辑</h3>
        <p class="text-sm text-dream-accent mb-6">
          <template v-if="navigateTo === 'rewritten'">
            选择此改写分支后，将跳转到主编辑区，你可以对改写后的分镜进行进一步的编辑和调整。
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
            :style="{
              background: navigateTo === 'rewritten' ? 'linear-gradient(to right, #8B5CF6, #EC4899)' : ''
            }"
            @click="confirmLoad"
          >
            确认继续
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
