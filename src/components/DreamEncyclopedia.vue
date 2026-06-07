<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useDreamStore } from '@/stores/dream';
import { useAnimationStore } from '@/stores/animation';
import { createEncyclopediaGenerator } from '@/engine/encyclopediaGenerator';
import type {
  DreamEncyclopedia,
  EncyclopediaElement,
  ElementCategory,
  EncyclopediaAppearance,
} from '@/types';
import { X, Search, BookOpen, Tag, Filter, Eye, ChevronLeft, ChevronRight, Sparkles, Heart, MapPin, Package, User } from 'lucide-vue-next';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const dreamStore = useDreamStore();
const animationStore = useAnimationStore();
const encyclopediaGenerator = createEncyclopediaGenerator();

const activeTab = ref<ElementCategory | 'all'>('all');
const searchQuery = ref('');
const selectedTag = ref<string | null>(null);
const selectedElement = ref<EncyclopediaElement | null>(null);
const currentAppearanceIndex = ref(0);

const encyclopedia = computed<DreamEncyclopedia | undefined>(() => {
  return dreamStore.currentDreamTheater?.encyclopedia;
});

const categoryNames: Record<ElementCategory, string> = {
  character: '角色',
  item: '物品',
  scene: '场景',
  emotion: '情绪',
};

const categoryIcons: Record<ElementCategory, any> = {
  character: User,
  item: Package,
  scene: MapPin,
  emotion: Heart,
};

const categoryColors: Record<ElementCategory, string> = {
  character: '#ffd93d',
  item: '#6bcb77',
  scene: '#4d96ff',
  emotion: '#e94560',
};

const filteredElements = computed(() => {
  if (!encyclopedia.value) return [];

  const categories: ElementCategory[] = activeTab.value === 'all'
    ? ['character', 'item', 'scene', 'emotion']
    : [activeTab.value];

  return encyclopediaGenerator.filterElements(encyclopedia.value.elements, {
    categories,
    tags: selectedTag.value ? [selectedTag.value] : [],
    searchQuery: searchQuery.value,
  });
});

const groupedElements = computed(() => {
  const groups: Record<ElementCategory, EncyclopediaElement[]> = {
    character: [],
    item: [],
    scene: [],
    emotion: [],
  };

  for (const element of filteredElements.value) {
    groups[element.category].push(element);
  }

  return groups;
});

const availableTags = computed(() => {
  if (!encyclopedia.value) return [];
  return encyclopedia.value.tags;
});

const selectElement = (element: EncyclopediaElement) => {
  selectedElement.value = element;
  currentAppearanceIndex.value = 0;
  if (element.appearances.length > 0) {
    highlightAppearance(element.appearances[0]);
  }
};

const highlightAppearance = (appearance: EncyclopediaAppearance) => {
  animationStore.setHighlightedEntities(appearance.entities, appearance.sceneId);
};

const prevAppearance = () => {
  if (!selectedElement.value) return;
  currentAppearanceIndex.value = Math.max(0, currentAppearanceIndex.value - 1);
  const appearance = selectedElement.value.appearances[currentAppearanceIndex.value];
  if (appearance) {
    highlightAppearance(appearance);
  }
};

const nextAppearance = () => {
  if (!selectedElement.value) return;
  currentAppearanceIndex.value = Math.min(
    selectedElement.value.appearances.length - 1,
    currentAppearanceIndex.value + 1
  );
  const appearance = selectedElement.value.appearances[currentAppearanceIndex.value];
  if (appearance) {
    highlightAppearance(appearance);
  }
};

const clearSelection = () => {
  selectedElement.value = null;
  selectedTag.value = null;
  animationStore.clearHighlightedEntities();
};

const toggleTag = (tagName: string) => {
  if (selectedTag.value === tagName) {
    selectedTag.value = null;
  } else {
    selectedTag.value = tagName;
  }
};

const setActiveTab = (tab: ElementCategory | 'all') => {
  activeTab.value = tab;
  selectedElement.value = null;
};

watch(() => props.visible, (visible) => {
  if (!visible) {
    clearSelection();
  }
});
</script>

<template>
  <div
    v-if="visible && encyclopedia"
    class="fixed inset-0 bg-dream-dark/95 flex items-center justify-center z-50 p-4"
    @click.self="emit('close')"
  >
    <div class="relative max-w-6xl w-full max-h-[90vh] flex flex-col bg-dream-dark pixel-border">
      <div class="flex items-center justify-between p-4 border-b-2 border-dream-border">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-dream-secondary flex items-center justify-center pixel-border">
            <BookOpen class="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 class="font-pixel text-dream-primary text-sm">{{ encyclopedia.title }}</h2>
            <p class="text-xs text-dream-accent">
              共 {{ encyclopedia.elements.length }} 个元素 · {{ encyclopedia.tags.length }} 个标签
            </p>
          </div>
        </div>
        <button
          class="pixel-btn w-8 h-8 flex items-center justify-center"
          @click="emit('close')"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <div class="flex gap-4 p-4 border-b-2 border-dream-border">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-dream-accent" />
          <input
            v-model="searchQuery"
            type="text"
            placeholder="搜索元素..."
            class="pixel-input w-full pl-9"
          />
        </div>
        <div class="flex gap-2">
          <button
            v-for="(name, cat) in categoryNames"
            :key="cat"
            class="pixel-btn px-3 py-2 flex items-center gap-1.5 transition-all"
            :class="{
              'ring-2': activeTab === cat,
            }"
            :style="{
              '--tw-ring-color': categoryColors[cat],
              borderColor: activeTab === cat ? categoryColors[cat] : undefined,
            }"
            @click="setActiveTab(cat as ElementCategory)"
          >
            <component :is="categoryIcons[cat]" class="w-3.5 h-3.5" :style="{ color: categoryColors[cat] }" />
            <span class="text-xs">{{ name }}</span>
          </button>
          <button
            class="pixel-btn px-3 py-2 flex items-center gap-1.5"
            :class="{ 'ring-2 ring-dream-primary': activeTab === 'all' }"
            @click="setActiveTab('all')"
          >
            <Sparkles class="w-3.5 h-3.5 text-dream-primary" />
            <span class="text-xs">全部</span>
          </button>
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden">
        <div class="w-56 flex-shrink-0 border-r-2 border-dream-border p-4 overflow-y-auto">
          <div class="flex items-center gap-2 mb-3">
            <Filter class="w-4 h-4 text-dream-accent" />
            <h3 class="font-pixel text-xs text-dream-secondary">标签筛选</h3>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button
              v-for="tag in availableTags"
              :key="tag.id"
              class="text-[10px] px-2 py-1 pixel-border transition-all cursor-pointer"
              :class="{
                'bg-dream-primary/30 border-dream-primary': selectedTag === tag.name,
                'bg-dream-dark hover:bg-dream-dark/80': selectedTag !== tag.name,
              }"
              :style="{
                borderColor: selectedTag === tag.name ? categoryColors[tag.category] : undefined,
              }"
              @click="toggleTag(tag.name)"
            >
              <Tag class="w-3 h-3 inline mr-1" :style="{ color: categoryColors[tag.category] }" />
              {{ tag.name }}
              <span class="text-dream-accent ml-1">({{ tag.count }})</span>
            </button>
          </div>

          <div class="mt-6 pt-4 border-t border-dream-border">
            <div class="flex items-center gap-2 mb-3">
              <Heart class="w-4 h-4 text-dream-primary" />
              <h3 class="font-pixel text-xs text-dream-secondary">情绪分析</h3>
            </div>
            <div class="space-y-2">
              <div class="text-sm">
                <span class="text-dream-accent">主情绪：</span>
                <span class="text-dream-primary font-medium">{{ encyclopedia.emotionAnalysis.primaryEmotion }}</span>
              </div>
              <div class="text-sm">
                <span class="text-dream-accent">强度：</span>
                <span class="text-dream-secondary">{{ encyclopedia.emotionAnalysis.intensity }}%</span>
              </div>
              <div class="w-full h-2 bg-dream-border rounded-full overflow-hidden">
                <div
                  class="h-full bg-dream-primary transition-all"
                  :style="{ width: `${encyclopedia.emotionAnalysis.intensity}%` }"
                />
              </div>
              <div class="text-xs text-dream-accent mt-2">
                {{ encyclopedia.emotionAnalysis.description }}
              </div>
              <div class="flex flex-wrap gap-1 mt-2">
                <span
                  v-for="keyword in encyclopedia.emotionAnalysis.keywords"
                  :key="keyword"
                  class="text-[10px] px-1.5 py-0.5 bg-dream-primary/20 text-dream-primary pixel-border"
                >
                  {{ keyword }}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex-1 overflow-y-auto p-4">
          <template v-if="!selectedElement">
            <div v-if="filteredElements.length === 0" class="text-center py-12 text-dream-accent">
              <div class="text-4xl mb-3">🔍</div>
              <p class="font-pixel text-sm">没有找到匹配的元素</p>
              <p class="text-xs mt-1">试试其他筛选条件</p>
            </div>

            <template v-else>
              <template v-for="(elements, category) in groupedElements" :key="category">
                <div v-if="elements.length > 0" class="mb-6">
                  <h3 class="font-pixel text-xs mb-3 flex items-center gap-2">
                    <component :is="categoryIcons[category as ElementCategory]" class="w-4 h-4" :style="{ color: categoryColors[category as ElementCategory] }" />
                    <span :style="{ color: categoryColors[category as ElementCategory] }">
                      {{ categoryNames[category as ElementCategory] }} ({{ elements.length }})
                    </span>
                  </h3>
                  <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div
                      v-for="element in elements"
                      :key="element.id"
                      class="pixel-card p-3 cursor-pointer transition-all hover:scale-[1.02] hover:shadow-lg"
                      @click="selectElement(element)"
                    >
                      <div class="flex items-start gap-2 mb-2">
                        <div
                          class="w-8 h-8 flex-shrink-0 pixel-border flex items-center justify-center"
                          :style="{ backgroundColor: element.color + '30', borderColor: element.color }"
                        >
                          <component :is="categoryIcons[element.category]" class="w-4 h-4" :style="{ color: element.color }" />
                        </div>
                        <div class="flex-1 min-w-0">
                          <h4 class="font-pixel text-xs text-white truncate">{{ element.name }}</h4>
                          <p class="text-[10px] text-dream-accent">
                            出现 {{ element.appearances.length }} 次
                          </p>
                        </div>
                      </div>
                      <p class="text-[10px] text-dream-accent line-clamp-2 mb-2">
                        {{ element.description }}
                      </p>
                      <div class="flex flex-wrap gap-1">
                        <span
                          v-for="tag in element.tags.slice(0, 3)"
                          :key="tag"
                          class="text-[9px] px-1.5 py-0.5 bg-dream-dark text-dream-accent pixel-border"
                        >
                          {{ tag }}
                        </span>
                        <span v-if="element.tags.length > 3" class="text-[9px] text-dream-accent">
                          +{{ element.tags.length - 3 }}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </template>
            </template>
          </template>

          <template v-else>
            <div class="flex items-center gap-2 mb-4">
              <button
                class="pixel-btn px-3 py-1.5 text-xs flex items-center gap-1"
                @click="clearSelection"
              >
                <ChevronLeft class="w-3 h-3" />
                返回列表
              </button>
              <span class="text-dream-accent text-xs">/ 元素详情</span>
            </div>

            <div class="pixel-card p-6">
              <div class="flex items-start gap-4 mb-6">
                <div
                  class="w-16 h-16 flex-shrink-0 pixel-border flex items-center justify-center"
                  :style="{ backgroundColor: selectedElement.color + '30', borderColor: selectedElement.color }"
                >
                  <component :is="categoryIcons[selectedElement.category]" class="w-8 h-8" :style="{ color: selectedElement.color }" />
                </div>
                <div class="flex-1">
                  <div class="flex items-center gap-2 mb-1">
                    <span
                      class="text-[10px] px-2 py-0.5 pixel-border"
                      :style="{ color: categoryColors[selectedElement.category], borderColor: categoryColors[selectedElement.category] }"
                    >
                      {{ categoryNames[selectedElement.category] }}
                    </span>
                  </div>
                  <h3 class="font-pixel text-lg text-white mb-2">{{ selectedElement.name }}</h3>
                  <p class="text-sm text-dream-accent">{{ selectedElement.description }}</p>
                </div>
              </div>

              <div class="mb-6">
                <h4 class="font-pixel text-xs text-dream-secondary mb-3 flex items-center gap-2">
                  <Tag class="w-3.5 h-3.5" />
                  标签
                </h4>
                <div class="flex flex-wrap gap-2">
                  <span
                    v-for="tag in selectedElement.tags"
                    :key="tag"
                    class="text-xs px-2 py-1 bg-dream-dark text-dream-accent pixel-border"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>

              <div>
                <h4 class="font-pixel text-xs text-dream-secondary mb-3 flex items-center gap-2">
                  <Eye class="w-3.5 h-3.5" />
                  画面出处 ({{ selectedElement.appearances.length }} 处)
                </h4>

                <div v-if="selectedElement.appearances.length === 0" class="text-center py-4 text-dream-accent text-sm">
                  无具体出现位置
                </div>

                <template v-else>
                  <div class="flex items-center justify-between mb-3">
                    <button
                      class="pixel-btn px-3 py-1.5 text-xs flex items-center gap-1"
                      :disabled="currentAppearanceIndex === 0"
                      @click="prevAppearance"
                    >
                      <ChevronLeft class="w-3 h-3" />
                      上一处
                    </button>
                    <span class="text-xs text-dream-accent">
                      {{ currentAppearanceIndex + 1 }} / {{ selectedElement.appearances.length }}
                    </span>
                    <button
                      class="pixel-btn px-3 py-1.5 text-xs flex items-center gap-1"
                      :disabled="currentAppearanceIndex === selectedElement.appearances.length - 1"
                      @click="nextAppearance"
                    >
                      下一处
                      <ChevronRight class="w-3 h-3" />
                    </button>
                  </div>

                  <div
                    v-for="(appearance, index) in selectedElement.appearances"
                    :key="appearance.sceneId"
                    class="pixel-card p-3 mb-2 cursor-pointer transition-all"
                    :class="{
                      'ring-2 ring-dream-primary': index === currentAppearanceIndex,
                      'opacity-60': index !== currentAppearanceIndex,
                    }"
                    @click="currentAppearanceIndex = index; highlightAppearance(appearance)"
                  >
                    <div class="flex items-center justify-between">
                      <div>
                        <span class="font-pixel text-xs text-dream-primary">
                          第 {{ appearance.actNumber }} 幕
                        </span>
                        <span class="text-sm text-white ml-2">{{ appearance.sceneTitle }}</span>
                      </div>
                      <span class="text-[10px] text-dream-accent">
                        {{ appearance.entities.length }} 个实例
                      </span>
                    </div>
                    <div
                      v-if="appearance.entities.length > 0"
                      class="mt-2 flex flex-wrap gap-1"
                    >
                      <span
                        v-for="(entity, i) in appearance.entities"
                        :key="i"
                        class="text-[9px] px-1.5 py-0.5 pixel-border"
                        :style="{ backgroundColor: entity.color + '20', borderColor: entity.color, color: entity.color }"
                      >
                        ({{ entity.x }}, {{ entity.y }}) {{ entity.width }}×{{ entity.height }}
                      </span>
                    </div>
                  </div>
                </template>
              </div>
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
