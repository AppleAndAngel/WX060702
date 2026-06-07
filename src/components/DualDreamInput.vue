<script setup lang="ts">
import { computed } from 'vue';
import { Sparkles, Loader2, User, Palette } from 'lucide-vue-next';
import { useDualDreamStore } from '@/stores/dualDream';
import type { MergeStrategy } from '@/types';

const dualDreamStore = useDualDreamStore();

const emit = defineEmits<{
  (e: 'generate'): void;
}>();

const player1 = computed(() => dualDreamStore.player1);
const player2 = computed(() => dualDreamStore.player2);
const isGenerating = computed(() => dualDreamStore.isGenerating);
const error = computed(() => dualDreamStore.error);
const canGenerate = computed(() => dualDreamStore.canGenerate);
const generateOptions = computed(() => dualDreamStore.generateOptions);

const mergeStrategies: { value: MergeStrategy; label: string; description: string }[] = [
  { value: 'overlay', label: '交融叠加', description: '双方元素交织在一起，营造共梦氛围' },
  { value: 'split', label: '分屏交替', description: '左右分屏显示，突出各自的梦境世界' },
  { value: 'alternate', label: '轮转突出', description: '按幕交替突出一方的梦境元素' },
];

const exampleDreams = [
  {
    player1: '我在星空下飞翔，穿过云层追逐发光的蝴蝶',
    player2: '我在深海里遨游，身边游过五彩斑斓的珊瑚和鱼群',
  },
  {
    player1: '一座漂浮在云端的城堡，彩虹桥连接着各个塔楼',
    player2: '一座沉入海底的古老遗迹，美人鱼在废墟中歌唱',
  },
  {
    player1: '深夜的森林里，会说话的动物们在举行神秘仪式',
    player2: '霓虹闪烁的都市里，我在雨中奔跑寻找回家的路',
  },
  {
    player1: '我骑着巨龙飞越火山，岩浆在下方翻涌',
    player2: '我驾驶飞船穿越星云，流星在身边划过',
  },
];

const handleGenerate = () => {
  if (!isGenerating.value && canGenerate.value) {
    emit('generate');
  }
};

const useExample = (example: { player1: string; player2: string }) => {
  dualDreamStore.setPlayer1Dream(example.player1);
  dualDreamStore.setPlayer2Dream(example.player2);
};

const handlePlayer1NameChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  dualDreamStore.setPlayer1Name(target.value);
};

const handlePlayer2NameChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  dualDreamStore.setPlayer2Name(target.value);
};

const handlePlayer1DreamChange = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  dualDreamStore.setPlayer1Dream(target.value);
};

const handlePlayer2DreamChange = (e: Event) => {
  const target = e.target as HTMLTextAreaElement;
  dualDreamStore.setPlayer2Dream(target.value);
};

const handlePlayer1ColorChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  dualDreamStore.setPlayer1Color(target.value);
};

const handlePlayer2ColorChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  dualDreamStore.setPlayer2Color(target.value);
};

const handleSceneCountChange = (e: Event) => {
  const target = e.target as HTMLInputElement;
  dualDreamStore.setGenerateOptions({ sceneCount: parseInt(target.value) });
};

const handleStrategyChange = (strategy: MergeStrategy) => {
  dualDreamStore.setMergeStrategy(strategy);
};
</script>

<template>
  <div class="space-y-6">
    <div class="pixel-card space-y-4">
      <div class="flex items-center gap-2">
        <Sparkles class="w-5 h-5 text-dream-primary" />
        <h3 class="font-pixel text-sm text-dream-primary">双人合梦创作</h3>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <div
              class="w-6 h-6 rounded-full pixel-border"
              :style="{ backgroundColor: player1.color }"
            />
            <input
              :value="player1.name"
              @input="handlePlayer1NameChange"
              class="flex-1 pixel-input text-sm"
              placeholder="梦者 A 的名字"
              :disabled="isGenerating"
            />
            <label class="cursor-pointer">
              <input
                type="color"
                :value="player1.color"
                @input="handlePlayer1ColorChange"
                class="w-8 h-8 cursor-pointer opacity-0 absolute"
                :disabled="isGenerating"
              />
              <Palette class="w-5 h-5 text-dream-accent hover:text-dream-primary transition-colors" />
            </label>
          </div>
          <textarea
            :value="player1.dreamText"
            @input="handlePlayer1DreamChange"
            :disabled="isGenerating"
            placeholder="梦者 A 的梦境描述..."
            rows="4"
            class="pixel-textarea w-full"
            :style="{ borderColor: player1.color + '80' }"
          />
        </div>

        <div class="space-y-3">
          <div class="flex items-center gap-2">
            <div
              class="w-6 h-6 rounded-full pixel-border"
              :style="{ backgroundColor: player2.color }"
            />
            <input
              :value="player2.name"
              @input="handlePlayer2NameChange"
              class="flex-1 pixel-input text-sm"
              placeholder="梦者 B 的名字"
              :disabled="isGenerating"
            />
            <label class="cursor-pointer">
              <input
                type="color"
                :value="player2.color"
                @input="handlePlayer2ColorChange"
                class="w-8 h-8 cursor-pointer opacity-0 absolute"
                :disabled="isGenerating"
              />
              <Palette class="w-5 h-5 text-dream-accent hover:text-dream-primary transition-colors" />
            </label>
          </div>
          <textarea
            :value="player2.dreamText"
            @input="handlePlayer2DreamChange"
            :disabled="isGenerating"
            placeholder="梦者 B 的梦境描述..."
            rows="4"
            class="pixel-textarea w-full"
            :style="{ borderColor: player2.color + '80' }"
          />
        </div>
      </div>

      <div v-if="error" class="text-dream-error text-sm pixel-border p-2 bg-dream-error/10">
        {{ error }}
      </div>

      <div class="space-y-3">
        <p class="text-dream-accent text-xs">灵感示例（点击填充）：</p>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="(example, index) in exampleDreams"
            :key="index"
            class="text-xs px-2 py-1 pixel-border bg-dream-dark hover:bg-dream-primary/20 text-dream-secondary transition-colors"
            :disabled="isGenerating"
            @click="useExample(example)"
          >
            示例 {{ index + 1 }}
          </button>
        </div>
      </div>
    </div>

    <div class="pixel-card space-y-4">
      <h3 class="font-pixel text-sm text-dream-secondary">合梦设置</h3>

      <div class="space-y-2">
        <label class="block text-sm text-dream-accent">分镜数量: {{ generateOptions.sceneCount }} 幕</label>
        <input
          :value="generateOptions.sceneCount"
          @input="handleSceneCountChange"
          type="range"
          min="3"
          max="5"
          class="pixel-slider"
          :disabled="isGenerating"
        />
      </div>

      <div class="space-y-2">
        <label class="block text-sm text-dream-accent">融合策略</label>
        <div class="grid grid-cols-3 gap-2">
          <button
            v-for="strategy in mergeStrategies"
            :key="strategy.value"
            class="p-3 pixel-border text-left transition-all"
            :class="[
              generateOptions.mergeStrategy === strategy.value
                ? 'bg-dream-primary/30 border-dream-primary'
                : 'bg-dream-dark hover:bg-dream-primary/10'
            ]"
            :disabled="isGenerating"
            @click="handleStrategyChange(strategy.value)"
          >
            <div class="text-xs font-pixel text-dream-primary mb-1">{{ strategy.label }}</div>
            <div class="text-xs text-dream-accent">{{ strategy.description }}</div>
          </button>
        </div>
      </div>

      <button
        class="pixel-btn-primary w-full flex items-center justify-center gap-2"
        :disabled="isGenerating || !canGenerate"
        @click="handleGenerate"
      >
        <Loader2 v-if="isGenerating" class="w-5 h-5 animate-spin" />
        <Sparkles v-else class="w-5 h-5" />
        <span>{{ isGenerating ? '合梦中...' : '开始双人合梦' }}</span>
      </button>

      <p class="text-xs text-dream-accent text-center">
        融合双方梦境，创造独一无二的共享像素动画
      </p>
    </div>
  </div>
</template>
