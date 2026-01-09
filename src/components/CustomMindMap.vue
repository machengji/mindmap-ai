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
        <!-- 背景网格 -->
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" :stroke="currentTheme === 'dark' ? '#1e293b' : '#e2e8f0'" stroke-width="0.5"/>
        </pattern>
        
        <!-- 手绘震动滤镜 -->
        <filter id="handDrawnFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="2" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      
      <rect width="100%" height="100%" fill="url(#grid)" />

      <!-- 导图主体：通过 transform 实现平移和缩放 -->
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
            :stroke-dasharray="isHandDrawn ? '0' : ''"
          />
        </g>

        <!-- 节点层 -->
        <g 
          v-for="node in flattenedNodes" 
          :key="node.id"
          :transform="`translate(${node.x}, ${node.y})`"
          class="cursor-pointer"
          @click.stop="handleNodeClick(node)"
        >
          <!-- 节点背景 -->
          <rect 
            :x="-node.width / 2" 
            :y="-node.height / 2" 
            :width="node.width" 
            :height="node.height" 
            :rx="skeletonStyle === 'straight' ? '2' : '12'"
            :style="{ 
              fill: activeNodeId === node.id ? theme?.nodeActive : theme?.nodeDefault,
              stroke: activeNodeId === node.id ? theme?.nodeActive : node.color,
              strokeWidth: node.depth === 0 ? '3px' : '2px'
            }"
            class="transition-all duration-300 shadow-sm"
          />
          <!-- 节点文字 -->
          <text 
            text-anchor="middle" 
            dominant-baseline="middle" 
            :style="{ 
              fill: activeNodeId === node.id ? theme?.nodeActiveText : (node.depth === 0 ? theme?.nodeText : node.color),
              fontFamily: isHandDrawn ? 'cursive, sans-serif' : 'inherit'
            }"
            class="select-none font-bold text-sm transition-colors duration-300"
          >
            {{ node.text }}
          </text>
          
          <!-- 加载状态 (AI 分解中) -->
          <circle 
            v-if="node.isLoading"
            r="10" 
            cx="0" 
            :cy="node.height/2 + 15" 
            class="fill-blue-500 animate-pulse"
          />
        </g>
      </g>
    </svg>

    <!-- 样式设置面板 -->
    <div class="absolute top-6 right-6 flex flex-col gap-2 z-50">
      <div class="bg-white/90 backdrop-blur-md p-2 rounded-2xl shadow-xl border border-slate-200 flex flex-col gap-3">
        <!-- 主题切换 -->
        <div class="flex items-center gap-2 p-1">
          <Palette :size="18" class="text-slate-400" />
          <div class="flex gap-1">
            <button 
              v-for="(_, key) in themes" 
              :key="key"
              @click="currentTheme = key"
              :class="[
                'w-6 h-6 rounded-full border-2 transition-all',
                currentTheme === key ? 'border-indigo-500 scale-110' : 'border-transparent'
              ]"
              :style="{ backgroundColor: themes[key].nodeActive }"
              :title="themes[key].name"
            />
          </div>
        </div>
        
        <div class="h-px bg-slate-100 mx-1" />

        <!-- 骨架风格 -->
        <div class="flex items-center gap-2 p-1">
          <Box :size="18" class="text-slate-400" />
          <div class="flex bg-slate-100 rounded-lg p-1 gap-1">
            <button 
              v-for="s in (['rounded', 'straight', 'wavy'] as SkeletonStyle[])" 
              :key="s"
              @click="skeletonStyle = s"
              :class="[
                'px-2 py-1 text-[10px] font-bold rounded transition-all',
                skeletonStyle === s ? 'bg-white shadow-sm text-indigo-600' : 'text-slate-500 hover:text-slate-700'
              ]"
            >
              {{ s === 'rounded' ? '圆角' : s === 'straight' ? '直角' : '波浪' }}
            </button>
          </div>
        </div>

        <div class="h-px bg-slate-100 mx-1" />

        <!-- 手写模式 -->
        <button 
          @click="isHandDrawn = !isHandDrawn"
          :class="[
            'flex items-center justify-between gap-2 p-2 rounded-xl transition-all',
            isHandDrawn ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'
          ]"
        >
          <div class="flex items-center gap-2">
            <Pencil :size="18" />
            <span class="text-xs font-bold">手绘风格</span>
          </div>
          <div :class="['w-8 h-4 rounded-full relative transition-all', isHandDrawn ? 'bg-indigo-600' : 'bg-slate-200']">
            <div :class="['absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all', isHandDrawn ? 'left-[18px]' : 'left-0.5']" />
          </div>
        </button>
      </div>
    </div>

    <!-- 移动端悬浮 AI 按钮 (仅当有节点选中时) -->
    <div 
      v-if="activeNode"
      class="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-2xl border border-slate-200 z-50 animate-in fade-in slide-in-from-bottom-4 max-w-[90vw]"
    >
      <div class="text-sm font-bold text-slate-700 truncate max-w-[120px] border-r border-slate-200 pr-3 mr-1">
        {{ activeNode.text }}
      </div>
      <div class="flex items-center gap-2">
        <button 
          @click="expandWithAI"
          :disabled="activeNode.isLoading"
          class="bg-gradient-to-tr from-indigo-600 to-violet-600 text-white p-2.5 rounded-xl hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
        >
          <Wand2 v-if="!activeNode.isLoading" :size="18" />
          <Loader2 v-else class="animate-spin" :size="18" />
          <span class="text-xs font-medium pr-1">AI 分解</span>
        </button>
        <button 
          @click="deleteActiveNode"
          class="bg-slate-100 text-slate-500 p-2.5 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
        >
          <Trash2 :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Wand2, Loader2, Trash2, Palette, Box, Pencil } from 'lucide-vue-next';
import { fetchAIExpansion } from '../services/ai';

interface MindNode {
  id: string;
  text: string;
  children: MindNode[];
  x: number;
  y: number;
  width: number;
  height: number;
  isLoading?: boolean;
  color?: string;
  depth?: number;
}

const props = defineProps<{
  data: any;
}>();

const emit = defineEmits(['update:data']);

// --- 类型定义 ---
interface Theme {
  name: string;
  background: string;
  nodeDefault: string;
  nodeText: string;
  nodeActive: string;
  nodeActiveText: string;
  lines: string[];
}

type ThemeKey = 'business' | 'macaron' | 'dark';

const themes: Record<ThemeKey, Theme> = {
  business: {
    name: '商务精英',
    background: '#f8fafc',
    nodeDefault: '#ffffff',
    nodeText: '#1e293b',
    nodeActive: '#2563eb',
    nodeActiveText: '#ffffff',
    lines: ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']
  },
  macaron: {
    name: '清甜马卡龙',
    background: '#fff7ed',
    nodeDefault: '#ffffff',
    nodeText: '#7c2d12',
    nodeActive: '#fb923c',
    nodeActiveText: '#ffffff',
    lines: ['#fca5a5', '#fcd34d', '#93c5fd', '#c084fc', '#86efac', '#fdba74']
  },
  dark: {
    name: '深邃暗黑',
    background: '#0f172a',
    nodeDefault: '#1e293b',
    nodeText: '#f1f5f9',
    nodeActive: '#38bdf8',
    nodeActiveText: '#0f172a',
    lines: ['#38bdf8', '#818cf8', '#c084fc', '#4ade80', '#fb7185', '#fbbf24']
  }
};

type SkeletonStyle = 'rounded' | 'straight' | 'wavy';

// --- 状态 ---
const currentTheme = ref<ThemeKey>('business');
const skeletonStyle = ref<SkeletonStyle>('rounded');
const isHandDrawn = ref(false);

// 安全获取主题
const theme = computed(() => themes[currentTheme.value]);

const view = ref({
  x: window.innerWidth / 2,
  y: window.innerHeight / 2,
  scale: 1
});

// --- 交互状态 ---
const activeNodeId = ref<string | null>(null);
const isDragging = ref(false);
const lastTouch = ref({ x: 0, y: 0 });
const initialPinchDistance = ref<number | null>(null);
const initialScale = ref(1);

// --- 计算布局 ---
// 扁平化节点以便于渲染
const flattenedNodes = ref<MindNode[]>([]);
const connections = ref<any[]>([]);

const VERTICAL_GAP = 30;
const HORIZONTAL_GAP = 180;

// 预先计算每个子树的高度
const calculateSubtreeHeight = (node: any): number => {
  if (!node.children || node.children.length === 0) {
    return 40; // 节点基础高度
  }
  const childrenHeight = node.children.reduce((acc: number, child: any) => {
    return acc + calculateSubtreeHeight(child);
  }, 0);
  const gaps = (node.children.length - 1) * VERTICAL_GAP;
  return Math.max(40, childrenHeight + gaps);
};

const updateLayout = () => {
  const nodes: MindNode[] = [];
  const lines: any[] = [];
  const activeTheme = theme.value!;
  
  const generatePath = (x1: number, y1: number, x2: number, y2: number) => {
    const dx = x2 - x1;
    const midX = x1 + dx * 0.5;

    if (skeletonStyle.value === 'straight') {
      return `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;
    } else if (skeletonStyle.value === 'wavy') {
      const amp = 15;
      let path = `M ${x1} ${y1} `;
      path += `C ${x1 + dx*0.4} ${y1}, ${x1 + dx*0.6} ${y2}, ${x2} ${y2}`;
      return path;
    } else {
      return `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;
    }
  };

  const layoutNode = (
    nodeData: any, 
    x: number, 
    y: number, 
    depth: number, 
    branchIndex: number, 
    direction: 'left' | 'right' | 'center'
  ) => {
    const width = nodeData.text.length * 12 + 40;
    const height = 40;
    const color = depth === 0 ? activeTheme.nodeText : activeTheme.lines[branchIndex % activeTheme.lines.length];
    
    const node: MindNode = {
      ...nodeData,
      x,
      y,
      width,
      height,
      depth,
      color
    };
    nodes.push(node);

    if (nodeData.children && nodeData.children.length > 0) {
      let leftChildren = [];
      let rightChildren = [];
      
      if (depth === 0) {
        nodeData.children.forEach((child: any, index: number) => {
          if (index % 2 === 0) rightChildren.push(child);
          else leftChildren.push(child);
        });
      } else {
        if (direction === 'left') leftChildren = nodeData.children;
        else rightChildren = nodeData.children;
      }

      // 布局右侧
      if (rightChildren.length > 0) {
        const totalHeight = rightChildren.reduce((acc: number, child: any) => acc + calculateSubtreeHeight(child), 0) + (rightChildren.length - 1) * VERTICAL_GAP;
        let currentY = y - totalHeight / 2;
        
        rightChildren.forEach((child: any) => {
          const subtreeHeight = calculateSubtreeHeight(child);
          const childY = currentY + subtreeHeight / 2;
          const childX = x + HORIZONTAL_GAP;
          const bIndex = depth === 0 ? nodeData.children.indexOf(child) : branchIndex;
          const childColor = depth === 0 ? activeTheme.lines[bIndex % activeTheme.lines.length] : color;

          layoutNode(child, childX, childY, depth + 1, bIndex, 'right');
          
          const startX = x + (depth === 0 ? 0 : width / 2);
          const endX = childX - (child.text.length * 12 + 40) / 2;
          
          lines.push({
            id: `${nodeData.id}-${child.id}`,
            d: generatePath(startX, y, endX, childY),
            color: childColor,
            width: Math.max(1, 5 - depth * 1.5)
          });

          currentY += subtreeHeight + VERTICAL_GAP;
        });
      }

      // 布局左侧
      if (leftChildren.length > 0) {
        const totalHeight = leftChildren.reduce((acc: number, child: any) => acc + calculateSubtreeHeight(child), 0) + (leftChildren.length - 1) * VERTICAL_GAP;
        let currentY = y - totalHeight / 2;
        
        leftChildren.forEach((child: any) => {
          const subtreeHeight = calculateSubtreeHeight(child);
          const childY = currentY + subtreeHeight / 2;
          const childX = x - HORIZONTAL_GAP;
          const bIndex = depth === 0 ? nodeData.children.indexOf(child) : branchIndex;
          const childColor = depth === 0 ? activeTheme.lines[bIndex % activeTheme.lines.length] : color;

          layoutNode(child, childX, childY, depth + 1, bIndex, 'left');
          
          const startX = x - (depth === 0 ? 0 : width / 2);
          const endX = childX + (child.text.length * 12 + 40) / 2;

          lines.push({
            id: `${nodeData.id}-${child.id}`,
            d: generatePath(startX, y, endX, childY),
            color: childColor,
            width: Math.max(1, 5 - depth * 1.5)
          });

          currentY += subtreeHeight + VERTICAL_GAP;
        });
      }
    }
  };

  layoutNode(props.data, 0, 0, 0, 0, 'center');
  flattenedNodes.value = nodes;
  connections.value = lines;
};

// 监听风格变化
watch([currentTheme, skeletonStyle, isHandDrawn], updateLayout);

// --- 触摸/鼠标处理逻辑 ---
const getDistance = (t1: Touch, t2: Touch) => {
  return Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2));
};

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 2) {
    initialPinchDistance.value = getDistance(e.touches[0] as Touch, e.touches[1] as Touch);
    initialScale.value = view.value.scale;
  } else if (e.touches.length === 1) {
    const touch = e.touches[0];
    if (touch) {
      isDragging.value = true;
      lastTouch.value = { x: touch.clientX, y: touch.clientY };
    }
  }
};

const handleTouchMove = (e: TouchEvent) => {
  if (e.touches.length === 2 && initialPinchDistance.value !== null) {
    const currentDistance = getDistance(e.touches[0] as Touch, e.touches[1] as Touch);
    const delta = currentDistance / initialPinchDistance.value;
    const newScale = initialScale.value * delta;
    if (newScale > 0.1 && newScale < 5) {
      view.value.scale = newScale;
    }
  } else if (e.touches.length === 1 && isDragging.value) {
    const touch = e.touches[0];
    if (touch) {
      const dx = touch.clientX - lastTouch.value.x;
      const dy = touch.clientY - lastTouch.value.y;
      view.value.x += dx;
      view.value.y += dy;
      lastTouch.value = { x: touch.clientX, y: touch.clientY };
    }
  }
};

const handleTouchEnd = (e: TouchEvent) => {
  if (e.touches.length < 2) {
    initialPinchDistance.value = null;
  }
  if (e.touches.length === 0) {
    isDragging.value = false;
  }
};

const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true;
  lastTouch.value = { x: e.clientX, y: e.clientY };
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return;
  const dx = e.clientX - lastTouch.value.x;
  const dy = e.clientY - lastTouch.value.y;
  view.value.x += dx;
  view.value.y += dy;
  lastTouch.value = { x: e.clientX, y: e.clientY };
};

const handleMouseUp = () => { isDragging.value = false; };

const handleWheel = (e: WheelEvent) => {
  const delta = e.deltaY > 0 ? 0.9 : 1.1;
  const newScale = view.value.scale * delta;
  if (newScale > 0.1 && newScale < 5) {
    view.value.scale = newScale;
  }
};

// --- 业务逻辑 ---
const handleNodeClick = (node: MindNode) => {
  activeNodeId.value = node.id;
};

const activeNode = computed(() => {
  return flattenedNodes.value.find(n => n.id === activeNodeId.value);
});

const expandWithAI = async () => {
  if (!activeNode.value) return;
  
  // 查找路径
  const findPath = (root: any, targetId: string, currentPath: string[]): string[] | null => {
    const path = [...currentPath, root.text];
    if (root.id === targetId) return path;
    if (root.children) {
      for (const child of root.children) {
        const result = findPath(child, targetId, path);
        if (result) return result;
      }
    }
    return null;
  };

  const path = findPath(props.data, activeNode.value.id, []);
  if (!path) return;

  activeNode.value.isLoading = true;
  try {
    const subItems = await fetchAIExpansion(path);
    const newData = JSON.parse(JSON.stringify(props.data));
    
    // 递归添加子节点
    const appendToData = (root: any) => {
      if (root.id === activeNodeId.value) {
        if (!root.children) root.children = [];
        subItems.forEach(text => {
          root.children.push({
            id: Math.random().toString(36).substr(2, 9),
            text,
            children: []
          });
        });
        return true;
      }
      if (root.children) {
        for (const child of root.children) {
          if (appendToData(child)) return true;
        }
      }
      return false;
    };

    appendToData(newData);
    emit('update:data', newData);
  } catch (err) {
    alert('AI 分解失败');
  } finally {
    activeNode.value.isLoading = false;
  }
};

const deleteActiveNode = () => {
  if (!activeNodeId.value || activeNodeId.value === props.data.id) {
    alert('根节点不可删除');
    return;
  }
  const newData = JSON.parse(JSON.stringify(props.data));
  const removeRecursive = (root: any) => {
    if (!root.children) return false;
    const index = root.children.findIndex((c: any) => c.id === activeNodeId.value);
    if (index !== -1) {
      root.children.splice(index, 1);
      return true;
    }
    for (const child of root.children) {
      if (removeRecursive(child)) return true;
    }
    return false;
  };
  removeRecursive(newData);
  activeNodeId.value = null;
  emit('update:data', newData);
};

onMounted(() => {
  updateLayout();
});
</script>

<style scoped>
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}
</style>