<template>
  <div class="node-item ml-4 mt-2 border-l-2 border-gray-100 pl-4 transition-all">
    <div class="flex items-center group">
      <div class="flex-1 flex items-center bg-white/50 backdrop-blur-sm border border-gray-200 rounded-lg px-3 py-2 hover:border-blue-400 hover:shadow-sm transition-all">
        <input 
          v-model="node.text" 
          class="bg-transparent border-none outline-none text-gray-800 text-sm flex-1"
          placeholder="节点内容..."
        />
        
        <div class="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            @click="$emit('expand', node)" 
            :disabled="node.isLoading"
            class="p-1 hover:bg-blue-50 rounded text-blue-500 disabled:text-gray-300 transition-colors"
            title="AI 分解"
          >
            <Sparkles v-if="!node.isLoading" :size="16" />
            <Loader2 v-else :size="16" class="animate-spin" />
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
        @expand="(n) => $emit('expand', n)"
        @add-child="(n) => $emit('add-child', n)"
        @delete="(n) => $emit('delete', n)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { Sparkles, Plus, Trash2, Loader2 } from 'lucide-vue-next';
import type { MindNode as MindNodeType } from '../types';

defineProps<{
  node: MindNodeType
}>();

defineEmits(['expand', 'add-child', 'delete']);
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
