<script setup lang="ts">
import { useRouter } from 'vue-router';
import { ArrowLeft, BookOpen } from 'lucide-vue-next';
import HistoryPanel from '@/components/HistoryPanel.vue';

const router = useRouter();
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
            <div class="w-12 h-12 bg-dream-primary flex items-center justify-center pixel-border">
              <BookOpen class="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 class="font-pixel text-xl text-dream-primary text-glow-primary">历史记录</h1>
              <p class="text-dream-accent text-sm font-body">Dream History</p>
            </div>
          </div>
        </div>
      </div>
    </header>

    <main class="flex-1 p-6">
      <div class="max-w-4xl mx-auto">
        <div class="pixel-card">
          <HistoryPanel />
        </div>
      </div>
    </main>
  </div>
</template>
