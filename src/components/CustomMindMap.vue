<template>
  <div 
    class="w-full h-full bg-slate-50 overflow-hidden relative touch-none"
    @touchstart="handleTouchStart"
    @touchmove="handleTouchMove"
    @touchend="handleTouchEnd"
    @mousedown="handleMouseDown"
    @mousemove="handleMouseMove"
    @mouseup="handleMouseUp"
    @wheel="handleWheel"
  >
    <svg 
      class="w-full h-full cursor-grab active:cursor-grabbing"
      xmlns="http://www.w3.org/2000/svg"
      :style="{ backgroundColor: theme?.background }"
    >
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" :stroke="currentTheme === 'dark' ? '#1e293b' : '#e2e8f0'" stroke-width="0.5"/>
        </pattern>
        <filter id="handDrawnFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#grid)" />

      <g :transform="`translate(${view.x}, ${view.y}) scale(${view.scale})`" :filter="isHandDrawn ? 'url(#handDrawnFilter)' : ''">
        <!-- 连线层 -->
        <g class="lines">
          <path 
            v-for="line in connections" 
            :key="line.id" 
            :d="line.d" 
            :stroke="line.color" 
            :stroke-width="line.width"
            fill="none"
            class="transition-all duration-300"
          />
        </g>

        <!-- 节点层 -->
        <g 
          v-for="node in flattenedNodes" 
          :key="node.id"
          :transform="`translate(${node.x}, ${node.y})`"
          class="cursor-pointer"
          @click.stop="handleNodeClick(node)"
          @dblclick.stop="startEditing(node)"
        >
          <rect 
            :x="-node.width / 2" 
            :y="-node.height / 2" 
            :width="node.width" 
            :height="node.height" 
            :rx="skeletonStyle === 'straight' ? '4' : '12'"
            :style="{ 
              fill: activeNodeId === node.id ? theme?.nodeActive : theme?.nodeDefault,
              stroke: activeNodeId === node.id ? theme?.nodeActive : node.color,
              strokeWidth: node.depth === 0 ? '4px' : '2.5px'
            }"
            class="transition-all duration-300 shadow-md"
          />

          <!-- 节点内容：正方形宫格图片列表 -->
          <g v-if="getImages(node).length > 0">
            <image
              v-for="(img, idx) in getImages(node)"
              :key="img.id"
              :href="img.url"
              :x="getImagePos(node, idx).x"
              :y="getImagePos(node, idx).y"
              :width="80"
              :height="80"
              preserveAspectRatio="xMidYMid slice"
              style="clip-path: inset(0% round 8px);"
            />
          </g>
          
          <!-- 节点文字 -->
          <text 
            v-if="editingNodeId !== node.id"
            text-anchor="middle" 
            :y="node.height / 2 - 15"
            dominant-baseline="middle" 
            :style="{ 
              fill: activeNodeId === node.id ? theme?.nodeActiveText : (node.depth === 0 ? theme?.nodeText : '#475569'),
              fontFamily: isHandDrawn ? 'cursive, sans-serif' : 'inherit',
              fontSize: node.depth === 0 ? '16px' : '14px'
            }"
            class="select-none font-bold transition-colors duration-300"
          >
            {{ node.text }}
          </text>

          <!-- 编辑输入框 -->
          <foreignObject 
            v-else
            :x="-node.width / 2" 
            :y="node.height / 2 - 30" 
            :width="node.width" 
            :height="30"
          >
            <div class="w-full h-full flex items-center justify-center p-1">
              <input 
                v-model="editingText"
                @blur="saveEditing"
                @keyup.enter="saveEditing"
                v-focus
                class="w-full bg-transparent text-center border-none outline-none font-bold text-sm"
                :style="{ color: activeNodeId === node.id ? theme?.nodeActiveText : theme?.nodeText }"
              />
            </div>
          </foreignObject>

          <!-- 附件角标 (非图片附件) -->
          <g v-if="getFileCount(node) > 0" :transform="`translate(${node.width/2 - 10}, ${-node.height/2 + 10})`">
            <circle r="8" fill="#64748b" />
            <text text-anchor="middle" dominant-baseline="middle" font-size="10" fill="white" font-weight="bold">
              {{ getFileCount(node) }}
            </text>
          </g>
          
          <circle v-if="node.isLoading" r="12" cx="0" :cy="node.height/2 + 20" class="fill-blue-500 animate-pulse" />
        </g>
      </g>
    </svg>

    <!-- 设置面板 (省略部分以节省空间，逻辑保持不变) -->
    <div class="absolute top-6 right-6 flex flex-col items-end gap-2 z-50">
      <button 
        @click="isSettingsOpen = !isSettingsOpen"
        class="bg-white/95 backdrop-blur-md p-3 rounded-2xl shadow-lg border border-slate-200 text-slate-600 hover:text-indigo-600 transition-all"
      >
        <Palette :size="20" v-if="!isSettingsOpen" />
        <span v-else class="text-xs font-bold px-1">关闭设置</span>
      </button>

      <div v-if="isSettingsOpen" class="bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-2xl border border-slate-200 flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">
        <div class="flex items-center gap-3 p-1">
          <Palette :size="18" class="text-slate-400" />
          <div class="flex gap-1.5">
            <button 
              v-for="(_, key) in themes" :key="key"
              @click="currentTheme = key"
              :class="['w-7 h-7 rounded-full border-2 transition-all shadow-sm', currentTheme === key ? 'border-indigo-500 scale-110' : 'border-transparent hover:scale-105']"
              :style="{ backgroundColor: themes[key].nodeActive }"
            />
          </div>
        </div>
        <div class="h-px bg-slate-100 mx-1" />
        <div class="flex items-center gap-3 p-1">
          <Box :size="18" class="text-slate-400" />
          <div class="flex bg-slate-100/50 rounded-xl p-1 gap-1">
            <button 
              v-for="s in (['rounded', 'straight', 'wavy'] as SkeletonStyle[])" :key="s"
              @click="skeletonStyle = s"
              :class="['px-3 py-1.5 text-xs font-bold rounded-lg transition-all', skeletonStyle === s ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-700']"
            >
              {{ s === 'rounded' ? '圆角' : s === 'straight' ? '直角' : '波浪' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 (省略部分，逻辑保持不变) -->
    <div v-if="activeNode" class="absolute bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full px-4 max-w-2xl z-50">
      <div v-if="activeNode.attachments && activeNode.attachments.length > 0" class="flex gap-2 overflow-x-auto p-2 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 w-full">
        <div v-for="file in activeNode.attachments" :key="file.id" class="relative group flex-shrink-0">
          <img v-if="file.type === 'image'" :src="file.url" class="w-16 h-16 object-cover rounded-xl border border-slate-100" />
          <div v-else class="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200"><Paperclip :size="24" /></div>
          <button @click.stop="removeAttachment(activeNode.id, file.id)" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X :size="12" /></button>
        </div>
      </div>
      <div class="flex items-center gap-3 bg-slate-900/90 backdrop-blur-xl px-4 py-2.5 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 w-max">
        <div class="text-sm font-bold text-white truncate max-w-[100px] border-r border-white/20 pr-3 mr-1">{{ activeNode.text }}</div>
        <div class="flex items-center gap-2">
          <button @click="startEditing(activeNode)" class="bg-white/10 text-white/70 p-2.5 rounded-2xl hover:bg-white/20 transition-all"><Edit3 :size="18" /></button>
          <button @click="triggerFileUpload" class="bg-white/10 text-white/70 p-2.5 rounded-2xl hover:bg-white/20 transition-all"><Plus :size="18" /></button>
          <input type="file" ref="fileInputRef" class="hidden" @change="handleFileUpload" accept="image/*,.pdf,.doc,.docx,.txt" />
          <div class="w-px h-6 bg-white/10 mx-1" />
          <button @click="expandWithAI" :disabled="activeNode.isLoading" class="bg-indigo-500 hover:bg-indigo-400 text-white p-2.5 sm:px-4 sm:py-2 rounded-2xl hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2">
            <Wand2 v-if="!activeNode.isLoading" :size="18" />
            <Loader2 v-else class="animate-spin" :size="18" />
            <span class="text-xs font-bold pr-1 hidden sm:inline">AI 分解</span>
          </button>
          <button @click="deleteActiveNode" class="bg-white/10 text-white/70 p-2.5 rounded-2xl hover:bg-red-500 hover:text-white transition-all"><Trash2 :size="18" /></button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Wand2, Loader2, Trash2, Palette, Box, Paperclip, Plus, X, Edit3 } from 'lucide-vue-next';
import { fetchAIExpansion } from '../services/ai';

interface Attachment { id: string; name: string; url: string; type: 'image' | 'file'; }
interface MindNode { id: string; text: string; children: MindNode[]; x: number; y: number; width: number; height: number; isLoading?: boolean; color?: string; depth?: number; attachments?: Attachment[]; }

const props = defineProps<{ data: any }>();
const emit = defineEmits(['update:data']);
const vFocus = { mounted: (el: HTMLInputElement) => { el.focus(); el.select(); } };

type ThemeKey = 'business' | 'macaron' | 'dark';
type SkeletonStyle = 'rounded' | 'straight' | 'wavy';
interface Theme { name: string; background: string; nodeDefault: string; nodeText: string; nodeActive: string; nodeActiveText: string; lines: string[]; }

const themes: Record<ThemeKey, Theme> = {
  business: { name: '商务精英', background: '#f8fafc', nodeDefault: '#ffffff', nodeText: '#1e293b', nodeActive: '#2563eb', nodeActiveText: '#ffffff', lines: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'] },
  macaron: { name: '清甜马卡龙', background: '#fff7ed', nodeDefault: '#ffffff', nodeText: '#7c2d12', nodeActive: '#fb923c', nodeActiveText: '#ffffff', lines: ['#fca5a5', '#fcd34d', '#93c5fd', '#c084fc', '#86efac', '#fdba74'] },
  dark: { name: '深邃暗黑', background: '#0f172a', nodeDefault: '#1e293b', nodeText: '#f1f5f9', nodeActive: '#38bdf8', nodeActiveText: '#0f172a', lines: ['#38bdf8', '#818cf8', '#c084fc', '#4ade80', '#fb7185', '#fbbf24'] }
};

const currentTheme = ref<ThemeKey>('business');
const skeletonStyle = ref<SkeletonStyle>('rounded');
const isHandDrawn = ref(false);
const isSettingsOpen = ref(false);
const activeNodeId = ref<string | null>(null);
const editingNodeId = ref<string | null>(null);
const editingText = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);
const view = ref({ x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 });

const theme = computed(() => themes[currentTheme.value]);
const getImages = (node: MindNode) => node.attachments?.filter(a => a.type === 'image') || [];
const getFileCount = (node: MindNode) => node.attachments?.filter(a => a.type === 'file').length || 0;

// --- 宫格布局配置 ---
const IMG_SIZE = 80;
const IMG_GAP = 4;
const NODE_PADDING = 16;

const getGridInfo = (count: number) => {
  if (count === 0) return { cols: 0, rows: 0 };
  const cols = Math.ceil(Math.sqrt(count));
  const rows = Math.ceil(count / cols);
  return { cols, rows };
};

const getImagePos = (node: MindNode, idx: number) => {
  const images = getImages(node);
  const { cols } = getGridInfo(images.length);
  const col = idx % cols;
  const row = Math.floor(idx / cols);
  
  // 居中计算
  const gridW = cols * IMG_SIZE + (cols - 1) * IMG_GAP;
  const startX = -gridW / 2;
  const startY = -node.height / 2 + NODE_PADDING / 2;

  return {
    x: startX + col * (IMG_SIZE + IMG_GAP),
    y: startY + row * (IMG_SIZE + IMG_GAP)
  };
};

const calculateNodeSize = (nodeData: any) => {
  const images = getImages(nodeData);
  const { cols, rows } = getGridInfo(images.length);
  const textWidth = nodeData.text.length * 12 + 60;
  
  const gridWidth = cols > 0 ? cols * IMG_SIZE + (cols - 1) * IMG_GAP + NODE_PADDING : 0;
  const gridHeight = rows > 0 ? rows * IMG_SIZE + (rows - 1) * IMG_GAP + NODE_PADDING : 0;

  return {
    width: Math.max(textWidth, gridWidth),
    height: Math.max(40, gridHeight + 35) // 35 为底部文字预留空间
  };
};

const flattenedNodes = ref<MindNode[]>([]);
const connections = ref<any[]>([]);
const VERTICAL_GAP = 30;
const HORIZONTAL_GAP = 220;

const calculateSubtreeHeight = (node: any): number => {
  const { height } = calculateNodeSize(node);
  if (!node.children || node.children.length === 0) return height;
  const childrenHeight = node.children.reduce((acc: number, child: any) => acc + calculateSubtreeHeight(child), 0);
  return Math.max(height, childrenHeight + (node.children.length - 1) * VERTICAL_GAP);
};

const updateLayout = () => {
  const nodes: MindNode[] = [];
  const lines: any[] = [];
  const activeTheme = theme.value;
  
  const generatePath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const midX = x1 + dx * 0.5;
    if (skeletonStyle.value === 'straight') return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
    if (skeletonStyle.value === 'wavy') return `M ${x1} ${y1} C ${x1 + dx*0.4} ${y1}, ${x1 + dx*0.6} ${y2}, ${x2} ${y2}`;
    return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
  };

  const layoutNode = (nodeData: any, x: number, y: number, depth: number, branchIndex: number, direction: 'left' | 'right' | 'center') => {
    const { width, height } = calculateNodeSize(nodeData);
    const color = depth === 0 ? activeTheme.nodeText : activeTheme.lines[branchIndex % activeTheme.lines.length];
    const node: MindNode = { ...nodeData, x, y, width, height, depth, color };
    nodes.push(node);

    if (nodeData.children?.length > 0) {
      let leftC: any[] = [], rightC: any[] = [];
      if (depth === 0) {
        nodeData.children.forEach((c: any, i: number) => { if (i % 2 === 0) rightC.push(c); else leftC.push(c); });
      } else {
        if (direction === 'left') leftC = nodeData.children; else rightC = nodeData.children;
      }

      [ { list: rightC, dir: 'right', sign: 1 }, { list: leftC, dir: 'left', sign: -1 } ].forEach(({ list, dir, sign }) => {
        if (list.length === 0) return;
        const totalH = list.reduce((acc: number, c: any) => acc + calculateSubtreeHeight(c), 0) + (list.length - 1) * VERTICAL_GAP;
        let currentY = y - totalH / 2;
        list.forEach((child: any) => {
          const subH = calculateSubtreeHeight(child);
          const childSize = calculateNodeSize(child);
          const childY = currentY + subH / 2;
          const childX = x + sign * HORIZONTAL_GAP;
          const bIdx = depth === 0 ? nodeData.children.indexOf(child) : branchIndex;
          const childColor = depth === 0 ? activeTheme.lines[bIdx % activeTheme.lines.length] : color;
          layoutNode(child, childX, childY, depth + 1, bIdx, dir as any);
          const startX = x + sign * (depth === 0 ? 0 : width / 2);
          const endX = childX - sign * childSize.width / 2;
          lines.push({ id: `${nodeData.id}-${child.id}`, d: generatePath(startX, y, endX, childY), color: childColor, width: Math.max(2, 6 - depth * 1.5) });
          currentY += subH + VERTICAL_GAP;
        });
      });
    }
  };

  layoutNode(props.data, 0, 0, 0, 0, 'center');
  flattenedNodes.value = nodes;
  connections.value = lines;
};

const handleNodeClick = (n: MindNode) => activeNodeId.value = n.id;
const activeNode = computed(() => flattenedNodes.value.find(n => n.id === activeNodeId.value));
const startEditing = (n: MindNode) => { editingNodeId.value = n.id; editingText.value = n.text; };
const saveEditing = () => {
  if (!editingNodeId.value) return;
  const newData = JSON.parse(JSON.stringify(props.data));
  const update = (root: any) => { if (root.id === editingNodeId.value) { root.text = editingText.value; return true; } return root.children?.some(update); };
  update(newData);
  emit('update:data', newData);
  editingNodeId.value = null;
};

const triggerFileUpload = () => fileInputRef.value?.click();
const handleFileUpload = (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file || !activeNodeId.value) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    const attachment: Attachment = { id: Math.random().toString(36).substr(2, 9), name: file.name, url: ev.target?.result as string, type: file.type.startsWith('image/') ? 'image' : 'file' };
    const newData = JSON.parse(JSON.stringify(props.data));
    const add = (root: any) => { if (root.id === activeNodeId.value) { (root.attachments ??= []).push(attachment); return true; } return root.children?.some(add); };
    add(newData);
    emit('update:data', newData);
  };
  reader.readAsDataURL(file);
};

const removeAttachment = (nodeId: string, attId: string) => {
  const newData = JSON.parse(JSON.stringify(props.data));
  const rm = (root: any) => { if (root.id === nodeId) { root.attachments = root.attachments?.filter((a: any) => a.id !== attId); return true; } return root.children?.some(rm); };
  rm(newData);
  emit('update:data', newData);
};

const expandWithAI = async () => {
  if (!activeNode.value) return;
  const findPath = (root: any, targetId: string, path: string[]): string[] | null => {
    const currentPath = [...path, root.text];
    if (root.id === targetId) return currentPath;
    for (const child of root.children || []) { const res = findPath(child, targetId, currentPath); if (res) return res; }
    return null;
  };
  const path = findPath(props.data, activeNode.value.id, []);
  if (!path) return;
  activeNode.value.isLoading = true;
  try {
    const subItems = await fetchAIExpansion(path);
    const newData = JSON.parse(JSON.stringify(props.data));
    const append = (root: any) => { if (root.id === activeNodeId.value) { (root.children ??= []).push(...subItems.map(text => ({ id: Math.random().toString(36).substr(2, 9), text, children: [] }))); return true; } return root.children?.some(append); };
    append(newData);
    emit('update:data', newData);
  } catch (err) { alert('AI 分解失败'); }
  finally { activeNode.value.isLoading = false; }
};

const deleteActiveNode = () => {
  if (activeNodeId.value === props.data.id) return alert('根节点不可删除');
  const newData = JSON.parse(JSON.stringify(props.data));
  const rm = (root: any) => {
    const idx = root.children?.findIndex((c: any) => c.id === activeNodeId.value);
    if (idx !== undefined && idx !== -1) { root.children.splice(idx, 1); return true; }
    return root.children?.some(rm);
  };
  rm(newData);
  activeNodeId.value = null;
  emit('update:data', newData);
};

const isDragging = ref(false);
const lastPos = ref({ x: 0, y: 0 });
const initialPinchDistance = ref<number | null>(null);
const initialScale = ref(1);

const getDistance = (t1: Touch, t2: Touch) => {
  return Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2));
};

const handleMouseDown = (e: MouseEvent) => { isDragging.value = true; lastPos.value = { x: e.clientX, y: e.clientY }; };
const handleMouseMove = (e: MouseEvent) => { if (!isDragging.value) return; view.value.x += e.clientX - lastPos.value.x; view.value.y += e.clientY - lastPos.value.y; lastPos.value = { x: e.clientX, y: e.clientY }; };
const handleMouseUp = () => isDragging.value = false;
const handleWheel = (e: WheelEvent) => { const scale = view.value.scale * (e.deltaY > 0 ? 0.9 : 1.1); if (scale > 0.1 && scale < 5) view.value.scale = scale; };

const handleTouchStart = (e: TouchEvent) => { 
  if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
    initialPinchDistance.value = getDistance(e.touches[0], e.touches[1]);
    initialScale.value = view.value.scale;
  } else if (e.touches.length === 1 && e.touches[0]) { 
    isDragging.value = true; 
    lastPos.value = { x: e.touches[0].clientX, y: e.touches[0].clientY }; 
  } 
};

const handleTouchMove = (e: TouchEvent) => { 
  if (e.touches.length === 2 && e.touches[0] && e.touches[1] && initialPinchDistance.value !== null) {
    const dist = getDistance(e.touches[0], e.touches[1]);
    const scale = initialScale.value * (dist / initialPinchDistance.value);
    if (scale > 0.1 && scale < 5) view.value.scale = scale;
  } else if (isDragging.value && e.touches.length === 1 && e.touches[0]) { 
    view.value.x += e.touches[0].clientX - lastPos.value.x; 
    view.value.y += e.touches[0].clientY - lastPos.value.y; 
    lastPos.value = { x: e.touches[0].clientX, y: e.touches[0].clientY }; 
  } 
};

const handleTouchEnd = (e: TouchEvent) => { 
  if (e.touches.length < 2) initialPinchDistance.value = null;
  if (e.touches.length === 0) isDragging.value = false; 
};

watch(() => props.data, updateLayout, { deep: true, immediate: true });
watch([currentTheme, skeletonStyle, isHandDrawn], updateLayout);
onMounted(updateLayout);
</script>

<style scoped>
.transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
</style>
