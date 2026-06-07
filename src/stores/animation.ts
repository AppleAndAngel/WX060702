import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Animation, AnimationFrame, PixelData } from '@/types';
import { useRuleSetStore } from './ruleSet';
import { useDreamStore } from './dream';
import { createAnimationGenerator } from '@/engine/animationGenerator';
import { generateId } from '@/utils/pixelUtils';

export const useAnimationStore = defineStore('animation', () => {
  const ruleSetStore = useRuleSetStore();
  const dreamStore = useDreamStore();

  const animation = ref<Animation | null>(null);
  const isGenerating = ref(false);
  const error = ref<string | null>(null);

  const frameCount = computed(() => {
    return animation.value?.frames.length || 0;
  });

  const currentFrameIndex = computed(() => {
    return animation.value?.currentFrameIndex || 0;
  });

  const currentFrame = computed(() => {
    if (!animation.value) return null;
    return animation.value.frames[animation.value.currentFrameIndex];
  });

  const currentPixelData = computed((): PixelData | null => {
    if (dreamStore.currentScene) {
      return dreamStore.currentScene.frame.pixelData;
    }
    return currentFrame.value?.pixelData || null;
  });

  const isPlaying = computed(() => {
    return animation.value?.isPlaying || dreamStore.isPlaying;
  });

  const selectedSprite = computed(() => {
    return animation.value?.selectedSprite || null;
  });

  const fps = computed(() => {
    return animation.value?.fps || dreamStore.generateOptions.fps || 4;
  });

  const generateAnimation = async (frameCount: number, fps: number): Promise<boolean> => {
    const currentRuleSet = ruleSetStore.currentRuleSet;
    if (!currentRuleSet) {
      error.value = '请先选择规则集';
      return false;
    }

    if (!dreamStore.currentScene) {
      error.value = '请先生成分镜场景';
      return false;
    }

    isGenerating.value = true;
    error.value = null;

    try {
      await new Promise(resolve => setTimeout(resolve, 300));

      const generator = createAnimationGenerator(currentRuleSet);
      const newAnimation = generator.generateAnimation(
        dreamStore.currentScene.entities,
        frameCount,
        fps
      );

      animation.value = newAnimation;

      return true;
    } catch (e) {
      error.value = e instanceof Error ? e.message : '生成失败';
      return false;
    } finally {
      isGenerating.value = false;
    }
  };

  const setCurrentFrame = (index: number): void => {
    if (!animation.value) return;
    const clampedIndex = Math.max(0, Math.min(index, animation.value.frames.length - 1));
    animation.value.currentFrameIndex = clampedIndex;
  };

  const nextFrame = (): void => {
    if (dreamStore.isPlaying) {
      dreamStore.nextScene();
      return;
    }

    if (!animation.value) return;
    const nextIndex = animation.value.currentFrameIndex + 1;
    if (nextIndex < animation.value.frames.length) {
      animation.value.currentFrameIndex = nextIndex;
    } else {
      animation.value.currentFrameIndex = 0;
    }
  };

  const prevFrame = (): void => {
    if (dreamStore.isPlaying) {
      dreamStore.prevScene();
      return;
    }

    if (!animation.value) return;
    const prevIndex = animation.value.currentFrameIndex - 1;
    if (prevIndex >= 0) {
      animation.value.currentFrameIndex = prevIndex;
    } else {
      animation.value.currentFrameIndex = animation.value.frames.length - 1;
    }
  };

  const togglePlay = (): void => {
    if (dreamStore.currentDreamTheater) {
      dreamStore.togglePlay();
      if (animation.value) {
        animation.value.isPlaying = dreamStore.isPlaying;
      }
      return;
    }

    if (animation.value) {
      animation.value.isPlaying = !animation.value.isPlaying;
    }
  };

  const setSelectedSprite = (spriteId: string | null): void => {
    if (animation.value) {
      animation.value.selectedSprite = spriteId;
    }
  };

  const addFrame = (): AnimationFrame | null => {
    if (!animation.value) return null;

    const lastFrame = animation.value.frames[animation.value.frames.length - 1];
    const newFrame: AnimationFrame = {
      ...lastFrame,
      id: generateId(),
      index: animation.value.frames.length,
      timestamp: Date.now(),
    };

    animation.value.frames.push(newFrame);
    return newFrame;
  };

  const removeFrame = (index: number): boolean => {
    if (!animation.value) return false;
    if (animation.value.frames.length <= 1) return false;

    animation.value.frames.splice(index, 1);

    animation.value.frames.forEach((frame, i) => {
      frame.index = i;
    });

    if (animation.value.currentFrameIndex >= animation.value.frames.length) {
      animation.value.currentFrameIndex = animation.value.frames.length - 1;
    }

    return true;
  };

  const duplicateFrame = (index: number): AnimationFrame | null => {
    if (!animation.value) return null;

    const originalFrame = animation.value.frames[index];
    if (!originalFrame) return null;

    const newFrame: AnimationFrame = {
      ...originalFrame,
      id: generateId(),
      index: animation.value.frames.length,
      timestamp: Date.now(),
    };

    animation.value.frames.push(newFrame);
    return newFrame;
  };

  const clearAnimation = (): void => {
    animation.value = null;
    error.value = null;
    isGenerating.value = false;
  };

  const setFps = (newFps: number): void => {
    if (animation.value) {
      animation.value.fps = Math.max(1, Math.min(newFps, 60));
    }
    dreamStore.setFps(newFps);
  };

  return {
    animation,
    isGenerating,
    error,
    frameCount,
    currentFrameIndex,
    currentFrame,
    currentPixelData,
    isPlaying,
    selectedSprite,
    fps,
    generateAnimation,
    setCurrentFrame,
    nextFrame,
    prevFrame,
    togglePlay,
    setSelectedSprite,
    addFrame,
    removeFrame,
    duplicateFrame,
    clearAnimation,
    setFps,
  };
});
