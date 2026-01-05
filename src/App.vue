<template>
  <div class="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900">
    <!-- Header -->
    <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
      <div class="flex items-center gap-2 md:gap-3">
        <div class="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
          <BrainCircuit class="text-white" :size="20" />
        </div>
        <h1 class="text-lg md:text-xl font-bold tracking-tight">
          <span class="hidden sm:inline">Generative </span><span class="text-blue-600">Mindmap</span>
        </h1>
      </div>
      
      <div class="flex items-center gap-2 md:gap-3">
        <div class="relative group hidden sm:block">
          <input 
            v-model="apiKeyValue"
            type="password"
            placeholder="DeepSeek API Key"
            class="w-32 md:w-40 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:w-48 md:focus:w-64 transition-all outline-none focus:border-blue-400"
            @change="updateApiKey"
          />
          <div class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Key :size="14" />
          </div>
        </div>
        <!-- Cloud Sync Status -->
        <div class="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-[10px] font-bold text-slate-500">
          <template v-if="isSyncing">
            <Loader2 :size="12" class="animate-spin text-blue-500" />
            <span class="text-blue-600">同步中...</span>
          </template>
          <template v-else-if="lastSaved">
            <CloudCheck :size="12" class="text-green-500" />
            <span class="text-slate-400">已同步 {{ lastSaved.toLocaleTimeString() }}</span>
          </template>
          <template v-else>
            <Cloud :size="12" />
            <span>云同步就绪</span>
          </template>
        </div>

        <button 
          @click="handleExport"
          class="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all"
        >
          <Download :size="16" />
          <span class="hidden md:inline">导出 Markdown</span>
        </button>
        <button 
          @click="resetTree"
          class="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all shadow-md"
        >
          <RotateCcw :size="16" />
          <span class="hidden md:inline">重置</span>
        </button>
      </div>
    </header>

    <!-- Mobile Tab Switcher -->
    <div class="md:hidden flex bg-white border-b border-slate-200">
      <button 
        @click="activeTab = 'edit'"
        :class="['flex-1 py-3 text-sm font-medium border-b-2 transition-colors', activeTab === 'edit' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500']"
      >
        编辑结构
      </button>
      <button 
        @click="activeTab = 'preview'"
        :class="['flex-1 py-3 text-sm font-medium border-b-2 transition-colors', activeTab === 'preview' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500']"
      >
        预览导图
      </button>
    </div>

    <!-- Main Content -->
    <main class="flex-1 flex flex-col md:flex-row overflow-hidden">
      <!-- Left: Editor -->
      <aside 
        :class="['w-full md:w-1/3 border-r border-slate-200 bg-white flex flex-col transition-all', activeTab !== 'edit' ? 'hidden md:flex' : 'flex']"
      >
        <div class="p-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">结构编辑器</h2>
          <!-- Mobile API Key Input -->
          <div class="sm:hidden relative">
             <input 
              v-model="apiKeyValue"
              type="password"
              placeholder="API Key"
              class="w-24 px-2 py-1 bg-white border border-slate-200 rounded text-[10px] outline-none focus:border-blue-400"
              @change="updateApiKey"
            />
          </div>
        </div>
        <div class="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <MindNode 
            :node="rootNode"
            @expand="handleExpand"
            @add-child="handleAddChild"
            @delete="handleDelete"
          />
        </div>
      </aside>

      <!-- Right: Preview -->
      <section 
        :class="['flex-1 bg-slate-50 p-4 md:p-6 flex flex-col gap-4 transition-all', activeTab !== 'preview' ? 'hidden md:flex' : 'flex']"
      >
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-500 flex items-center gap-2">
            <Eye :size="16" />
            实时预览
          </h2>
          <div class="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-bold uppercase tracking-tighter">
            Auto-Syncing
          </div>
        </div>
        
        <div class="flex-1 min-h-0 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <MarkmapPreview :markdown="markdownContent" />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { BrainCircuit, Download, RotateCcw, Eye, Key, Cloud, CloudCheck, Loader2 } from 'lucide-vue-next';
import MindNode from './components/MindNode.vue';
import MarkmapPreview from './components/MarkmapPreview.vue';
import type { MindNode as MindNodeType } from './types';
import { jsonToMarkdown, downloadMarkdown } from './utils/markdown';
import { fetchAIExpansion, setApiKey, getApiKey } from './services/ai';
import { saveMindmap, loadMindmap } from './services/storage';

const apiKeyValue = ref(getApiKey());
const activeTab = ref<'edit' | 'preview'>('edit');
const isSyncing = ref(false);
const lastSaved = ref<Date | null>(null);

const updateApiKey = () => {
  setApiKey(apiKeyValue.value);
};

const createNode = (text: string): MindNodeType => ({
  id: Math.random().toString(36).substr(2, 9),
  text,
  children: [],
  isExpanded: true,
  isLoading: false
});

const rootNode = ref<MindNodeType>(createNode('Python学习路线'));

const markdownContent = computed(() => jsonToMarkdown(rootNode.value));

// 云端同步逻辑
const syncToCloud = async () => {
  isSyncing.value = true;
  await saveMindmap(rootNode.value);
  lastSaved.value = new Date();
  isSyncing.value = false;
};

// 监听数据变化自动保存 (防抖)
let saveTimeout: any = null;
watch(rootNode, () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(syncToCloud, 2000);
}, { deep: true });

onMounted(async () => {
  const savedData = await loadMindmap();
  if (savedData) {
    rootNode.value = savedData;
    lastSaved.value = new Date();
  }
});

const handleExpand = async (node: MindNodeType) => {
  if (node.isLoading) return;
  node.isLoading = true;
  try {
    const subItems = await fetchAIExpansion(node.text);
    const newNodes = subItems.map(item => createNode(item));
    node.children.push(...newNodes);
  } catch (error: any) {
    console.error('AI Expansion failed:', error);
    alert(error.message || 'AI 生成失败');
  } finally {
    node.isLoading = false;
  }
};

const handleAddChild = (node: MindNodeType) => {
  node.children.push(createNode('新节点'));
};

const handleDelete = (node: MindNodeType) => {
  const findAndDelete = (current: MindNodeType, target: MindNodeType): boolean => {
    const index = current.children.findIndex((child: MindNodeType) => child.id === target.id);
    if (index !== -1) {
      current.children.splice(index, 1);
      return true;
    }
    return current.children.some(child => findAndDelete(child, target));
  };
  
  if (node.id === rootNode.value.id) {
    alert('根节点不能删除');
    return;
  }
  
  findAndDelete(rootNode.value, node);
};

const handleExport = () => {
  downloadMarkdown(markdownContent.value, 'mindmap.md');
};

const resetTree = () => {
  if (confirm('确定要重置吗？所有更改都将丢失。')) {
    rootNode.value = createNode('Python学习路线');
  }
};
</script>

<style>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: #e2e8f0;
  border-radius: 10px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: #cbd5e1;
}
</style>
