<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useRuleSetStore } from '@/stores/ruleSet';
import { ArrowLeft, Layers, Download, Upload, Trash2, Check } from 'lucide-vue-next';
import { downloadBlob } from '@/utils/pixelUtils';

const router = useRouter();
const ruleSetStore = useRuleSetStore();

const fileInputRef = ref<HTMLInputElement | null>(null);

const selectRuleSet = (id: string) => {
  ruleSetStore.setCurrentRuleSet(id);
  router.push('/');
};

const exportRuleSet = (id: string, event: Event) => {
  event.stopPropagation();
  const data = ruleSetStore.exportRuleSet(id);
  if (data) {
    const blob = new Blob([data], { type: 'application/json' });
    const ruleSet = ruleSetStore.allRuleSets.find(r => r.id === id);
    const filename = ruleSet ? `${ruleSet.name.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}.json` : 'ruleset.json';
    downloadBlob(blob, filename);
  }
};

const deleteRuleSet = (id: string, event: Event) => {
  event.stopPropagation();
  const ruleSet = ruleSetStore.allRuleSets.find(r => r.id === id);
  if (confirm(`确定要删除规则集「${ruleSet?.name}」吗？`)) {
    ruleSetStore.removeCustomRuleSet(id);
  }
};

const triggerImport = () => {
  fileInputRef.value?.click();
};

const handleFileImport = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  const file = target.files?.[0];
  if (file) {
    try {
      await ruleSetStore.importRuleSetFromFile(file);
      alert('导入成功！');
    } catch (e) {
      alert(e instanceof Error ? e.message : '导入失败');
    }
    target.value = '';
  }
};

const renderPalettePreview = (palette: string[]) => {
  return palette.slice(0, 8);
};
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-dream-dark border-b-4 border-dream-border py-4 px-6">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <button
            class="pixel-btn flex items-center gap-2"
            @click="router.push('/')"
          >
            <ArrowLeft class="w-4 h-4" />
            返回
          </button>
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 bg-dream-secondary flex items-center justify-center pixel-border">
              <Layers class="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 class="font-pixel text-xl text-dream-secondary text-glow-secondary">规则集</h1>
              <p class="text-dream-accent text-sm font-body">Rule Sets</p>
            </div>
          </div>
        </div>

        <button
          class="pixel-btn flex items-center gap-2"
          @click="triggerImport"
        >
          <Upload class="w-4 h-4" />
          导入规则集
        </button>
        <input
          ref="fileInputRef"
          type="file"
          accept=".json"
          class="hidden"
          @change="handleFileImport"
        />
      </div>
    </header>

    <main class="flex-1 p-6">
      <div class="max-w-6xl mx-auto">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div
            v-for="ruleSet in ruleSetStore.allRuleSets"
            :key="ruleSet.id"
            class="pixel-card cursor-pointer transition-all hover:scale-[1.02] hover:shadow-xl"
            :class="{
              'ring-2 ring-dream-primary': ruleSetStore.currentRuleSetId === ruleSet.id,
            }"
            @click="selectRuleSet(ruleSet.id)"
          >
            <div class="flex items-start justify-between mb-3">
              <div>
                <div class="flex items-center gap-2 mb-1">
                  <h3 class="font-pixel text-sm text-dream-secondary">
                    {{ ruleSet.name }}
                  </h3>
                  <Check
                    v-if="ruleSetStore.currentRuleSetId === ruleSet.id"
                    class="w-4 h-4 text-dream-success"
                  />
                </div>
                <p class="text-xs text-dream-accent line-clamp-2">
                  {{ ruleSet.description }}
                </p>
              </div>
              <span
                v-if="ruleSet.isCustom"
                class="text-[10px] px-1.5 py-0.5 bg-dream-secondary/20 text-dream-secondary pixel-border"
              >
                自定义
              </span>
            </div>

            <div class="mb-3">
              <p class="text-[10px] text-dream-accent mb-1">调色板</p>
              <div class="flex gap-1 flex-wrap">
                <div
                  v-for="(color, index) in renderPalettePreview(ruleSet.palette)"
                  :key="index"
                  class="w-5 h-5 pixel-border"
                  :style="{ backgroundColor: color }"
                />
              </div>
            </div>

            <div class="flex items-center justify-between text-[10px] text-dream-accent">
              <span>{{ ruleSet.gridSize.width }} × {{ ruleSet.gridSize.height }} px</span>
              <span>{{ ruleSet.entityRules.length }} 种实体</span>
            </div>

            <div class="mt-3 pt-3 border-t border-dream-border flex gap-2">
              <button
                class="flex-1 pixel-btn px-2 py-1.5 flex items-center justify-center gap-1 text-xs"
                @click="(e) => exportRuleSet(ruleSet.id, e)"
              >
                <Download class="w-3 h-3" />
                导出
              </button>
              <button
                v-if="ruleSet.isCustom"
                class="pixel-btn px-2 py-1.5 flex items-center justify-center gap-1 text-xs text-dream-error hover:bg-dream-error/20"
                @click="(e) => deleteRuleSet(ruleSet.id, e)"
              >
                <Trash2 class="w-3 h-3" />
                删除
              </button>
            </div>
          </div>
        </div>

        <div v-if="ruleSetStore.allRuleSets.length === 0" class="text-center py-16 text-dream-accent">
          <div class="text-5xl mb-3">📦</div>
          <p class="font-pixel text-sm mb-1">暂无规则集</p>
          <p class="text-xs">导入或创建新的规则集开始创作</p>
        </div>
      </div>
    </main>
  </div>
</template>
