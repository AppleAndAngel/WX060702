<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue';
import { useDreamStore } from '@/stores/dream';
import { useAnimationStore } from '@/stores/animation';
import { useHistoryStore } from '@/stores/history';
import DreamInput from '@/components/DreamInput.vue';
import PixelCanvas from '@/components/PixelCanvas.vue';
import FrameControl from '@/components/FrameControl.vue';
import SpriteEditor from '@/components/SpriteEditor.vue';
import ExportPanel from '@/components/ExportPanel.vue';
import { Wand2, Save, BookOpen, Layers } from '@lucide/vue';
import { useRouter } from 'vue-router';

const dreamStore = useDreamStore();
const animationStore = useAnimationStore();
const historyStore = useHistoryStore();
const router = useRouter();

const dreamText = ref('');
const frameCount = ref(4);
const fps = ref(4);

let playInterval: number | null = null;

const handleGenerate = async () => {
  const dream = await dreamStore.generateDream(dreamText.value);
  if (dream) {
    await animationStore.generateAnimation(frameCount.value, fps.value);
    startAutoPlay();
  }
};

const startAutoPlay = () => {
  stopAutoPlay();
  if (animationStore.animation) {
    animationStore.isPlaying = true;
    playInterval = window.setInterval(() => {
      if (animationStore.isPlaying) {
        animationStore.nextFrame();
      }
    }, 1000 / fps.value);
  }
};

const stopAutoPlay = () => {
  if (playInterval) {
    clearInterval(playInterval);
    playInterval = null;
  }
};

const handleTogglePlay = () => {
  animationStore.togglePlay();
  if (animationStore.isPlaying) {
    startAutoPlay();
  } else {
    stopAutoPlay();
  }
};

const handleSave = async () => {
  const saved = await historyStore.saveToHistory();
  if (saved) {
    alert('保存成功！');
  } else {
    alert('保存失败，请先生成动画');
  }
};

watch(fps, () => {
  if (animationStore.isPlaying) {
    startAutoPlay();
  }
});

onMounted(() => {
  if (animationStore.isPlaying) {
    startAutoPlay();
  }
});

onUnmounted(() => {
  stopAutoPlay();
});
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
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div class="lg:col-span-4 space-y-6">
            <DreamInput 
              v-model="dreamText"
              :is-generating="dreamStore.isGenerating || animationStore.isGenerating"
              :error="dreamStore.error"
              @generate="handleGenerate"
            />
            
            <div class="pixel-card space-y-4">
              <h3 class="font-pixel text-sm text-dream-secondary">动画设置</h3>
              
              <div class="space-y-2">
                <label class="block text-sm text-dream-accent">帧数: {{ frameCount }}</label>
                <input 
                  v-model.number="frameCount" 
                  type="range" 
                  min="3" 
                  max="5" 
                  class="pixel-slider"
                />
              </div>
              
              <div class="space-y-2">
                <label class="block text-sm text-dream-accent">FPS: {{ fps }}</label>
                <input 
                  v-model.number="fps" 
                  type="range" 
                  min="1" 
                  max="12" 
                  class="pixel-slider"
                />
              </div>
              
              <button 
                class="pixel-btn w-full flex items-center justify-center gap-2"
                :disabled="!animationStore.animation"
                @click="handleSave"
              >
                <Save class="w-4 h-4" />
                保存到历史
              </button>
            </div>
            
            <SpriteEditor v-if="animationStore.selectedSprite" />
          </div>
          
          <div class="lg:col-span-8 space-y-6">
            <div class="pixel-card">
              <PixelCanvas />
            </div>
            
            <FrameControl 
              v-if="animationStore.animation"
              :current-frame="animationStore.currentFrameIndex + 1"
              :total-frames="animationStore.frameCount"
              :is-playing="animationStore.isPlaying"
              @frame-change="animationStore.setCurrentFrame($event - 1)"
              @toggle-play="handleTogglePlay"
              @prev="animationStore.prevFrame"
              @next="animationStore.nextFrame"
              @add-frame="animationStore.addFrame"
              @remove-frame="animationStore.removeFrame(animationStore.currentFrameIndex)"
              @duplicate-frame="animationStore.duplicateFrame(animationStore.currentFrameIndex)"
            />
            
            <ExportPanel 
              v-if="animationStore.animation"
              :animation="animationStore.animation"
            />
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
