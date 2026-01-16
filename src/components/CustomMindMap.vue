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
      </defs>

      <rect width="100%" height="100%" fill="url(#grid)" />

      <g :transform="`translate(${view.x}, ${view.y}) scale(${view.scale})`">
        <!-- 连线层 -->
        <g class="lines">
          <path 
            v-for="line in connections" 
            :key="line.id" 
            :d="line.d" 
            :fill="line.isTapered ? line.color : 'none'"
            :stroke="line.isTapered ? 'none' : line.color" 
            :stroke-width="line.isTapered ? 0 : line.width"
            stroke-linecap="round"
            class="transition-all duration-300 opacity-90"
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
          <!-- 仅中心节点有背景框 -->
          <rect
            v-if="node.depth === 0"
            :x="-node.width / 2"
            :y="-node.height / 2"
            :width="node.width"
            :height="node.height"
            rx="12"
            :style="{
              fill: activeNodeId === node.id ? theme?.nodeActive : theme?.nodeDefault,
              stroke: activeNodeId === node.id ? theme?.nodeActive : theme?.nodeText,
              strokeWidth: '3px'
            }"
            class="transition-all duration-300 shadow-xl"
          />

          <!-- 其他节点：彩色下划线 -->
          <g v-else>
            <line
              :x1="-node.width / 2"
              :y1="node.height / 2 - 4"
              :x2="node.width / 2"
              :y2="node.height / 2 - 4"
              :stroke="node.color"
              stroke-width="3"
              stroke-linecap="round"
            />
          </g>

          <!-- 宫格图片列表（作为图标） -->
          <g v-if="getImages(node).length > 0">
            <image
              v-for="(img, idx) in getImages(node)"
              :key="img.id"
              :href="img.url"
              :x="getImagePos(node, idx).x"
              :y="getImagePos(node, idx).y"
              :width="48"
              :height="48"
              preserveAspectRatio="xMidYMid slice"
              style="clip-path: inset(0% round 12px);"
            />
          </g>
          
          <!-- 节点文字 -->
          <text
            v-if="editingNodeId !== node.id"
            text-anchor="middle"
            :y="getImages(node).length > 0 ? (node.height / 2 - 10) : 0"
            dominant-baseline="central"
            :style="{
              fill: node.depth === 0 && activeNodeId === node.id ? theme?.nodeActiveText : (node.depth === 0 ? theme?.nodeText : '#1e293b'),
              fontFamily: 'inherit',
              fontSize: node.depth === 0 ? '22px' : '15px',
              fontWeight: node.depth === 0 ? '900' : '700'
            }"
            class="select-none transition-colors duration-300"
          >
            {{ node.text }}
          </text>

          <!-- 编辑输入框 -->
          <foreignObject 
            v-else
            :x="-node.width / 2" 
            :y="getImages(node).length > 0 ? (node.height / 2 - 32) : (node.depth === 0 ? -20 : -15)" 
            :width="node.width" 
            :height="node.depth === 0 ? 40 : 30"
          >
            <div class="w-full h-full flex items-center justify-center p-1">
              <input 
                v-model="editingText"
                @blur="saveEditing"
                @keyup.enter="saveEditing"
                v-focus
                class="w-full bg-transparent text-center border-none outline-none font-bold"
                :class="node.depth === 0 ? 'text-lg' : 'text-sm'"
                :style="{ color: activeNodeId === node.id ? theme?.nodeActiveText : theme?.nodeText }"
              />
            </div>
          </foreignObject>

          <!-- 附件角标 -->
          <g v-if="getFileCount(node) > 0" :transform="`translate(${node.width/2 - 10}, ${-node.height/2 + 10})`">
            <circle r="8" fill="#64748b" />
            <text text-anchor="middle" dominant-baseline="central" font-size="10" fill="white" font-weight="bold">
              {{ getFileCount(node) }}
            </text>
          </g>
          
          <circle v-if="node.isLoading" r="12" cx="0" :cy="node.height/2 + 20" class="fill-blue-500 animate-pulse" />
        </g>
      </g>
    </svg>

    <!-- 设置面板 -->
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
          <LayoutGrid :size="18" class="text-slate-400" />
          <div class="flex bg-slate-100/50 rounded-xl p-1 gap-1">
            <button
              v-for="l in (['balanced', 'logical', 'radial'] as LayoutMode[])" :key="l"
              @click="layoutMode = l"
              :class="['px-3 py-1.5 text-xs font-bold rounded-lg transition-all', layoutMode === l ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-700']"
            >
              {{ l === 'balanced' ? '思维导图' : l === 'logical' ? '逻辑图' : '放射图' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 底部操作栏 -->
    <div v-if="activeNode" class="fixed bottom-8 sm:bottom-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 w-full px-4 max-w-2xl z-50 pb-[env(safe-area-inset-bottom)]">
      <div v-if="activeNode.attachments && activeNode.attachments.length > 0" class="flex gap-2 overflow-x-auto p-2 bg-white/80 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 w-full">
        <div v-for="file in activeNode.attachments" :key="file.id" class="relative group flex-shrink-0">
          <img v-if="file.type === 'image'" :src="file.url" class="w-16 h-16 object-cover rounded-xl border border-slate-100" />
          <div v-else class="w-16 h-16 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400 border border-slate-200"><Paperclip :size="24" /></div>
          <button @click.stop="removeAttachment(activeNode.id, file.id)" class="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"><X :size="12" /></button>
        </div>
      </div>
      <div class="flex items-center gap-2 sm:gap-3 bg-slate-900/90 backdrop-blur-xl px-3 sm:px-4 py-2 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-white/10 w-max max-w-[calc(100vw-2rem)]">
        <div class="text-xs sm:text-sm font-bold text-white truncate max-w-[60px] sm:max-w-[120px] border-r border-white/20 pr-2 sm:pr-3 mr-1">{{ activeNode.text }}</div>
        <div class="flex items-center gap-1 sm:gap-2">
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
import { Wand2, Loader2, Trash2, Palette, LayoutGrid, Paperclip, Plus, X, Edit3 } from 'lucide-vue-next';
import { fetchAIExpansion } from '../services/ai';
import { uploadFile } from '../services/storage';

interface Attachment { id: string; name: string; url: string; type: 'image' | 'file'; }
interface MindNode { id: string; text: string; children: MindNode[]; x: number; y: number; width: number; height: number; isLoading?: boolean; color?: string; depth?: number; attachments?: Attachment[]; }

const props = defineProps<{ data: any }>();
const emit = defineEmits(['update:data']);
const vFocus = { mounted: (el: HTMLInputElement) => { el.focus(); el.select(); } };

type ThemeKey = 'business' | 'macaron' | 'dark';
type LayoutMode = 'balanced' | 'logical' | 'radial';
interface Theme { name: string; background: string; nodeDefault: string; nodeText: string; nodeActive: string; nodeActiveText: string; lines: string[]; }

const themes: Record<ThemeKey, Theme> = {
  business: { name: '商务精英', background: '#f8fafc', nodeDefault: '#ffffff', nodeText: '#1e293b', nodeActive: '#2563eb', nodeActiveText: '#ffffff', lines: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'] },
  macaron: { name: '清甜马卡龙', background: '#fff7ed', nodeDefault: '#ffffff', nodeText: '#7c2d12', nodeActive: '#fb923c', nodeActiveText: '#ffffff', lines: ['#fca5a5', '#fcd34d', '#93c5fd', '#c084fc', '#86efac', '#fdba74'] },
  dark: { name: '深邃暗黑', background: '#0f172a', nodeDefault: '#1e293b', nodeText: '#f1f5f9', nodeActive: '#38bdf8', nodeActiveText: '#0f172a', lines: ['#38bdf8', '#818cf8', '#c084fc', '#4ade80', '#fb7185', '#fbbf24'] }
};

const currentTheme = ref<ThemeKey>('business');
const layoutMode = ref<LayoutMode>('balanced');
const isSettingsOpen = ref(false);
const activeNodeId = ref<string | null>(null);
const editingNodeId = ref<string | null>(null);
const editingText = ref('');
const fileInputRef = ref<HTMLInputElement | null>(null);
const view = ref({ x: window.innerWidth / 2, y: window.innerHeight / 2, scale: 1 });

const theme = computed(() => themes[currentTheme.value]);
const getImages = (node: MindNode) => node.attachments?.filter(a => a.type === 'image') || [];
const getFileCount = (node: MindNode) => node.attachments?.filter(a => a.type === 'file').length || 0;

const IMG_SIZE = 44; // 略微缩小图标，更精致
const IMG_GAP = 6;

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
  const gridW = cols * IMG_SIZE + (cols - 1) * IMG_GAP;
  const gridH = row * IMG_SIZE + (row - 1) * IMG_GAP;
  return {
    x: -gridW / 2 + col * (IMG_SIZE + IMG_GAP),
    y: -gridH / 2 - 12 // 向上偏移，为文字留出空间
  };
};

const calculateNodeSize = (nodeData: any, depth: number = 1) => {
  const images = getImages(nodeData);
  const { cols, rows } = getGridInfo(images.length);
  const textWidth = nodeData.text.length * (depth === 0 ? 22 : 16) + (depth === 0 ? 80 : 20);
  const gridW = cols > 0 ? cols * IMG_SIZE + (cols - 1) * IMG_GAP : 0;
  const gridH = rows > 0 ? rows * IMG_SIZE + (rows - 1) * IMG_GAP : 0;
  
  if (depth === 0) return { width: textWidth, height: 64 };
  
  // 子节点高度 = 图片高度 + 间距 + 文字高度
  const totalH = Math.max(40, gridH + (images.length > 0 ? 30 : 0));
  return {
    width: Math.max(textWidth, gridW),
    height: totalH
  };
};

const flattenedNodes = ref<MindNode[]>([]);
const connections = ref<any[]>([]);
const VERTICAL_GAP = 20;
const MIN_HORIZONTAL_GAP = 60;

const calculateSubtreeHeight = (node: any, depth: number = 1): number => {
  const { height } = calculateNodeSize(node, depth);
  if (!node.children || node.children.length === 0) return height;
  const childrenHeight = node.children.reduce((acc: number, child: any) => acc + calculateSubtreeHeight(child, depth + 1), 0);
  return Math.max(height, childrenHeight + (node.children.length - 1) * VERTICAL_GAP);
};

const updateLayout = () => {
  const nodes: MindNode[] = [];
  const lines: any[] = [];
  const activeTheme = theme.value;
  
  // 生成路径：根据深度返回不同风格
  // 一级：S形渐变曲线 (tapered S-curve)
  // 二级及更深：圆角折线 (rounded polyline)
  const generatePath = (
    x1: number, y1: number,
    x2: number, y2: number,
    depth: number,
    direction: 'left' | 'right'
  ): { d: string; isTapered: boolean } => {
    const sign = direction === 'right' ? 1 : -1;
    const dy = y2 - y1;
    const absDy = Math.abs(dy);

    if (depth === 0) {
      // ===== 一级分支：S形渐变曲线 =====
      const dx = Math.abs(x2 - x1);
      const startW = 14;  // 起点宽度（束状发散）
      const endW = 3;     // 终点宽度

      // S曲线控制点 - 制造"束状"发散效果
      // 先短水平，然后快速弯曲，最后水平进入
      const bendX = x1 + sign * dx * 0.20;  // 弯曲开始点
      const approachX = x2 - sign * dx * 0.35; // 进入前的控制点

      const d = `M ${x1} ${y1 - startW / 2}
            C ${bendX} ${y1 - startW / 2}, ${approachX} ${y2 - endW / 2}, ${x2} ${y2 - endW / 2}
            L ${x2} ${y2 + endW / 2}
            C ${approachX} ${y2 + endW / 2}, ${bendX} ${y1 + startW / 2}, ${x1} ${y1 + startW / 2}
            Z`;
      return { d, isTapered: true };
    } else {
      // ===== 二级及更深：圆角折线 =====
      const r = 8;  // 圆角半径
      const outLen = 18; // 出发水平段长度

      // 计算拐点X坐标
      const cornerX = x1 + sign * outLen;

      // 根据Y方向决定圆角方向
      const ySign = dy > 0 ? 1 : -1;

      let d: string;
      if (absDy < r * 2) {
        // Y距离太小，直接用曲线连接
        d = `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${y1}, ${x2} ${y2}`;
      } else {
        // 标准圆角折线: 水平 → 圆角 → 垂直 → 圆角 → 水平
        d = `M ${x1} ${y1}
            L ${cornerX} ${y1}
            Q ${cornerX + sign * r} ${y1}, ${cornerX + sign * r} ${y1 + ySign * r}
            L ${cornerX + sign * r} ${y2 - ySign * r}
            Q ${cornerX + sign * r} ${y2}, ${cornerX + sign * r * 2} ${y2}
            L ${x2} ${y2}`;
      }
      return { d, isTapered: false };
    }
  };

  const layoutNode = (nodeData: any, x: number, y: number, depth: number, branchIndex: number, direction: 'left' | 'right' | 'center') => {
    const { width, height } = calculateNodeSize(nodeData, depth);
    const color = depth === 0 ? activeTheme.nodeText : activeTheme.lines[branchIndex % activeTheme.lines.length];
    const node: MindNode = { ...nodeData, x, y, width, height, depth, color };
    nodes.push(node);

    if (nodeData.children?.length > 0) {
      let leftC: any[] = [], rightC: any[] = [];
      if (depth === 0) {
        if (layoutMode.value === 'logical') rightC = nodeData.children;
        else nodeData.children.forEach((c: any, i: number) => { if (i % 2 === 0) rightC.push(c); else leftC.push(c); });
      } else {
        if (direction === 'left') leftC = nodeData.children; else rightC = nodeData.children;
      }

      [ { list: rightC, dir: 'right', sign: 1 }, { list: leftC, dir: 'left', sign: -1 } ].forEach(({ list, dir, sign }) => {
        if (list.length === 0) return;
        const totalH = list.reduce((acc: number, c: any) => acc + calculateSubtreeHeight(c, depth + 1), 0) + (list.length - 1) * VERTICAL_GAP;
        let currentY = y - totalH / 2;
        list.forEach((child: any) => {
          const subH = calculateSubtreeHeight(child, depth + 1);
          const childSize = calculateNodeSize(child, depth + 1);
          const childY = currentY + subH / 2;
          const childX = x + sign * (width / 2 + MIN_HORIZONTAL_GAP + childSize.width / 2);
          const bIdx = depth === 0 ? nodeData.children.indexOf(child) : branchIndex;
          const childColor = depth === 0 ? activeTheme.lines[bIdx % activeTheme.lines.length] : color;
          layoutNode(child, childX, childY, depth + 1, bIdx, dir as any);
          
          // 下划线Y位置（与模板中的下划线位置一致）
          const underlineY = (h: number) => h / 2 - 4;

          // 起点坐标
          const startX = x + sign * (width / 2);
          const startY = depth === 0
            ? y  // 根节点：从侧边中点出发
            : y + underlineY(height);  // 其他：从下划线末端出发

          // 终点坐标 - 连接到子节点下划线起点
          const endX = childX - sign * (childSize.width / 2);
          const endY = childY + underlineY(childSize.height);

          const pathResult = generatePath(startX, startY, endX, endY, depth, dir as 'left' | 'right');

          lines.push({
            id: `${nodeData.id}-${child.id}`,
            d: pathResult.d,
            color: childColor,
            width: pathResult.isTapered ? 0 : 2,
            isTapered: pathResult.isTapered
          });
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
const handleFileUpload = async (e: Event) => {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file || !activeNodeId.value) return;
  
  const currentNode = activeNode.value;
  if (currentNode) currentNode.isLoading = true;

  try {
    const fileUrl = await uploadFile(file);
    const attachment: Attachment = { 
      id: Math.random().toString(36).substr(2, 9), 
      name: file.name, 
      url: fileUrl, 
      type: file.type.startsWith('image/') ? 'image' : 'file' 
    };

    const newData = JSON.parse(JSON.stringify(props.data));
    const add = (root: any) => { 
      if (root.id === activeNodeId.value) { 
        (root.attachments ??= []).push(attachment); 
        return true; 
      } 
      return root.children?.some(add); 
    };
    add(newData);
    emit('update:data', newData);
  } catch (error) {
    alert('文件上传失败');
    console.error(error);
  } finally {
    if (currentNode) currentNode.isLoading = false;
    (e.target as HTMLInputElement).value = ''; // Reset input
  }
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

// --- 视图与交互逻辑 ---
const isDragging = ref(false);
const lastPos = ref({ x: 0, y: 0 });
const initialPinchDistance = ref<number | null>(null);
const initialScale = ref(1);

const getDistance = (t1: Touch, t2: Touch) => Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2));

const handleMouseDown = (e: MouseEvent) => { isDragging.value = true; lastPos.value = { x: e.clientX, y: e.clientY }; };
const handleMouseMove = (e: MouseEvent) => { if (!isDragging.value) return; view.value.x += e.clientX - lastPos.value.x; view.value.y += e.clientY - lastPos.value.y; lastPos.value = { x: e.clientX, y: e.clientY }; };
const handleMouseUp = () => isDragging.value = false;
const handleWheel = (e: WheelEvent) => {
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = view.value.scale * delta;
  if (newScale > 0.1 && newScale < 5) {
    // 鼠标滚轮中心点缩放
    const scaleRatio = newScale / view.value.scale;
    view.value.x = e.clientX - (e.clientX - view.value.x) * scaleRatio;
    view.value.y = e.clientY - (e.clientY - view.value.y) * scaleRatio;
    view.value.scale = newScale;
  }
};

const handleTouchStart = (e: TouchEvent) => { 
  if (e.touches.length === 2 && e.touches[0] && e.touches[1]) {
    isDragging.value = false;
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
    const newScale = initialScale.value * (dist / initialPinchDistance.value);
    
    if (newScale > 0.1 && newScale < 5) {
      const scaleRatio = newScale / view.value.scale;
      // 计算双指中点
      const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      
      // 双指中点缩放算法
      view.value.x = midX - (midX - view.value.x) * scaleRatio;
      view.value.y = midY - (midY - view.value.y) * scaleRatio;
      view.value.scale = newScale;
    }
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
watch([currentTheme, layoutMode], updateLayout);
onMounted(updateLayout);
</script>

<style scoped>
.transition-all { transition-property: all; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1); }
</style>
