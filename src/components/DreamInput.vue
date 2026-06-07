<script setup lang="ts">
import { computed } from 'vue';
import { Sparkles, Loader2 } from 'lucide-vue-next';

const props = defineProps<{
  modelValue: string;
  isGenerating?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void;
  (e: 'generate'): void;
}>();

const inputValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit('update:modelValue', value),
});

const handleGenerate = () => {
  if (!props.isGenerating && inputValue.value.trim()) {
    emit('generate');
  }
};

const exampleDreams = [
  '我在星空下飞翔，穿过云层追逐发光的蝴蝶',
  '一座漂浮在云端的城堡，彩虹桥连接着各个塔楼',
  '深夜的森林里，会说话的动物们在举行神秘仪式',
  '未来都市中，霓虹灯光在雨夜里闪烁，我在寻找出口',
];

const useExample = (dream: string) => {
  inputValue.value = dream;
};
</script>

<template>
  <div class="pixel-card space-y-4">
    <div class="flex items-center gap-2">
      <Sparkles class="w-5 h-5 text-dream-primary" />
      <h3 class="font-pixel text-sm text-dream-primary">描述你的梦境</h3>
    </div>

    <textarea
      v-model="inputValue"
      :disabled="isGenerating"
      placeholder="在这里描述你的梦境..."
      rows="5"
      class="pixel-textarea w-full"
      @keydown.enter.ctrl="handleGenerate"
    />

    <div v-if="error" class="text-dream-error text-sm pixel-border p-2 bg-dream-error/10">
      {{ error }}
    </div>

    <div class="space-y-2">
      <p class="text-dream-accent text-xs">灵感示例：</p>
      <div class="flex flex-wrap gap-2">
        <button
          v-for="(dream, index) in exampleDreams"
          :key="index"
          class="text-xs px-2 py-1 pixel-border bg-dream-dark hover:bg-dream-primary/20 text-dream-secondary transition-colors"
          :disabled="isGenerating"
          @click="useExample(dream)"
        >
          {{ dream.substring(0, 15) }}...
        </button>
      </div>
    </div>

    <button
      class="pixel-btn-primary w-full flex items-center justify-center gap-2"
      :disabled="isGenerating || !inputValue.trim()"
      @click="handleGenerate"
    >
      <Loader2 v-if="isGenerating" class="w-5 h-5 animate-spin" />
      <Sparkles v-else class="w-5 h-5" />
      <span>{{ isGenerating ? '生成中...' : '生成梦境分镜剧场' }}</span>
    </button>

    <p class="text-xs text-dream-accent text-center">
      按 Ctrl + Enter 快速生成
    </p>
  </div>
</template>
