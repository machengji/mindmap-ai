<template>
  <div class="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900">
    <!-- Header -->
    <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 sticky top-0 z-30">
      <div class="flex items-center gap-3">
        <div class="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
          <BrainCircuit class="text-white" :size="24" />
        </div>
        <h1 class="text-xl font-bold tracking-tight">Generative <span class="text-blue-600">Mindmap</span></h1>
      </div>
      
      <div class="flex items-center gap-3">
        <div class="relative group">
          <input 
            v-model="apiKeyValue"
            type="password"
            placeholder="DeepSeek API Key"
            class="w-40 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:w-64 transition-all outline-none focus:border-blue-400"
            @change="updateApiKey"
          />
          <div class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            <Key :size="14" />
          </div>
        </div>
        <button 
          @click="handleExport"
          class="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all"
        >
          <Download :size="16" />
          导出 Markdown
        </button>
        <button 
          @click="resetTree"
          class="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all shadow-md"
        >
          <RotateCcw :size="16" />
          重置
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 flex overflow-hidden">
      <!-- Left: Editor -->
      <aside class="w-1/3 border-r border-slate-200 bg-white flex flex-col">
        <div class="p-4 border-b border-slate-100 bg-slate-50/50">
          <h2 class="text-xs font-bold uppercase tracking-wider text-slate-400">结构编辑器</h2>
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
      <section class="flex-1 bg-slate-50 p-6 flex flex-col gap-4">
        <div class="flex items-center justify-between">
          <h2 class="text-sm font-semibold text-slate-500 flex items-center gap-2">
            <Eye :size="16" />
            实时预览
          </h2>
          <div class="text-[10px] px-2 py-1 bg-blue-100 text-blue-700 rounded-full font-bold uppercase tracking-tighter">
            Auto-Syncing
          </div>
        </div>
        
        <div class="flex-1 min-h-0">
          <MarkmapPreview :markdown="markdownContent" />
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { BrainCircuit, Download, RotateCcw, Eye, Key } from 'lucide-vue-next';
import MindNode from './components/MindNode.vue';
import MarkmapPreview from './components/MarkmapPreview.vue';
import type { MindNode as MindNodeType } from './types';
import { jsonToMarkdown, downloadMarkdown } from './utils/markdown';
import { fetchAIExpansion, setApiKey, getApiKey } from './services/ai';

const apiKeyValue = ref(getApiKey());
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
