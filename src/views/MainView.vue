<script setup lang="ts">
import { ref } from 'vue';
import { useDreamStore } from '@/stores/dream';
import { useHistoryStore } from '@/stores/history';
import DreamInput from '@/components/DreamInput.vue';
import PixelCanvas from '@/components/PixelCanvas.vue';
import DreamTheaterTimeline from '@/components/DreamTheaterTimeline.vue';
import SpriteEditor from '@/components/SpriteEditor.vue';
import ExportPanel from '@/components/ExportPanel.vue';
import DreamEncyclopedia from '@/components/DreamEncyclopedia.vue';
import DreamMapView from '@/components/DreamMapView.vue';
import { Wand2, Save, BookOpen, Layers, Loader2, BookMarked, Users, MapPin, GitBranch, Sparkles } from 'lucide-vue-next';
import { useRouter } from 'vue-router';

const dreamStore = useDreamStore();
const historyStore = useHistoryStore();
const router = useRouter();

const dreamText = ref('');
const sceneCount = ref(4);
const showExportPanel = ref(false);
const showEncyclopedia = ref(false);
const showDreamMap = ref(false);

const handleGenerate = async () => {
  if (!dreamText.value.trim()) return;
  await dreamStore.generateDream(dreamText.value, sceneCount.value);
};

const handleSave = async () => {
  const saved = await historyStore.saveToHistory();
  if (saved) {
    alert('已保存到历史记录！');
  } else {
    alert('请先生成梦境剧场');
  }
};

const handleExport = () => {
  showExportPanel.value = true;
};

const closeExportPanel = () => {
  showExportPanel.value = false;
};

const handleOpenEncyclopedia = () => {
  if (dreamStore.currentDreamTheater?.encyclopedia) {
    showEncyclopedia.value = true;
  }
};

const handleOpenDreamMap = () => {
  if (dreamStore.currentDreamTheater) {
    showDreamMap.value = true;
  }
};
</script>

<template>
  <div class="min-h-screen flex flex-col">
    <header class="bg-dream-dark border-b-4 border-dream-border py-4 px-6">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 bg-dream-primary flex items-center justify-center pixel-border">
            <Wand2 class="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 class="font-pixel text-xl text-dream-primary text-glow-primary">像素占梦</h1>
            <p class="text-dream-accent text-sm font-body">Pixel Dream Generator</p>
          </div>
        </div>

        <nav class="flex items-center gap-4">
          <button
            class="pixel-btn flex items-center gap-2"
            @click="router.push('/branching')"
          >
            <GitBranch class="w-4 h-4" />
            <span>结局分支</span>
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
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-4 space-y-6">
            <DreamInput
              v-model="dreamText"
              :is-generating="dreamStore.isGenerating"
              :error="dreamStore.error"
              @generate="handleGenerate"
            />

            <div class="pixel-card space-y-4">
              <h3 class="font-pixel text-sm text-dream-secondary">分镜设置</h3>

              <div class="space-y-2">
                <label class="block text-sm text-dream-accent">分镜数量: {{ sceneCount }} 幕</label>
                <input
                  v-model.number="sceneCount"
                  type="range"
                  min="3"
                  max="5"
                  class="pixel-slider"
                />
              </div>

              <div class="flex gap-2">
                <button
                  class="flex-1 pixel-btn flex items-center justify-center gap-2"
                  :disabled="!dreamStore.currentDreamTheater"
                  @click="handleSave"
                >
                  <Save class="w-4 h-4" />
                  保存
                </button>
                <button
                  class="flex-1 pixel-btn flex items-center justify-center gap-2"
                  :disabled="!dreamStore.currentDreamTheater?.encyclopedia"
                  @click="handleOpenEncyclopedia"
                >
                  <BookMarked class="w-4 h-4" />
                  图鉴
                </button>
                <button
                  class="flex-1 pixel-btn flex items-center justify-center gap-2"
                  :disabled="!dreamStore.currentDreamTheater"
                  @click="handleOpenDreamMap"
                >
                  <MapPin class="w-4 h-4" />
                  地图
                </button>
                <button
                  class="flex-1 pixel-btn-primary flex items-center justify-center gap-2"
                  :disabled="!dreamStore.currentDreamTheater"
                  @click="handleExport"
                >
                  <Loader2
                    v-if="dreamStore.isGenerating"
                    class="w-4 h-4 animate-spin"
                  />
                  <template v-else>导出</template>
                </button>
              </div>

              <button
                class="w-full pixel-btn flex items-center justify-center gap-2 mt-2"
                :disabled="!dreamStore.currentDreamTheater"
                :class="dreamStore.currentDreamTheater ? 'bg-gradient-to-r from-yellow-500/20 via-purple-500/20 to-red-500/20' : ''"
                @click="router.push('/branching')"
              >
                <GitBranch class="w-4 h-4" />
                生成三种不同结局
              </button>
            </div>

            <SpriteEditor v-if="dreamStore.selectedSprite" />
          </div>

          <div class="lg:col-span-8 space-y-6">
            <div class="pixel-card">
              <PixelCanvas />
            </div>

            <DreamTheaterTimeline
              v-if="dreamStore.currentDreamTheater"
              :theater="dreamStore.currentDreamTheater"
              :current-index="dreamStore.currentSceneIndex"
              :is-playing="dreamStore.isPlaying"
              :is-generating="dreamStore.isGenerating"
              @update:current-index="dreamStore.setCurrentScene"
              @play="dreamStore.togglePlay"
              @prev="dreamStore.prevScene"
              @next="dreamStore.nextScene"
              @regenerate="dreamStore.regenerateScene"
              @update:scene-title="dreamStore.updateSceneTitle"
              @update:scene-description="dreamStore.updateSceneDescription"
              @update:scene-duration="dreamStore.setSceneDuration"
              @add-scene="dreamStore.addScene"
              @remove-scene="dreamStore.removeScene"
              @duplicate-scene="dreamStore.duplicateScene"
              @move-scene="dreamStore.moveScene"
            />

            <ExportPanel
              v-if="dreamStore.currentDreamTheater"
              :theater="dreamStore.currentDreamTheater"
              @close="closeExportPanel"
            />
          </div>
        </div>
      </div>
    </main>

    <div
      v-if="showExportPanel && dreamStore.currentDreamTheater"
      class="fixed inset-0 bg-dream-dark/90 flex items-center justify-center z-50 p-4"
      @click.self="closeExportPanel"
    >
      <div class="relative max-w-3xl w-full max-h-[90vh] overflow-auto">
        <button
          class="absolute -top-2 -right-2 pixel-btn w-8 h-8 flex items-center justify-center z-10"
          @click="closeExportPanel"
        >
          ✕
        </button>
        <ExportPanel
          :theater="dreamStore.currentDreamTheater"
          @close="closeExportPanel"
        />
      </div>
    </div>

    <DreamEncyclopedia
      :visible="showEncyclopedia"
      @close="showEncyclopedia = false"
    />

    <DreamMapView
      :visible="showDreamMap"
      @close="showDreamMap = false"
    />
  </div>
</template>
