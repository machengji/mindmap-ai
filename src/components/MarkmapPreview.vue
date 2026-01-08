<template>
  <div 
    class="markmap-container w-full h-full relative bg-white rounded-xl overflow-hidden border border-gray-100 shadow-inner transition-all duration-300"
    :class="{ 'landscape-mode': isLandscape }"
  >
    <svg ref="svgRef" class="w-full h-full"></svg>
    <div class="absolute bottom-4 right-4 flex gap-2">
      <button 
        @click="toggleLandscape" 
        class="p-2 bg-white/80 backdrop-blur border border-gray-200 rounded-full shadow-sm hover:bg-white transition-all text-gray-600"
        :title="isLandscape ? '退出横屏' : '横屏查看'"
      >
        <Minimize2 v-if="isLandscape" :size="18" />
        <RotateCw v-else :size="18" />
      </button>
      <button 
        @click="fitView" 
        class="p-2 bg-white/80 backdrop-blur border border-gray-200 rounded-full shadow-sm hover:bg-white transition-all"
        title="适应窗口"
      >
        <Maximize :size="18" class="text-gray-600" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onUnmounted, nextTick } from 'vue';
import { Transformer } from 'markmap-lib';
import { Markmap } from 'markmap-view';
import { Maximize, RotateCw, Minimize2 } from 'lucide-vue-next';

const props = defineProps<{
  markdown: string
}>();

const svgRef = ref<SVGElement | null>(null);
const isLandscape = ref(false);
let mm: Markmap | null = null;
const transformer = new Transformer();

const updateMarkmap = () => {
  if (!svgRef.value) return;
  
  const { root } = transformer.transform(props.markdown);
  
  if (!mm) {
    mm = Markmap.create(svgRef.value, {
      autoFit: true,
      duration: 500,
    }, root);
  } else {
    mm.setData(root);
    mm.fit();
  }
};

const fitView = () => {
  if (mm) mm.fit();
};

const toggleLandscape = async () => {
  isLandscape.value = !isLandscape.value;
  await nextTick();
  setTimeout(() => {
    if (mm) mm.fit();
  }, 300);
};

watch(() => props.markdown, () => {
  updateMarkmap();
}, { deep: true });

onMounted(() => {
  updateMarkmap();
  window.addEventListener('resize', fitView);
});

onUnmounted(() => {
  window.removeEventListener('resize', fitView);
});
</script>

<style>
.markmap-container svg {
  width: 100%;
  height: 100%;
}

.landscape-mode {
  position: fixed !important;
  top: 0;
  left: 0;
  width: 100vh !important;
  height: 100vw !important;
  z-index: 9999;
  transform: rotate(90deg);
  transform-origin: top left;
  left: 100vw;
  border-radius: 0 !important;
}

/* 自定义 markmap 样式 */
.markmap-node {
  cursor: pointer;
}

.markmap-node-text {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 14px;
}
</style>
