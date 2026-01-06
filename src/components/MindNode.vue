<template>
  <div class="node-item ml-2 md:ml-4 mt-2 border-l-2 border-gray-100 pl-2 md:pl-4 transition-all">
    <div class="flex items-center group">
      <div class="flex-1 flex items-center bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 hover:border-blue-400 hover:shadow-sm transition-all">
        <input 
          v-model="node.text" 
          class="bg-transparent border-none outline-none text-gray-800 text-sm flex-1"
          placeholder="节点内容..."
        />
        
        <div class="flex items-center gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
          <button 
            @click="handleExpand" 
            :disabled="node.isLoading"
            class="p-1.5 hover:bg-blue-50 rounded-lg text-blue-600 disabled:text-gray-300 transition-all group/btn"
            title="AI 分解"
          >
            <div v-if="!node.isLoading" class="relative flex items-center justify-center">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="group-hover/btn:rotate-90 transition-transform duration-500">
                <!-- 中心节点 -->
                <circle cx="12" cy="12" r="3" fill="currentColor" />
                <!-- 向四周发散的线条 -->
                <path d="M12 7V4M12 20v-3M7 12H4m16 0h-3" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                <path d="M15.5 8.5L18 6M6 18l2.5-2.5M15.5 15.5L18 18M6 6l2.5 2.5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
              </svg>
            </div>
            <Loader2 v-else :size="18" class="animate-spin" />
          </button>
          
          <button 
            @click="$emit('add-child', node)"
            class="p-1 hover:bg-green-50 rounded text-green-500 transition-colors"
            title="添加子节点"
          >
            <Plus :size="16" />
          </button>
          
          <button 
            @click="$emit('delete', node)"
            class="p-1 hover:bg-red-50 rounded text-red-500 transition-colors"
            title="删除节点"
          >
            <Trash2 :size="16" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="node.children.length" class="children-container mt-1">
      <MindNode 
        v-for="child in node.children" 
        :key="child.id" 
        :node="child"
        :parent-path="currentPath"
        @expand="(n, path) => $emit('expand', n, path)"
        @add-child="(n) => $emit('add-child', n)"
        @delete="(n) => $emit('delete', n)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Plus, Trash2, Loader2 } from 'lucide-vue-next';
import { computed } from 'vue';
import type { MindNode as MindNodeType } from '../types';

const props = defineProps<{
  node: MindNodeType,
  parentPath?: string[]
}>();

const emit = defineEmits(['expand', 'add-child', 'delete']);

const currentPath = computed(() => {
  const path = props.parentPath || [];
  return [...path, props.node.text];
});

const handleExpand = () => {
  emit('expand', props.node, currentPath.value);
};
</script>

<style scoped>
.node-item:last-child {
  border-left-color: transparent;
  position: relative;
}

.node-item:last-child::before {
  content: '';
  position: absolute;
  left: -2px;
  top: 0;
  height: 1.5rem;
  width: 2px;
  background: #f3f4f6;
}
</style>
