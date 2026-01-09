<template>
  <div class="relative w-full h-full overflow-hidden">
    <!-- 导图容器 -->
    <div ref="mindMapContainer" class="w-full h-full bg-slate-50"></div>
    
    <!-- 悬浮工具栏 (当有节点选中时显示) -->
    <div 
      v-if="activeNode"
      class="absolute bottom-8 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-xl border border-slate-200 p-2 flex items-center gap-2 transition-all duration-300 z-50"
    >
      <div class="px-3 py-1 bg-slate-100 rounded text-xs text-slate-500 font-medium max-w-[150px] truncate">
        {{ activeNode.getData('text') }}
      </div>
      <div class="w-px h-4 bg-slate-200 mx-1"></div>
      
      <button 
        @click="handleAiExpand"
        :disabled="isProcessing"
        class="p-2 text-white bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:from-violet-600 hover:to-fuchsia-600 rounded-lg shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed group relative"
        title="AI 智能分解"
      >
        <Loader2 v-if="isProcessing" class="animate-spin" :size="18" />
        <Wand2 v-else :size="18" class="group-hover:rotate-12 transition-transform" />
      </button>

      <button 
        @click="triggerImageUpload"
        class="p-2 text-slate-500 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
        title="添加图片"
      >
        <ImageIcon :size="16" />
      </button>

      <button 
        @click="deleteNode"
        class="p-2 text-slate-500 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
        title="删除节点"
      >
        <Trash2 :size="16" />
      </button>

      <!-- 隐藏的文件选择器 -->
      <input 
        ref="imageInput"
        type="file" 
        accept="image/*" 
        class="hidden" 
        @change="handleImageUpload"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import MindMap from 'simple-mind-map';
import { Sparkles, Loader2, Trash2, Image as ImageIcon, Wand2 } from 'lucide-vue-next';
import type { MindNode } from '../types';
import { fetchAIExpansion } from '../services/ai';

// 定义 Props
const props = defineProps<{
  initialData?: MindNode;
}>();

const emit = defineEmits<{
  (e: 'update:data', data: MindNode): void;
  (e: 'save'): void;
}>();

const mindMapContainer = ref<HTMLElement | null>(null);
const activeNode = ref<any>(null);
const isProcessing = ref(false);
const imageInput = ref<HTMLInputElement | null>(null);
let mindMap: MindMap | null = null;

const triggerImageUpload = () => {
  imageInput.value?.click();
};

const handleImageUpload = (event: Event) => {
  const file = (event.target as HTMLInputElement).files?.[0];
  if (!file || !activeNode.value) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    const base64 = e.target?.result as string;
    
    // 获取图片宽高
    const img = new Image();
    img.onload = () => {
      const maxWidth = 200;
      const ratio = img.width / img.height;
      const width = Math.min(img.width, maxWidth);
      const height = width / ratio;

      mindMap?.execCommand('SET_NODE_IMAGE', activeNode.value, {
        url: base64,
        title: file.name,
        width,
        height
      });
      
      if (imageInput.value) imageInput.value.value = '';
    };
    img.src = base64;
  };
  reader.readAsDataURL(file);
};

// 初始化导图
onMounted(() => {
  if (!mindMapContainer.value) return;

  // 转换初始数据格式适配 simple-mind-map
  // simple-mind-map 需要 { data: { text: ... }, children: [...] }
  const initialContent = transformToMindMapData(props.initialData || {
    id: 'root',
    text: 'Python学习路线',
    children: [],
    isExpanded: true,
    isLoading: false
  });

  // 使用 as any 绕过严格的类型检查
  mindMap = new MindMap({
    el: mindMapContainer.value,
    data: initialContent,
    theme: 'default', // 回退到默认
    layout: 'mindMap', 
    themeConfig: {
        lineStyle: 'curve',
        lineWidth: 3,
    },
    mousewheelAction: 'zoom',
  } as any);

  const rainbowColors = [
      '#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#FFC107', '#00BCD4', '#E91E63', '#795548'
  ];

  const forceRainbowColor = () => {
      const root = (mindMap as any)?.renderer?.root;
      if (root && root.children) {
          root.children.forEach((node: any, index: number) => {
              const color = rainbowColors[index % rainbowColors.length];
              
              const setNodeStyle = (n: any, level: number) => {
                  // 强制覆盖样式
                  n.style.lineColor = color; 
                  
                  // 树枝粗细逻辑
                  if (level === 1) {
                      n.style.lineWidth = 5;
                  } else if (level === 2) {
                      n.style.lineWidth = 3;
                  } else {
                      n.style.lineWidth = 2;
                  }

                  // 更新数据以持久化
                  n.setData({ 
                      ...n.getData(), 
                      lineColor: color,
                      lineWidth: n.style.lineWidth
                  }); 
                  
                  if (n.children) {
                      n.children.forEach((child: any) => setNodeStyle(child, level + 1));
                  }
              };
              // 一级节点的 level 设为 1
              setNodeStyle(node, 1);
          });
          // 整体重绘
          mindMap?.render();
      }
  };

  // 监听节点激活事件
  mindMap!.on('node_active', (_node: any, nodeList: any[]) => {
    // simple-mind-map 可能返回多个选中节点，我们只处理第一个
    activeNode.value = nodeList && nodeList.length > 0 ? nodeList[0] : null;
  });

  // 监听点击空白处取消选中
  mindMap!.on('node_click', () => {
      // 这里的 node 已经在 node_active 里处理了，主要处理点击画布清空
  });
  
  mindMap!.on('click_data', () => {
     // 点击画布空白处
  });

  // 监听数据变化，向上汇报
  mindMap!.on('data_change', () => {
    // 强制上色
    forceRainbowColor();

    // getData(true) 表示获取包含配置的数据，或者查看文档看是否传 false
    // 类型定义要求传参
    const data = mindMap?.getData(false);
    if (data) {
      const appData = transformToAppData(data);
      emit('update:data', appData);
      emit('save');
    }
  });
  
  // 初始上色
  setTimeout(forceRainbowColor, 500);
});

onUnmounted(() => {
  if (mindMap) {
    mindMap.destroy();
  }
});

// AI 分解逻辑
const handleAiExpand = async () => {
  if (!activeNode.value || isProcessing.value) return;

  const node = activeNode.value;
  // 获取当前节点的数据模型 (simple-mind-map 内部属性通常是 nodeData)
  // 为了安全，我们通过 getData() 获取并在内存中维护结构，但这比较慢
  // 更高效的方式是直接操作 node 实例的 children，然后重新布局
  
  // 构建路径
  const path: string[] = [];
  let current = node;
  while (current) {
    path.unshift(current.getData('text'));
    current = current.parent;
  }

  isProcessing.value = true;
  try {
    const subItems = await fetchAIExpansion(path);
    console.log('AI returned items:', subItems);

    if (subItems && subItems.length > 0) {
      // 方案C：混合使用。
      // 先选中父节点
      mindMap?.execCommand('SELECT_NODE', node.uid); // 使用 uid 而不是对象

      // 批量插入逻辑：
      // 由于 simple-mind-map 的 execCommand('INSERT_CHILD_NODE') 会改变选中状态
      // 我们需要手动控制。
      
      // 构造符合 simple-mind-map 规范的节点数据
      const newNodesData = subItems.map(text => ({
        data: { 
          text, 
          uid: Math.random().toString(36).substr(2, 9),
          expand: true 
        },
        children: []
      }));

      // 使用 insertChildNode 命令（如果支持传入数组则最好，不支持则循环）
      // 查看源码得知 INSERT_CHILD_NODE 第二个参数是 node 实例或 null
      // 第三个参数是多选数组
      // 第四个参数是 data
      
      // 既然之前的循环插入有问题，我们尝试最原始的 API：直接操作 Model
      // mindMap.renderer.layout.root 是根节点
      // 我们直接把数据塞进去，然后 render
      
      if (node.nodeData) {
        if (!node.nodeData.children) node.nodeData.children = [];
        node.nodeData.children.push(...newNodesData);
        node.nodeData.data.expand = true;
        
        // 触发重绘
        mindMap?.render();
        
        // 触发保存
        mindMap?.emit('data_change', node.nodeData);
      } else {
         // Fallback to command if nodeData is not accessible
         subItems.forEach(text => {
            mindMap?.execCommand('INSERT_CHILD_NODE', false, [], {
              text,
              uid: Math.random().toString(36).substr(2, 9)
            });
            // 强行切回父节点？不，这会导致后续插入变为兄弟
            // 如果我们每次都切回父节点，那么后续插入就是 Child 的 Sibling 吗？
            // INSERT_CHILD_NODE 是给当前选中的节点加子节点。
            // 第一次：选中 Parent -> 加 Child1 -> 选中 Child1
            // 切回 Parent
            // 第二次：选中 Parent -> 加 Child2 -> 选中 Child2
            // 这样 Child1 和 Child2 都是 Parent 的子节点。
            
            mindMap?.execCommand('GO_TO_NODE', node.uid);
         });
      }
    }
  } catch (error: any) {
    alert(error.message || 'AI 生成失败');
    console.error(error);
  } finally {
    isProcessing.value = false;
  }
};

const deleteNode = () => {
    if (activeNode.value) {
        mindMap?.execCommand('REMOVE_NODE');
        activeNode.value = null;
    }
};

// 数据转换工具
// App (MindNode) -> SimpleMindMap
const transformToMindMapData = (node: MindNode): any => {
  return {
    data: {
      text: node.text,
      uid: node.id,
      expand: node.isExpanded !== false // default true
    },
    children: node.children.map(transformToMindMapData)
  };
};

// SimpleMindMap -> App (MindNode)
const transformToAppData = (data: any): MindNode => {
  return {
    id: data.data.uid || Math.random().toString(36).substr(2, 9),
    text: data.data.text,
    isExpanded: data.data.expand !== false,
    isLoading: false,
    children: (data.children || []).map(transformToAppData)
  };
};

</script>

<style scoped>
/* 可以在这里覆盖 simple-mind-map 的内部样式 if needed */
</style>
