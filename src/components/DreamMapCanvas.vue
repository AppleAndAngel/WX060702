<script setup lang="ts">import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import type { DreamMap, MapNode, MapConnection } from '@/types/dreamMap';
import { useDreamStore } from '@/stores/dream';
import { MapPin, Play, Pause, SkipForward, SkipBack, Download, ZoomIn, ZoomOut, Maximize2 } from 'lucide-vue-next';
const props = defineProps<{
 dreamMap: DreamMap;
 isPlaybackMode?: boolean;
 playbackProgress?: number;
 currentNodeIndex?: number;
}>();
const emit = defineEmits<{
 (e: 'nodeClick', node: MapNode): void;
 (e: 'nodeHover', node: MapNode | null): void;
 (e: 'togglePlayback'): void;
 (e: 'prevNode'): void;
 (e: 'nextNode'): void;
 (e: 'export'): void;
}>();
const dreamStore = useDreamStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const containerRef = ref<HTMLDivElement | null>(null);
const pixelSize = ref(2);
const offsetX = ref(0);
const offsetY = ref(0);
const isDragging = ref(false);
const lastMousePos = ref({ x: 0, y: 0 });
const hoveredNode = ref<MapNode | null>(null);
const scale = ref(1);
const isEmpty = computed(() => !props.dreamMap);
const drawMap = () => {
 const canvas = canvasRef.value;
 const map = props.dreamMap;
 if (!canvas || !map)
 return;
 const ctx = canvas.getContext('2d');
 if (!ctx)
 return;
 canvas.width = map.width * pixelSize.value;
 canvas.height = map.height * pixelSize.value;
 ctx.imageSmoothingEnabled = false;
 ctx.save();
 ctx.translate(offsetX.value, offsetY.value);
 ctx.scale(scale.value, scale.value);
 drawBackground(ctx, map);
 drawGrid(ctx, map);
 drawConnections(ctx, map);
 drawNodes(ctx, map);
 if (props.isPlaybackMode) {
 drawPlaybackIndicator(ctx, map);
 }
 ctx.restore();
};
const drawBackground = (ctx: CanvasRenderingContext2D, map: DreamMap) => {
 ctx.fillStyle = map.background;
 ctx.fillRect(0, 0, map.width, map.height);
 drawStars(ctx, map);
 drawDreamParticles(ctx, map);
};
const drawStars = (ctx: CanvasRenderingContext2D, map: DreamMap) => {
 const starCount = Math.floor((map.width * map.height) / 5000);
 for (let i = 0; i < starCount; i++) {
 const x = (i * 137.5) % map.width;
 const y = (i * 89.3) % map.height;
 const size = (i % 3) + 1;
 const brightness = 0.3 + (Math.sin(Date.now() / 1000 + i) + 1) * 0.2;
 ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
 ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
 }
};
const drawDreamParticles = (ctx: CanvasRenderingContext2D, map: DreamMap) => {
 const particleCount = 20;
 const time = Date.now() / 2000;
 for (let i = 0; i < particleCount; i++) {
 const baseX = (i * 173.7) % map.width;
 const baseY = (i * 97.1) % map.height;
 const x = baseX + Math.sin(time + i * 0.7) * 20;
 const y = baseY + Math.cos(time + i * 0.5) * 15;
 const size = 2;
 const alpha = 0.1 + (Math.sin(time * 2 + i) + 1) * 0.15;
 const colors = ['#e94560', '#533483', '#f59e0b'];
 ctx.fillStyle = colors[i % colors.length].replace(')', `, ${alpha})`).replace('rgb', 'rgba');
 ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
 }
};
const drawGrid = (ctx: CanvasRenderingContext2D, map: DreamMap) => {
 ctx.strokeStyle = 'rgba(42, 42, 58, 0.5)';
 ctx.lineWidth = 1;
 for (let x = 0; x <= map.width; x += map.gridSize) {
 ctx.beginPath();
 ctx.moveTo(x, 0);
 ctx.lineTo(x, map.height);
 ctx.stroke();
 }
 for (let y = 0; y <= map.height; y += map.gridSize) {
 ctx.beginPath();
 ctx.moveTo(0, y);
 ctx.lineTo(map.width, y);
 ctx.stroke();
 }
};
const drawConnections = (ctx: CanvasRenderingContext2D, map: DreamMap) => {
 map.connections.forEach((connection, index) => {
 const fromNode = map.nodes.find(n => n.id === connection.fromNodeId);
 const toNode = map.nodes.find(n => n.id === connection.toNodeId);
 if (!fromNode || !toNode)
 return;
 const isTraversed = fromNode.isVisited && toNode.isVisited;
 const isActive = props.isPlaybackMode &&
 index <= (props.currentNodeIndex || 0) - 1;
 drawConnectionPath(ctx, connection, isTraversed, isActive);
 drawConnectionDecorations(ctx, connection, index);
 });
};
const drawConnectionPath = (ctx: CanvasRenderingContext2D, connection: MapConnection, isTraversed: boolean, isActive: boolean) => {
 if (connection.pathPoints.length < 2)
 return;
 ctx.beginPath();
 ctx.moveTo(connection.pathPoints[0].x, connection.pathPoints[0].y);
 for (let i = 1; i < connection.pathPoints.length; i++) {
 ctx.lineTo(connection.pathPoints[i].x, connection.pathPoints[i].y);
 }
 ctx.lineWidth = isActive ? 4 : 2;
 ctx.strokeStyle = isActive ? connection.color : isTraversed ? connection.color : 'rgba(42, 42, 58, 0.8)';
 if (connection.style === 'dashed') {
 ctx.setLineDash([8, 4]);
 }
 else if (connection.style === 'dotted') {
 ctx.setLineDash([2, 4]);
 }
 else {
 ctx.setLineDash([]);
 }
 ctx.globalAlpha = isTraversed ? 1 : 0.4;
 ctx.stroke();
 ctx.globalAlpha = 1;
 ctx.setLineDash([]);
};
const drawConnectionDecorations = (ctx: CanvasRenderingContext2D, connection: MapConnection, index: number) => {
 const midPoint = connection.pathPoints[Math.floor(connection.pathPoints.length / 2)];
 if (!midPoint)
 return;
 ctx.fillStyle = connection.color;
 ctx.fillRect(midPoint.x - 3, midPoint.y - 3, 6, 6);
 ctx.strokeStyle = '#ffffff';
 ctx.lineWidth = 1;
 ctx.strokeRect(midPoint.x - 3, midPoint.y - 3, 6, 6);
};
const drawNodes = (ctx: CanvasRenderingContext2D, map: DreamMap) => {
 map.nodes.forEach((node, index) => {
 drawNodeShadow(ctx, node);
 drawNodeFrame(ctx, node, index);
 drawNodeThumbnail(ctx, node);
 drawNodeBorder(ctx, node);
 drawNodeLabel(ctx, node, index);
 if (node.isCurrent) {
 drawNodeGlow(ctx, node);
 }
 if (hoveredNode.value?.id === node.id) {
 drawNodeHover(ctx, node);
 }
 });
};
const drawNodeShadow = (ctx: CanvasRenderingContext2D, node: MapNode) => {
 ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
 ctx.fillRect(node.x + 4, node.y + 4, node.width, node.height);
};
const drawNodeFrame = (ctx: CanvasRenderingContext2D, node: MapNode, index: number) => {
 const frameColor = node.isCurrent
 ? '#e94560'
 : node.isVisited
 ? '#533483'
 : '#2a2a3a';
 ctx.fillStyle = frameColor;
 ctx.fillRect(node.x, node.y, node.width, node.height);
 ctx.fillStyle = '#12121a';
 ctx.fillRect(node.x + 2, node.y + 2, node.width - 4, node.height - 4);
};
const drawNodeThumbnail = (ctx: CanvasRenderingContext2D, node: MapNode) => {
 const { thumbnail } = node;
 if (!thumbnail)
 return;
 const thumbX = node.x + 4;
 const thumbY = node.y + 4;
 const thumbWidth = node.width - 8;
 const thumbHeight = node.height - 8;
 const pixelW = thumbWidth / thumbnail.width;
 const pixelH = thumbHeight / thumbnail.height;
 for (let y = 0; y < thumbnail.height; y++) {
 for (let x = 0; x < thumbnail.width; x++) {
 ctx.fillStyle = thumbnail.pixels[y][x];
 ctx.fillRect(thumbX + x * pixelW, thumbY + y * pixelH, Math.ceil(pixelW), Math.ceil(pixelH));
 }
 }
};
const drawNodeBorder = (ctx: CanvasRenderingContext2D, node: MapNode) => {
 const borderColor = node.isCurrent
 ? '#e94560'
 : node.isVisited
 ? '#533483'
 : '#3a3a4a';
 ctx.strokeStyle = borderColor;
 ctx.lineWidth = 2;
 ctx.strokeRect(node.x, node.y, node.width, node.height);
 ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
 ctx.lineWidth = 1;
 ctx.strokeRect(node.x + 1, node.y + 1, node.width - 2, node.height - 2);
};
const drawNodeLabel = (ctx: CanvasRenderingContext2D, node: MapNode, index: number) => {
 const labelY = node.y + node.height + 16;
 ctx.fillStyle = '#12121a';
 ctx.fillRect(node.x - 2, labelY - 2, node.width + 4, 24);
 ctx.strokeStyle = node.isCurrent ? '#e94560' : '#2a2a3a';
 ctx.lineWidth = 2;
 ctx.strokeRect(node.x - 2, labelY - 2, node.width + 4, 24);
 ctx.fillStyle = '#e94560';
 ctx.font = 'bold 10px "Press Start 2P", monospace';
 ctx.textAlign = 'left';
 ctx.fillText(`${node.actNumber}.`, node.x + 4, labelY + 14);
 ctx.fillStyle = '#ffffff';
 ctx.font = '10px "Noto Sans SC", sans-serif';
 const title = node.title.length > 8
 ? node.title.substring(0, 8) + '...'
 : node.title;
 ctx.fillText(title, node.x + 28, labelY + 14);
};
const drawNodeGlow = (ctx: CanvasRenderingContext2D, node: MapNode) => {
 const time = Date.now() / 500;
 const glowSize = 4 + Math.sin(time) * 2;
 ctx.shadowColor = '#e94560';
 ctx.shadowBlur = 20;
 ctx.strokeStyle = '#e94560';
 ctx.lineWidth = 3;
 ctx.strokeRect(node.x - glowSize, node.y - glowSize, node.width + glowSize * 2, node.height + glowSize * 2);
 ctx.shadowBlur = 0;
};
const drawNodeHover = (ctx: CanvasRenderingContext2D, node: MapNode) => {
 ctx.strokeStyle = '#ffffff';
 ctx.lineWidth = 2;
 ctx.setLineDash([4, 4]);
 ctx.strokeRect(node.x - 4, node.y - 4, node.width + 8, node.height + 8);
 ctx.setLineDash([]);
};
const drawPlaybackIndicator = (ctx: CanvasRenderingContext2D, map: DreamMap) => {
 const currentIndex = props.currentNodeIndex || 0;
 const progress = props.playbackProgress || 0;
 if (currentIndex >= map.nodes.length)
 return;
 const currentNode = map.nodes[currentIndex];
 if (!currentNode)
 return;
 if (progress > 0 && currentIndex < map.nodes.length - 1) {
 const nextNode = map.nodes[currentIndex + 1];
 const connection = map.connections.find(c => c.fromNodeId === currentNode.id && c.toNodeId === nextNode.id);
 if (connection && connection.pathPoints.length > 1) {
 const totalPoints = connection.pathPoints.length;
 const currentPointIndex = Math.floor(progress * (totalPoints - 1));
 const pointProgress = (progress * (totalPoints - 1)) % 1;
 if (currentPointIndex < connection.pathPoints.length - 1) {
 const fromPoint = connection.pathPoints[currentPointIndex];
 const toPoint = connection.pathPoints[currentPointIndex + 1];
 const indicatorX = fromPoint.x + (toPoint.x - fromPoint.x) * pointProgress;
 const indicatorY = fromPoint.y + (toPoint.y - fromPoint.y) * pointProgress;
 drawMovingIndicator(ctx, indicatorX, indicatorY);
 }
 }
 }
};
const drawMovingIndicator = (ctx: CanvasRenderingContext2D, x: number, y: number) => {
 const time = Date.now() / 200;
 const size = 8 + Math.sin(time) * 2;
 ctx.fillStyle = '#e94560';
 ctx.shadowColor = '#e94560';
 ctx.shadowBlur = 15;
 ctx.fillRect(x - size / 2, y - size / 2, size, size);
 ctx.fillStyle = '#ffffff';
 ctx.fillRect(x - 2, y - 2, 4, 4);
 ctx.shadowBlur = 0;
};
const handleMouseDown = (e: MouseEvent) => {
 const canvas = canvasRef.value;
 if (!canvas)
 return;
 const rect = canvas.getBoundingClientRect();
 const x = (e.clientX - rect.left) / scale.value - offsetX.value / scale.value;
 const y = (e.clientY - rect.top) / scale.value - offsetY.value / scale.value;
 const node = props.dreamMap ? getNodeAtPosition(x, y) : null;
 if (node) {
 emit('nodeClick', node);
 }
 else {
 isDragging.value = true;
 lastMousePos.value = { x: e.clientX, y: e.clientY };
 }
};
const handleMouseMove = (e: MouseEvent) => {
 const canvas = canvasRef.value;
 if (!canvas)
 return;
 if (isDragging.value) {
 const dx = e.clientX - lastMousePos.value.x;
 const dy = e.clientY - lastMousePos.value.y;
 offsetX.value += dx;
 offsetY.value += dy;
 lastMousePos.value = { x: e.clientX, y: e.clientY };
 drawMap();
 return;
 }
 const rect = canvas.getBoundingClientRect();
 const x = (e.clientX - rect.left) / scale.value - offsetX.value / scale.value;
 const y = (e.clientY - rect.top) / scale.value - offsetY.value / scale.value;
 const node = props.dreamMap ? getNodeAtPosition(x, y) : null;
 if (node !== hoveredNode.value) {
 hoveredNode.value = node;
 emit('nodeHover', node);
 drawMap();
 }
};
const handleMouseUp = () => {
 isDragging.value = false;
};
const handleMouseLeave = () => {
 isDragging.value = false;
 if (hoveredNode.value) {
 hoveredNode.value = null;
 emit('nodeHover', null);
 drawMap();
 }
};
const handleWheel = (e: WheelEvent) => {
 if (e.ctrlKey || e.metaKey) {
 e.preventDefault();
 const delta = e.deltaY > 0 ? -0.1 : 0.1;
 scale.value = Math.max(0.5, Math.min(3, scale.value + delta));
 drawMap();
 }
};
const getNodeAtPosition = (x: number, y: number): MapNode | null => {
 const map = props.dreamMap;
 if (!map)
 return null;
 for (const node of map.nodes) {
 if (x >= node.x && x <= node.x + node.width &&
 y >= node.y && y <= node.y + node.height) {
 return node;
 }
 }
 return null;
};
const zoomIn = () => {
 scale.value = Math.min(3, scale.value + 0.2);
 drawMap();
};
const zoomOut = () => {
 scale.value = Math.max(0.5, scale.value - 0.2);
 drawMap();
};
const resetView = () => {
 scale.value = 1;
 offsetX.value = 0;
 offsetY.value = 0;
 drawMap();
};
const fitToContainer = () => {
 if (!containerRef.value || !props.dreamMap)
 return;
 const containerWidth = containerRef.value.clientWidth - 32;
 const containerHeight = containerRef.value.clientHeight - 80;
 const { width, height } = props.dreamMap;
 const scaleX = containerWidth / width;
 const scaleY = containerHeight / height;
 scale.value = Math.min(scaleX, scaleY, 2);
 offsetX.value = 0;
 offsetY.value = 0;
 drawMap();
};
let animationFrameId: number | null = null;
const startAnimationLoop = () => {
 const animate = () => {
 drawMap();
 animationFrameId = requestAnimationFrame(animate);
 };
 animate();
};
const stopAnimationLoop = () => {
 if (animationFrameId) {
 cancelAnimationFrame(animationFrameId);
 animationFrameId = null;
 }
};
watch(() => props.dreamMap, () => {
 drawMap();
 fitToContainer();
}, { deep: true });
watch([scale, offsetX, offsetY], () => {
 drawMap();
});
watch([() => props.playbackProgress, () => props.currentNodeIndex], () => {
 drawMap();
});
let resizeObserver: ResizeObserver | null = null;
onMounted(() => {
 if (containerRef.value) {
 resizeObserver = new ResizeObserver(fitToContainer);
 resizeObserver.observe(containerRef.value);
 }
 startAnimationLoop();
 setTimeout(fitToContainer, 100);
});
onUnmounted(() => {
 if (resizeObserver) {
 resizeObserver.disconnect();
 }
 stopAnimationLoop();
});
</script>

<template>
  <div ref="containerRef" class="relative w-full h-full flex flex-col bg-dream-dark pixel-border overflow-hidden">
    <div class="flex items-center justify-between px-4 py-2 bg-dream-bg border-b-2 border-dream-border">
      <div class="flex items-center gap-2">
        <MapPin class="w-4 h-4 text-dream-primary" />
        <span class="font-pixel text-xs text-dream-primary">梦境地图</span>
        <span class="text-dream-accent text-xs">
          {{ dreamMap.nodes.length }} 个场景节点
        </span>
      </div>
      
      <div class="flex items-center gap-2">
        <button
          v-if="isPlaybackMode !== undefined"
          class="pixel-btn w-8 h-8 flex items-center justify-center p-0"
          @click="emit('togglePlayback')"
        >
          <Play v-if="!isPlaybackMode" class="w-4 h-4" />
          <Pause v-else class="w-4 h-4" />
        </button>
        
        <button
          v-if="isPlaybackMode !== undefined"
          class="pixel-btn w-8 h-8 flex items-center justify-center p-0"
          @click="emit('prevNode')"
        >
          <SkipBack class="w-4 h-4" />
        </button>
        
        <button
          v-if="isPlaybackMode !== undefined"
          class="pixel-btn w-8 h-8 flex items-center justify-center p-0"
          @click="emit('nextNode')"
        >
          <SkipForward class="w-4 h-4" />
        </button>
        
        <div class="w-px h-6 bg-dream-border mx-1" />
        
        <button
          class="pixel-btn w-8 h-8 flex items-center justify-center p-0"
          @click="zoomOut"
        >
          <ZoomOut class="w-4 h-4" />
        </button>
        
        <button
          class="pixel-btn w-8 h-8 flex items-center justify-center p-0"
          @click="zoomIn"
        >
          <ZoomIn class="w-4 h-4" />
        </button>
        
        <button
          class="pixel-btn w-8 h-8 flex items-center justify-center p-0"
          @click="resetView"
        >
          <Maximize2 class="w-4 h-4" />
        </button>
        
        <div class="w-px h-6 bg-dream-border mx-1" />
        
        <button
          class="pixel-btn-primary flex items-center gap-1 text-xs py-1 px-2"
          @click="emit('export')"
        >
          <Download class="w-3 h-3" />
          导出长图
        </button>
      </div>
    </div>
    
    <div class="flex-1 relative overflow-hidden">
      <div v-if="isEmpty" class="absolute inset-0 flex items-center justify-center">
        <div class="text-center text-dream-accent">
          <div class="text-6xl mb-4">🗺️</div>
          <p class="font-pixel text-sm">等待梦境地图生成...</p>
          <p class="text-xs mt-2">先生成梦境剧场，然后查看地图</p>
        </div>
      </div>
      
      <canvas
        v-else
        ref="canvasRef"
        class="cursor-move select-none block"
        :style="{ imageRendering: 'pixelated' }"
        @mousedown="handleMouseDown"
        @mousemove="handleMouseMove"
        @mouseup="handleMouseUp"
        @mouseleave="handleMouseLeave"
        @wheel.passive="handleWheel"
      />
      
      <div v-if="!isEmpty" class="absolute bottom-2 right-2 flex items-center gap-2">
        <div class="text-xs text-dream-accent bg-dream-dark/80 px-2 py-1 pixel-border">
          缩放: {{ Math.round(scale * 100) }}%
        </div>
      </div>
      
      <div
        v-if="hoveredNode"
        class="absolute top-2 left-2 bg-dream-dark/95 pixel-border p-3 max-w-xs z-10"
      >
        <div class="flex items-center gap-2 mb-2">
          <span class="font-pixel text-xs text-dream-primary">
            第 {{ hoveredNode.actNumber }} 幕
          </span>
          <span
            class="text-xs px-2 py-0.5"
            :class="hoveredNode.isVisited ? 'bg-dream-success/20 text-dream-success' : 'bg-dream-accent/20 text-dream-accent'"
          >
            {{ hoveredNode.isVisited ? '已探索' : '未探索' }}
          </span>
        </div>
        <h4 class="font-pixel text-dream-secondary text-sm mb-1">
          {{ hoveredNode.title }}
        </h4>
        <p class="text-xs text-dream-accent mb-2">
          {{ hoveredNode.description }}
        </p>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="entity in hoveredNode.entities.slice(0, 4)"
            :key="entity.id"
            class="text-xs px-2 py-0.5 bg-dream-secondary/20 text-dream-secondary"
          >
            {{ entity.name }}
          </span>
          <span
            v-if="hoveredNode.entities.length > 4"
            class="text-xs px-2 py-0.5 bg-dream-accent/20 text-dream-accent"
          >
            +{{ hoveredNode.entities.length - 4 }}
          </span>
        </div>
      </div>
    </div>
    
    <div v-if="isPlaybackMode" class="px-4 py-2 bg-dream-bg border-t-2 border-dream-border">
      <div class="flex items-center gap-3">
        <span class="text-xs text-dream-accent">
          {{ (currentNodeIndex || 0) + 1 }} / {{ dreamMap.nodes.length }}
        </span>
        <div class="flex-1 h-2 bg-dream-border rounded overflow-hidden">
          <div
            class="h-full bg-dream-primary transition-all duration-300"
            :style="{ width: `${((currentNodeIndex || 0) + (playbackProgress || 0)) / dreamMap.nodes.length * 100}%` }"
          />
        </div>
        <span class="text-xs text-dream-accent">
          {{ Math.round(((currentNodeIndex || 0) + (playbackProgress || 0)) / dreamMap.nodes.length * 100) }}%
        </span>
      </div>
    </div>
  </div>
</template>
