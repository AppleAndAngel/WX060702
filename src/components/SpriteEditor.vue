<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useAnimationStore } from '@/stores/animation';
import { createSpriteMapper } from '@/engine/spriteMapper';
import { X, Save, Trash2 } from 'lucide-vue-next';
import type { Sprite } from '@/types';
import { generateId } from '@/utils/pixelUtils';

const animationStore = useAnimationStore();
const spriteMapper = createSpriteMapper();

const sprites = computed(() => spriteMapper.getAllSprites());
const selectedSprite = ref<Sprite | null>(null);
const editingPixels = ref<number[][]>([]);

const paletteColors = [
  '#1a1a2e', '#16213e', '#0f3460', '#533483', '#e94560',
  '#ffd93d', '#6bcb77', '#4d96ff', '#f5c6aa', '#ffffff',
];

watch(() => animationStore.selectedSprite, (spriteId) => {
  if (spriteId) {
    const sprite = spriteMapper.getSpriteById(spriteId);
    if (sprite) {
      selectSprite(sprite);
    }
  }
}, { immediate: true });

const selectSprite = (sprite: Sprite) => {
  selectedSprite.value = sprite;
  editingPixels.value = sprite.pixels.map(row => [...row]);
};

const setPixel = (x: number, y: number, colorIndex: number) => {
  if (editingPixels.value[y] && editingPixels.value[y][x] !== undefined) {
    editingPixels.value[y][x] = colorIndex;
  }
};

const clearCanvas = () => {
  if (selectedSprite.value) {
    editingPixels.value = Array(selectedSprite.value.height)
      .fill(null)
      .map(() => Array(selectedSprite.value.width).fill(0));
  }
};

const saveSprite = () => {
  if (selectedSprite.value) {
    const updatedSprite: Sprite = {
      ...selectedSprite.value,
      pixels: editingPixels.value.map(row => [...row]),
    };
    spriteMapper.addSprite(updatedSprite);
    alert('精灵已保存！');
  }
};

const createNewSprite = () => {
  const width = 8;
  const height = 8;
  const newSprite: Sprite = {
    id: generateId(),
    name: `新精灵 ${sprites.value.length + 1}`,
    width,
    height,
    palette: [...paletteColors],
    pixels: Array(height).fill(null).map(() => Array(width).fill(0)),
  };
  spriteMapper.addSprite(newSprite);
  selectSprite(newSprite);
};

const deleteSprite = () => {
  if (selectedSprite.value && confirm('确定要删除这个精灵吗？')) {
    spriteMapper.removeSprite(selectedSprite.value.id);
    selectedSprite.value = null;
    editingPixels.value = [];
  }
};

const closeEditor = () => {
  animationStore.setSelectedSprite(null);
  selectedSprite.value = null;
};
</script>

<template>
  <div class="pixel-card space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="font-pixel text-sm text-dream-primary">精灵编辑器</h3>
      <button class="pixel-btn p-1" @click="closeEditor">
        <X class="w-4 h-4" />
      </button>
    </div>

    <div class="flex gap-2 flex-wrap">
      <button
        v-for="sprite in sprites"
        :key="sprite.id"
        class="p-1 pixel-border transition-all"
        :class="selectedSprite?.id === sprite.id ? 'bg-dream-primary/30' : 'bg-dream-dark hover:bg-dream-dark/80'"
        @click="selectSprite(sprite)"
      >
        <canvas
          :width="sprite.width * 4"
          :height="sprite.height * 4"
          class="block"
          :style="{ imageRendering: 'pixelated' }"
          ref="canvas"
        />
      </button>
      <button
        class="w-12 h-12 pixel-border bg-dream-dark hover:bg-dream-dark/80 flex items-center justify-center text-dream-accent font-pixel text-lg"
        @click="createNewSprite"
      >
        +
      </button>
    </div>

    <div v-if="selectedSprite" class="space-y-4">
      <div class="text-center">
        <p class="text-sm text-dream-secondary">{{ selectedSprite.name }}</p>
        <p class="text-xs text-dream-accent">{{ selectedSprite.width }} × {{ selectedSprite.height }}</p>
      </div>

      <div class="flex justify-center">
        <div
          class="grid gap-px bg-dream-border p-px pixel-border"
          :style="{
            gridTemplateColumns: `repeat(${selectedSprite.width}, 1fr)`,
          }"
        >
          <div
            v-for="(row, y) in editingPixels"
            v-bind:key="y"
            class="contents"
          >
            <div
              v-for="(pixel, x) in row"
              :key="x"
              class="w-6 h-6 cursor-pointer hover:opacity-80 transition-opacity"
              :style="{ backgroundColor: selectedSprite.palette[pixel] || '#000' }"
              @click="setPixel(x, y, (pixel + 1) % selectedSprite.palette.length)"
              @contextmenu.prevent="setPixel(x, y, 0)"
            />
          </div>
        </div>
      </div>

      <div class="flex flex-wrap gap-1 justify-center">
        <div
          v-for="(color, index) in selectedSprite.palette"
          :key="index"
          class="w-6 h-6 cursor-pointer pixel-border hover:scale-110 transition-transform"
          :style="{ backgroundColor: color }"
          @click="setPixel(0, 0, index)"
        />
      </div>

      <div class="flex gap-2 justify-center">
        <button
          class="pixel-btn px-3 py-1.5 flex items-center gap-1.5 text-sm"
          @click="clearCanvas"
        >
          清空
        </button>
        <button
          class="pixel-btn-primary px-3 py-1.5 flex items-center gap-1.5 text-sm"
          @click="saveSprite"
        >
          <Save class="w-4 h-4" />
          保存
        </button>
        <button
          class="pixel-btn px-3 py-1.5 flex items-center gap-1.5 text-sm text-dream-error hover:bg-dream-error/20"
          @click="deleteSprite"
        >
          <Trash2 class="w-4 h-4" />
          删除
        </button>
      </div>

      <p class="text-xs text-dream-accent text-center">
        左键点击填色，右键清除
      </p>
    </div>
  </div>
</template>
