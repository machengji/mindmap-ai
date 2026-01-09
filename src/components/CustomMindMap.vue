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
    >
      <!-- 背景网格 (可选，增强移动感) -->
      <defs>
        <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" stroke-width="0.5"/>
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#grid)" />

      <!-- 导图主体：通过 transform 实现平移和缩放 -->
      <g :transform="`translate(${view.x}, ${view.y}) scale(${view.scale})`">
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
        >
          <!-- 节点背景 -->
          <rect 
            :x="-node.width / 2" 
            :y="-node.height / 2" 
            :width="node.width" 
            :height="node.height" 
            rx="12"
            :style="{ 
              fill: activeNodeId === node.id ? '#2563eb' : '#ffffff',
              stroke: activeNodeId === node.id ? '#60a5fa' : node.color,
              strokeWidth: node.depth === 0 ? '3px' : '2px'
            }"
            class="transition-all duration-300 shadow-sm"
          />
          <!-- 节点文字 -->
          <text 
            text-anchor="middle" 
            dominant-baseline="middle" 
            :style="{ fill: activeNodeId === node.id ? '#ffffff' : (node.depth === 0 ? '#1e293b' : node.color) }"
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

    <!-- 移动端悬浮 AI 按钮 (仅当有节点选中时) -->
    <div 
      v-if="activeNode"
      class="absolute bottom-10 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-white/90 backdrop-blur-md px-6 py-3 rounded-2xl shadow-2xl border border-slate-200 z-50 animate-in fade-in slide-in-from-bottom-4"
    >
      <div class="text-xs font-bold text-slate-400 uppercase tracking-widest border-r border-slate-200 pr-4 mr-2">
        {{ activeNode.text }}
      </div>
      <button 
        @click="expandWithAI"
        :disabled="activeNode.isLoading"
        class="bg-gradient-to-tr from-indigo-600 to-violet-600 text-white p-3 rounded-xl hover:shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50"
      >
        <Wand2 v-if="!activeNode.isLoading" :size="20" />
        <Loader2 v-else class="animate-spin" :size="20" />
      </button>
      <button 
        @click="deleteActiveNode"
        class="bg-slate-100 text-slate-500 p-3 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all"
      >
        <Trash2 :size="20" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue';
import { Wand2, Loader2, Trash2 } from 'lucide-vue-next';
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

// --- 视图平移与缩放状态 ---
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

const rainbowColors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

const VERTICAL_GAP = 60;
const HORIZONTAL_GAP = 250;

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
    const color = depth === 0 ? '#1e293b' : rainbowColors[branchIndex % rainbowColors.length];
    
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
      // 计算左右分支（如果是根节点）
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
        const totalHeight = rightChildren.reduce((acc, child) => acc + calculateSubtreeHeight(child), 0) + (rightChildren.length - 1) * VERTICAL_GAP;
        let currentY = y - totalHeight / 2;
        
        rightChildren.forEach((child, index) => {
          const subtreeHeight = calculateSubtreeHeight(child);
          const childY = currentY + subtreeHeight / 2;
          const childX = x + HORIZONTAL_GAP;
          const bIndex = depth === 0 ? nodeData.children.indexOf(child) : branchIndex;
          const childColor = depth === 0 ? rainbowColors[bIndex % rainbowColors.length] : color;

          layoutNode(child, childX, childY, depth + 1, bIndex, 'right');
          
          // 连线
          const startX = x + (depth === 0 ? 0 : width / 2);
          const endX = childX - (child.text.length * 12 + 40) / 2;
          const cp1x = startX + (endX - startX) * 0.5;
          lines.push({
            id: `${nodeData.id}-${child.id}`,
            d: `M ${startX} ${y} C ${cp1x} ${y}, ${cp1x} ${childY}, ${endX} ${childY}`,
            color: childColor,
            width: Math.max(1, 5 - depth * 1.5)
          });

          currentY += subtreeHeight + VERTICAL_GAP;
        });
      }

      // 布局左侧
      if (leftChildren.length > 0) {
        const totalHeight = leftChildren.reduce((acc, child) => acc + calculateSubtreeHeight(child), 0) + (leftChildren.length - 1) * VERTICAL_GAP;
        let currentY = y - totalHeight / 2;
        
        leftChildren.forEach((child, index) => {
          const subtreeHeight = calculateSubtreeHeight(child);
          const childY = currentY + subtreeHeight / 2;
          const childX = x - HORIZONTAL_GAP;
          const bIndex = depth === 0 ? nodeData.children.indexOf(child) : branchIndex;
          const childColor = depth === 0 ? rainbowColors[bIndex % rainbowColors.length] : color;

          layoutNode(child, childX, childY, depth + 1, bIndex, 'left');
          
          // 连线
          const startX = x - (depth === 0 ? 0 : width / 2);
          const endX = childX + (child.text.length * 12 + 40) / 2;
          const cp1x = startX + (endX - startX) * 0.5;
          lines.push({
            id: `${nodeData.id}-${child.id}`,
            d: `M ${startX} ${y} C ${cp1x} ${y}, ${cp1x} ${childY}, ${endX} ${childY}`,
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

// 监听数据变化重新布局
watch(() => props.data, updateLayout, { deep: true, immediate: true });

// --- 触摸/鼠标处理逻辑 ---
const getDistance = (t1: Touch, t2: Touch) => {
  return Math.sqrt(Math.pow(t2.clientX - t1.clientX, 2) + Math.pow(t2.clientY - t1.clientY, 2));
};

const handleTouchStart = (e: TouchEvent) => {
  if (e.touches.length === 2) {
    initialPinchDistance.value = getDistance(e.touches[0], e.touches[1]);
    initialScale.value = view.value.scale;
  } else if (e.touches.length === 1) {
    const touch = e.touches[0];
    isDragging.value = true;
    lastTouch.value = { x: touch.clientX, y: touch.clientY };
  }
};

const handleTouchMove = (e: TouchEvent) => {
  if (e.touches.length === 2 && initialPinchDistance.value !== null) {
    const currentDistance = getDistance(e.touches[0], e.touches[1]);
    const delta = currentDistance / initialPinchDistance.value;
    const newScale = initialScale.value * delta;
    if (newScale > 0.1 && newScale < 5) {
      view.value.scale = newScale;
    }
  } else if (e.touches.length === 1 && isDragging.value) {
    const touch = e.touches[0];
    const dx = touch.clientX - lastTouch.value.x;
    const dy = touch.clientY - lastTouch.value.y;
    view.value.x += dx;
    view.value.y += dy;
    lastTouch.value = { x: touch.clientX, y: touch.clientY };
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
