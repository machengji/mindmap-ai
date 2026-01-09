<template>
  <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
    <!-- Overlay -->
    <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="$emit('close')"></div>
    
    <!-- Modal Content -->
    <div class="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
      <!-- Header -->
      <div class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100">
            <LayoutGrid class="text-white" :size="20" />
          </div>
          <div>
            <h2 class="text-lg font-bold text-slate-800">项目专区</h2>
            <p class="text-xs text-slate-500">管理您创建的所有思维导图</p>
          </div>
        </div>
        <button @click="$emit('close')" class="p-2 hover:bg-slate-100 rounded-full text-slate-400 transition-colors">
          <X :size="20" />
        </button>
      </div>

      <!-- Search Bar -->
      <div class="p-4 border-b border-slate-50">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" :size="16" />
          <input 
            v-model="searchQuery"
            type="text" 
            placeholder="搜索项目标题..." 
            class="w-full pl-10 pr-4 py-2.5 bg-slate-100 border-none rounded-xl text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
          />
        </div>
      </div>

      <!-- Projects List -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 custom-scrollbar">
        <div v-if="loading" class="flex flex-col items-center justify-center py-20 gap-3">
          <Loader2 class="animate-spin text-indigo-500" :size="32" />
          <p class="text-sm text-slate-400">加载项目中...</p>
        </div>

        <div v-else-if="filteredProjects.length === 0" class="flex flex-col items-center justify-center py-20 text-center">
          <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
            <FolderOpen class="text-slate-300" :size="32" />
          </div>
          <h3 class="text-slate-600 font-medium">未找到相关项目</h3>
          <p class="text-sm text-slate-400 mt-1">开始创建您的第一个思维导图吧</p>
        </div>

        <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div 
            v-for="project in filteredProjects" 
            :key="project.id"
            @click="selectProject(project)"
            class="group relative bg-white border border-slate-100 rounded-2xl p-4 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer"
          >
            <div class="flex items-start justify-between mb-3">
              <div class="w-10 h-10 bg-slate-50 group-hover:bg-indigo-50 rounded-lg flex items-center justify-center transition-colors">
                <BrainCircuit class="text-slate-400 group-hover:text-indigo-600" :size="20" />
              </div>
              <button 
                @click.stop="handleDelete(project)"
                class="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 :size="16" />
              </button>
            </div>
            
            <h3 class="font-bold text-slate-700 group-hover:text-indigo-600 truncate mb-1">{{ project.title }}</h3>
            <div class="flex items-center gap-1.5 text-[10px] text-slate-400">
              <Clock :size="12" />
              <span>更新于 {{ formatDate(project.updatedAt) }}</span>
            </div>

            <!-- Hover Badge -->
            <div class="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
              <div class="flex items-center gap-1 text-xs font-bold text-indigo-600">
                打开 <ChevronRight :size="14" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-slate-50 bg-slate-50/30 text-center">
        <p class="text-[10px] text-slate-400 uppercase tracking-widest font-bold">总计 {{ filteredProjects.length }} 个项目</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { X, Search, LayoutGrid, FolderOpen, Loader2, BrainCircuit, Clock, Trash2, ChevronRight } from 'lucide-vue-next';
import { fetchAllProjects, deleteHistoryItem } from '../services/storage';

const props = defineProps<{ isOpen: boolean }>();
const emit = defineEmits(['close', 'select']);

const loading = ref(true);
const searchQuery = ref('');
const projects = ref<any[]>([]);

const loadProjects = async () => {
  loading.value = true;
  projects.value = await fetchAllProjects();
  loading.value = false;
};

const filteredProjects = computed(() => {
  if (!searchQuery.value) return projects.value;
  const q = searchQuery.value.toLowerCase();
  return projects.value.filter(p => p.title.toLowerCase().includes(q));
});

const selectProject = (project: any) => {
  emit('select', project);
};

const handleDelete = async (project: any) => {
  if (confirm(`确定要删除项目 "${project.title}" 吗？此操作将删除该项目的所有记录。`)) {
    const success = await deleteHistoryItem(project.id);
    if (success) {
      projects.value = projects.value.filter(p => p.id !== project.id);
    }
  }
};

const formatDate = (date: Date) => {
  return new Date(date).toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

onMounted(loadProjects);
</script>
