<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { X, Sparkles, Palette, Clock, BookOpen, Users } from 'lucide-vue-next';
import { useNightmarePurifierStore } from '@/stores/nightmarePurifier';
import { createNightmarePurifier } from '@/engine/nightmarePurifier';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

const purifierStore = useNightmarePurifierStore();
const activeSceneIndex = ref(0);
const showColorTransforms = ref(true);
const showEntityChanges = ref(true);

const currentTheater = computed(() => purifierStore.purifiedTheater);
const originalTheater = computed(() => purifierStore.originalTheater);
const stats = computed(() => purifierStore.transformationStats);

const currentSceneDiff = computed(() => {
  if (!currentTheater.value || !originalTheater.value) return null;
  
  const purifiedScene = currentTheater.value.scenes[activeSceneIndex.value];
  const originalScene = originalTheater.value.scenes[activeSceneIndex.value];
  
  if (!purifiedScene || !originalScene) return null;
  
  const purifier = createNightmarePurifier();
  return purifier.compareScenes(originalScene, purifiedScene);
});

const allScenes = computed(() => {
  if (!currentTheater.value) return [];
  return currentTheater.value.scenes;
});

const handleClose = () => {
  emit('close');
};

const handleSceneClick = (index: number) => {
  activeSceneIndex.value = index;
  purifierStore.setCurrentScene(index);
};

const jumpToScene = (index: number) => {
  purifierStore.setCurrentScene(index);
  handleClose();
};

watch(() => props.visible, (newVal) => {
  if (newVal) {
    activeSceneIndex.value = purifierStore.currentSceneIndex;
  }
});
</script>

<template>
  <Teleport to="body">
    <Transition name="fade">
      <div
        v-if="visible && currentTheater"
        class="fixed inset-0 bg-dream-dark/95 flex items-center justify-center z-50 p-4"
        @click.self="handleClose"
      >
        <div class="relative max-w-6xl w-full max-h-[90vh] overflow-auto pixel-card">
          <button
            class="absolute -top-2 -right-2 pixel-btn w-8 h-8 flex items-center justify-center z-10"
            @click="handleClose"
          >
            <X class="w-4 h-4" />
          </button>

          <div class="space-y-6">
            <div class="flex items-center gap-3">
              <Sparkles class="w-6 h-6 text-green-400" />
              <div>
                <h2 class="font-pixel text-lg text-green-400">梦境净化分析</h2>
                <p class="text-dream-accent text-sm">对比原始梦境与净化版本的转换</p>
              </div>
            </div>

            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div class="pixel-border p-4 text-center" style="border-color: rgba(239, 68, 68, 0.4); background: rgba(239, 68, 68, 0.1);">
                <Palette class="w-5 h-5 mx-auto mb-2 text-red-400" />
                <div class="text-2xl font-pixel text-red-400">
                  {{ stats.colorsTransformed }}
                </div>
                <div class="text-xs text-dream-accent">颜色转换</div>
              </div>
              <div class="pixel-border p-4 text-center" style="border-color: rgba(34, 197, 94, 0.4); background: rgba(34, 197, 94, 0.1);">
                <Users class="w-5 h-5 mx-auto mb-2 text-green-400" />
                <div class="text-2xl font-pixel text-green-400">
                  {{ stats.entitiesSoftened }}
                </div>
                <div class="text-xs text-dream-accent">角色柔化</div>
              </div>
              <div class="pixel-border p-4 text-center" style="border-color: rgba(59, 130, 246, 0.4); background: rgba(59, 130, 246, 0.1);">
                <BookOpen class="w-5 h-5 mx-auto mb-2 text-blue-400" />
                <div class="text-2xl font-pixel text-blue-400">
                  {{ stats.descriptionsRewritten }}
                </div>
                <div class="text-xs text-dream-accent">文本重写</div>
              </div>
              <div class="pixel-border p-4 text-center" style="border-color: rgba(245, 158, 11, 0.4); background: rgba(245, 158, 11, 0.1);">
                <Clock class="w-5 h-5 mx-auto mb-2 text-yellow-400" />
                <div class="text-2xl font-pixel text-yellow-400">
                  {{ stats.durationAdjusted }}
                </div>
                <div class="text-xs text-dream-accent">节奏调整</div>
              </div>
            </div>

            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <h3 class="font-pixel text-sm text-dream-secondary">场景净化详情</h3>
                <div class="flex gap-2">
                  <button
                    class="pixel-btn text-xs flex items-center gap-1"
                    @click="showColorTransforms = !showColorTransforms"
                    :class="{ 'bg-dream-primary/30': showColorTransforms }"
                  >
                    <Palette class="w-3 h-3" />
                    {{ showColorTransforms ? '隐藏' : '显示' }}颜色变化
                  </button>
                  <button
                    class="pixel-btn text-xs flex items-center gap-1"
                    @click="showEntityChanges = !showEntityChanges"
                    :class="{ 'bg-dream-primary/30': showEntityChanges }"
                  >
                    <Users class="w-3 h-3" />
                    {{ showEntityChanges ? '隐藏' : '显示' }}角色变化
                  </button>
                </div>
              </div>

              <div class="flex gap-2 overflow-x-auto pb-2">
                <button
                  v-for="(scene, index) in allScenes"
                  :key="scene.id"
                  class="flex-shrink-0 px-4 py-2 pixel-border text-xs transition-all"
                  :class="[
                    activeSceneIndex === index
                      ? 'bg-green-500/30 border-green-500'
                      : 'bg-dream-dark hover:bg-green-500/10'
                  ]"
                  @click="handleSceneClick(index)"
                >
                  第{{ index + 1 }}幕
                  <span class="ml-2 text-dream-accent">
                    {{ scene.purificationNotes ? '✨' : '' }}
                  </span>
                </button>
              </div>
            </div>

            <div v-if="currentSceneDiff" class="space-y-4">
              <div class="flex items-center justify-between">
                <h4 class="font-pixel text-sm text-dream-primary">
                  第{{ activeSceneIndex + 1 }}幕：{{ currentTheater.scenes[activeSceneIndex]?.title }}
                </h4>
                <button
                  class="pixel-btn text-xs"
                  @click="jumpToScene(activeSceneIndex)"
                >
                  跳转到该场景
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div class="pixel-border p-3" style="border-color: rgba(239, 68, 68, 0.3);">
                  <h5 class="text-xs font-pixel text-red-400 mb-2">原始描述</h5>
                  <p class="text-sm text-dream-accent">
                    {{ originalTheater?.scenes[activeSceneIndex]?.description }}
                  </p>
                </div>
                <div class="pixel-border p-3" style="border-color: rgba(34, 197, 94, 0.3);">
                  <h5 class="text-xs font-pixel text-green-400 mb-2">净化描述 ✨</h5>
                  <p class="text-sm text-dream-accent">
                    {{ currentTheater.scenes[activeSceneIndex]?.description }}
                  </p>
                </div>
              </div>

              <div v-if="currentTheater.scenes[activeSceneIndex]?.purificationNotes" class="pixel-border p-3 bg-dream-primary/5">
                <h5 class="text-xs font-pixel text-dream-primary mb-2">净化说明</h5>
                <p class="text-sm text-dream-secondary">
                  {{ currentTheater.scenes[activeSceneIndex]?.purificationNotes }}
                </p>
              </div>

              <div v-if="showColorTransforms && currentSceneDiff.colorChanges.length > 0" class="space-y-2">
                <h5 class="text-xs font-pixel text-dream-secondary">颜色转换</h5>
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div
                    v-for="(change, index) in currentSceneDiff.colorChanges"
                    :key="index"
                    class="flex items-center gap-3 p-3 pixel-border bg-dream-dark/50 hover:bg-dream-dark transition-all"
                  >
                    <div class="flex items-center gap-2">
                      <div
                        class="w-10 h-10 pixel-border shadow-lg transition-transform hover:scale-110"
                        :style="{
                          backgroundColor: change.original,
                          boxShadow: `0 0 15px ${change.original}40`
                        }"
                      />
                      <div class="flex flex-col items-center">
                        <span class="text-lg text-green-400">→</span>
                        <span class="text-[10px] text-dream-accent">净化</span>
                      </div>
                      <div
                        class="w-10 h-10 pixel-border shadow-lg transition-transform hover:scale-110"
                        :style="{
                          backgroundColor: change.purified,
                          boxShadow: `0 0 15px ${change.purified}60`
                        }"
                      />
                    </div>
                    <div class="flex-1 min-w-0">
                      <span class="text-xs text-green-400 font-pixel block" v-if="change.reason">
                        {{ change.reason }}
                      </span>
                      <span class="text-[10px] text-dream-accent block mt-1">
                        <span class="text-red-400">{{ change.original }}</span>
                        <span class="mx-1">→</span>
                        <span class="text-green-400">{{ change.purified }}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div v-if="showEntityChanges && currentSceneDiff.entityDifferences.length > 0" class="space-y-2">
                <h5 class="text-xs font-pixel text-dream-secondary">角色/实体转换</h5>
                <div class="space-y-2">
                  <div
                    v-for="(diff, index) in currentSceneDiff.entityDifferences"
                    :key="index"
                    class="flex items-center gap-3 p-2 pixel-border"
                    :class="{
                      'bg-red-500/10 border-red-500/30': diff.type === 'removed',
                      'bg-green-500/10 border-green-500/30': diff.type === 'added',
                      'bg-yellow-500/10 border-yellow-500/30': diff.type === 'modified',
                    }"
                  >
                    <span
                      class="text-xs font-pixel px-2 py-1 rounded"
                      :class="{
                        'text-red-400': diff.type === 'removed',
                        'text-green-400': diff.type === 'added',
                        'text-yellow-400': diff.type === 'modified',
                      }"
                    >
                      {{ diff.type === 'removed' ? '移除' : diff.type === 'added' ? '新增' : '转换' }}
                    </span>
                    <div class="flex items-center gap-2 flex-1">
                      <span v-if="diff.original" class="text-sm text-dream-accent">
                        {{ diff.original.name }}
                      </span>
                      <span v-if="diff.type === 'modified'" class="text-xs text-dream-accent">→</span>
                      <span v-if="diff.purified" class="text-sm text-dream-secondary">
                        {{ diff.purified.name }}
                      </span>
                    </div>
                    <div v-if="diff.original" class="w-4 h-4 pixel-border" :style="{ backgroundColor: diff.original.color }" />
                    <span v-if="diff.type === 'modified'" class="text-xs text-dream-accent">→</span>
                    <div v-if="diff.purified" class="w-4 h-4 pixel-border" :style="{ backgroundColor: diff.purified.color }" />
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <div class="pixel-border p-3">
                  <h5 class="text-xs font-pixel text-dream-accent mb-2">原始时长</h5>
                  <p class="text-lg font-pixel text-dream-secondary">
                    {{ (originalTheater?.scenes[activeSceneIndex]?.duration || 0) / 1000 }}s
                  </p>
                </div>
                <div class="pixel-border p-3" style="border-color: rgba(34, 197, 94, 0.3);">
                  <h5 class="text-xs font-pixel text-green-400 mb-2">净化时长</h5>
                  <p class="text-lg font-pixel text-green-400">
                    {{ (currentTheater.scenes[activeSceneIndex]?.duration || 0) / 1000 }}s
                  </p>
                </div>
              </div>
            </div>

            <div class="pixel-border p-4 bg-dream-dark">
              <h4 class="font-pixel text-sm text-dream-secondary mb-2">净化说明</h4>
              <div class="text-xs text-dream-accent space-y-1">
                <p><span class="text-red-400">●</span> 原始梦境：保留原始的惊悚/压抑风格</p>
                <p><span class="text-green-400">●</span> 净化梦境：转换为温暖柔和的治愈风格</p>
                <p><span class="text-yellow-400">●</span> 角色关系和事件顺序被完整保留</p>
                <p><span class="text-blue-400">●</span> 节奏被调整为更舒缓的速度</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
