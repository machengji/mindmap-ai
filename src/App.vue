<template>
  <div class="h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900 overflow-hidden">
    <!-- Header -->
    <header class="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30 shrink-0">
      <div class="flex items-center gap-2 md:gap-3">
        <div class="w-8 h-8 md:w-10 md:h-10 bg-blue-600 rounded-lg md:rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
          <BrainCircuit class="text-white" :size="20" />
        </div>
        <div>
          <h1 class="text-lg font-bold tracking-tight flex items-center gap-2">
            <span class="text-blue-600 hidden sm:inline">Mindmap AI</span>
            <span class="text-slate-400 text-sm font-normal hidden md:inline">|</span>
            <span class="text-sm font-medium text-slate-600 truncate max-w-[150px]" :title="projectName">{{ projectName }}</span>
          </h1>
        </div>
      </div>
      
      <div class="flex items-center gap-2 md:gap-3">
        <!-- File Actions -->
        <div class="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button @click="handleNewProject" class="p-1.5 hover:bg-white hover:text-blue-600 rounded text-slate-500 transition-all" title="新建项目">
                <FilePlus :size="18" />
            </button>
            <button @click="handleOpenFile" class="p-1.5 hover:bg-white hover:text-blue-600 rounded text-slate-500 transition-all" title="打开本地项目">
                <FolderOpen :size="18" />
            </button>
            <button @click="handleSaveFile" class="p-1.5 hover:bg-white hover:text-blue-600 rounded text-slate-500 transition-all" title="保存到本地 (Ctrl+S)">
                <Save :size="18" />
            </button>
        </div>

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
          <span class="hidden md:inline">导出</span>
        </button>
        <!-- History Records -->
        <div class="relative">
          <button 
            @click="loadHistory"
            class="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-all"
            :class="{ 'border-blue-500 text-blue-600': showHistory }"
          >
            <History :size="16" />
            <span class="hidden md:inline">历史</span>
          </button>

          <!-- History Dropdown -->
          <div v-if="showHistory" class="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden">
            <div class="p-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">最近保存</span>
              <button @click="showHistory = false" class="text-slate-400 hover:text-slate-600">
                <RotateCcw :size="12" class="rotate-45" />
              </button>
            </div>
            <div class="max-h-80 overflow-y-auto custom-scrollbar">
              <div v-if="historyList.length === 0" class="p-8 text-center text-slate-400 text-xs">
                暂无历史记录
              </div>
              <button 
                v-for="item in historyList" 
                :key="item.id"
                @click="selectHistory(item)"
                class="w-full p-3 text-left hover:bg-slate-50 border-b border-slate-50 last:border-0 transition-colors group"
              >
                <div class="text-sm font-medium text-slate-700 group-hover:text-blue-600 truncate">{{ item.title }}</div>
                <div class="flex items-center gap-1 mt-1 text-[10px] text-slate-400">
                  <Clock :size="10" />
                  {{ new Date(item.createdAt).toLocaleString() }}
                </div>
              </button>
            </div>
          </div>
        </div>

        <button 
          @click="resetTree"
          class="flex items-center gap-2 px-3 py-2 md:px-4 md:py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-800 transition-all shadow-md"
        >
          <RotateCcw :size="16" />
          <span class="hidden md:inline">重置</span>
        </button>
      </div>
    </header>

    <!-- Main Content -->
    <main class="flex-1 relative overflow-hidden">
      <!-- Mobile API Key Input Overlay -->
      <div v-if="!apiKeyValue" class="md:hidden absolute top-0 left-0 w-full z-20 p-2 bg-yellow-50 border-b border-yellow-100 text-yellow-800 text-xs flex items-center justify-between">
        <span>请输入 API Key 以使用 AI 功能</span>
        <Key :size="14" />
      </div>

      <MindMapCanvas 
        v-if="rootNode"
        :initial-data="rootNode"
        @update:data="handleDataUpdate"
        @save="syncToCloud"
      />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { BrainCircuit, Download, RotateCcw, Key, Cloud, CloudCheck, Loader2, History, Clock, FilePlus, FolderOpen, Save } from 'lucide-vue-next';
import MindMapCanvas from './components/MindMapCanvas.vue';
import type { MindNode as MindNodeType } from './types';
import { jsonToMarkdown, downloadMarkdown } from './utils/markdown';
import { setApiKey, getApiKey } from './services/ai';
import { saveMindmap, loadMindmap, fetchHistory, saveApiKey, loadApiKey } from './services/storage';
import { openLocalFile, saveLocalFile, newLocalProject, getCurrentFileName } from './services/fileSystem';

const apiKeyValue = ref(getApiKey());
const isSyncing = ref(false);
const lastSaved = ref<Date | null>(null);
const showHistory = ref(false);
const historyList = ref<any[]>([]);
const projectName = ref('未命名项目');

const createNode = (text: string): MindNodeType => ({
  id: Math.random().toString(36).substr(2, 9),
  text,
  children: [],
  isExpanded: true,
  isLoading: false
});

const rootNode = ref<MindNodeType | null>(null);

const updateApiKey = async () => {
  setApiKey(apiKeyValue.value);
  await saveApiKey(apiKeyValue.value);
};

// ... (History related functions keep same) ...
const loadHistory = async () => {
  showHistory.value = !showHistory.value;
  if (showHistory.value) {
    historyList.value = await fetchHistory(15);
  }
};

const selectHistory = (item: any) => {
  if (confirm(`确定要恢复到历史版本 "${item.title}" (${new Date(item.createdAt).toLocaleString()}) 吗？当前未保存的更改将丢失。`)) {
    rootNode.value = null; // Force re-render
    setTimeout(() => {
        rootNode.value = JSON.parse(item.content);
        showHistory.value = false;
    }, 50);
  }
};

// 本地文件系统操作
const handleNewProject = () => {
  if (confirm('新建项目将清空当前画布，确定继续吗？')) {
    newLocalProject();
    rootNode.value = null;
    projectName.value = '未命名项目';
    setTimeout(() => {
      rootNode.value = createNode('中心主题');
    }, 50);
  }
};

const handleOpenFile = async () => {
  const result = await openLocalFile();
  if (result) {
    rootNode.value = null;
    projectName.value = result.name;
    setTimeout(() => {
      rootNode.value = result.content;
      // 也可以顺便保存到云端作为备份
      syncToCloud();
    }, 50);
  }
};

const handleSaveFile = async () => {
  if (!rootNode.value) return;
  const success = await saveLocalFile(rootNode.value);
  if (success) {
    projectName.value = getCurrentFileName();
    lastSaved.value = new Date();
  }
};

// 键盘快捷键监听
const handleKeydown = (e: KeyboardEvent) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 's') {
    e.preventDefault();
    handleSaveFile();
  }
};

// 云端同步逻辑
const syncToCloud = async () => {
  if (!rootNode.value) return;
  isSyncing.value = true;
  await saveMindmap(rootNode.value);
  lastSaved.value = new Date();
  isSyncing.value = false;
};

const handleDataUpdate = (newData: MindNodeType) => {
  rootNode.value = newData;
};

onMounted(async () => {
  window.addEventListener('keydown', handleKeydown);

  // 加载 API Key
  const cloudApiKey = await loadApiKey();
  if (cloudApiKey) {
    apiKeyValue.value = cloudApiKey;
    setApiKey(cloudApiKey);
  }

  const savedData = await loadMindmap();
  if (savedData) {
    rootNode.value = savedData;
    lastSaved.value = new Date();
  } else {
    rootNode.value = createNode('Python学习路线');
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown);
});

const handleExport = async () => {
  if (!rootNode.value) return;
  await syncToCloud();
  const markdown = jsonToMarkdown(rootNode.value);
  downloadMarkdown(markdown, 'mindmap.md');
};

const resetTree = () => {
  if (confirm('确定要重置吗？所有更改都将丢失。')) {
    rootNode.value = null;
    setTimeout(() => {
        rootNode.value = createNode('Python学习路线');
    }, 50);
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
