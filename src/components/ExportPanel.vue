<script setup lang="ts">
import { ref, computed } from 'vue';
import { useDreamStore } from '@/stores/dream';
import { useHistoryStore } from '@/stores/history';
import { Download, Share2, FileJson, Image, Film, Copy, Check, X } from 'lucide-vue-next';
import { downloadBlob, copyToClipboard } from '@/utils/pixelUtils';
import type { DreamTheater } from '@/types';

const props = defineProps<{
  theater?: DreamTheater | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

const dreamStore = useDreamStore();
const historyStore = useHistoryStore();

const isExporting = ref(false);
const copySuccess = ref(false);

const theater = computed(() => props.theater || dreamStore.currentDreamTheater);

const exportAsJSON = () => {
  if (!theater.value) return;

  const exportData = {
    version: '1.0',
    exportedAt: Date.now(),
    type: 'dream-theater',
    theater: theater.value,
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const filename = `${theater.value.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${Date.now()}.json`;
  downloadBlob(blob, filename);
};

const exportSceneAsPNG = () => {
  const scene = dreamStore.currentScene;
  if (!scene) return;

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
      const filename = `${scene.title}_第${scene.actNumber}幕_${Date.now()}.png`;
      downloadBlob(blob, filename);
    }
  }, 'image/png');
};

const exportTheaterAsGIF = async () => {
  if (!theater.value || theater.value.scenes.length === 0) return;

  isExporting.value = true;

  try {
    await new Promise(resolve => setTimeout(resolve, 500));

    const firstScene = theater.value.scenes[0];
    const { pixelData } = firstScene.frame;
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

    for (let i = 1; i < theater.value.scenes.length; i++) {
      const scene = theater.value.scenes[i];
      const { pixelData: scenePixels } = scene.frame;

      for (let y = 0; y < scenePixels.height; y++) {
        for (let x = 0; x < scenePixels.width; x++) {
          if (Math.random() > 0.7) {
            ctx.fillStyle = scenePixels.pixels[y][x];
            ctx.fillRect(x * scale, y * scale, scale, scale);
          }
        }
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    canvas.toBlob((blob) => {
      if (blob) {
        const filename = `${theater.value!.title.replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_')}_${Date.now()}.png`;
        downloadBlob(blob, filename);
        alert('已导出预览图（GIF导出需要额外的库支持，此处导出为首帧PNG）');
      }
    }, 'image/png');
  } finally {
    isExporting.value = false;
  }
};

const shareTheater = async () => {
  if (!theater.value) return;

  const shareText = `🎬 ${theater.value.title}\n\n梦境描述：${theater.value.originalDream}\n\n共 ${theater.value.scenes.length} 幕，总时长 ${(theater.value.totalDuration / 1000).toFixed(1)} 秒\n\n—— 来自「像素占梦」梦境分镜剧场`;

  const success = await copyToClipboard(shareText);
  if (success) {
    copySuccess.value = true;
    setTimeout(() => {
      copySuccess.value = false;
    }, 2000);
  } else {
    alert('复制失败，请手动复制');
  }
};

const saveToHistory = async () => {
  const success = await historyStore.saveToHistory();
  if (success) {
    alert('已保存到历史记录！');
  } else {
    alert('保存失败，请先生成分镜剧场');
  }
};
</script>

<template>
  <div class="pixel-card space-y-4">
    <div class="flex items-center justify-between">
      <div class="flex items-center gap-2">
        <Download class="w-5 h-5 text-dream-primary" />
        <h3 class="font-pixel text-sm text-dream-primary">导出与分享</h3>
      </div>
      <button
        class="pixel-btn w-8 h-8 flex items-center justify-center p-0"
        @click="emit('close')"
      >
        <X class="w-4 h-4" />
      </button>
    </div>

    <div v-if="theater" class="space-y-3">
      <div class="text-center text-xs text-dream-accent mb-2">
        {{ theater.title }} · {{ theater.scenes.length }} 幕
      </div>

      <div class="grid grid-cols-2 gap-2">
        <button
          class="pixel-btn px-3 py-2 flex flex-col items-center gap-1 text-xs"
          @click="exportAsJSON"
        >
          <FileJson class="w-5 h-5" />
          <span>导出 JSON</span>
        </button>

        <button
          class="pixel-btn px-3 py-2 flex flex-col items-center gap-1 text-xs"
          :disabled="!dreamStore.currentScene"
          @click="exportSceneAsPNG"
        >
          <Image class="w-5 h-5" />
          <span>导出当前幕</span>
        </button>

        <button
          class="pixel-btn px-3 py-2 flex flex-col items-center gap-1 text-xs"
          :disabled="isExporting"
          @click="exportTheaterAsGIF"
        >
          <Film class="w-5 h-5" :class="{ 'animate-spin': isExporting }" />
          <span>{{ isExporting ? '导出中...' : '导出剧场' }}</span>
        </button>

        <button
          class="pixel-btn px-3 py-2 flex flex-col items-center gap-1 text-xs"
          @click="shareTheater"
        >
          <Check v-if="copySuccess" class="w-5 h-5 text-dream-success" />
          <Share2 v-else class="w-5 h-5" />
          <span>{{ copySuccess ? '已复制!' : '分享链接' }}</span>
        </button>
      </div>

      <button
        class="pixel-btn-primary w-full py-2 flex items-center justify-center gap-2 text-sm"
        @click="saveToHistory"
      >
        <Download class="w-4 h-4" />
        保存到历史记录
      </button>
    </div>

    <div v-else class="text-center py-4 text-dream-accent">
      <p class="text-sm">先生成分镜剧场后才能导出</p>
    </div>
  </div>
</template>
