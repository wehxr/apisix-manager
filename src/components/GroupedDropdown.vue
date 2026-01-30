<template>
  <el-dropdown
    ref="dropdownRef"
    trigger="click"
    placement="bottom"
    popper-class="grouped-dropdown-popper"
  >
    <slot />
    <template #dropdown>
      <div class="grouped-dropdown" @click.stop>
        <template v-for="(g, i) in grouped" :key="g.groupKey ?? i">
          <div
            class="grouped-dropdown__group"
            :class="{ 'is-expanded': selectedGroupKey === g.groupKey }"
            @click.stop="toggleGroup(g.groupKey)"
          >
            <span class="grouped-dropdown__title">{{ g.groupName }}</span>
            <el-icon class="grouped-dropdown__chevron">
              <ArrowDown v-if="selectedGroupKey === g.groupKey" />
              <ArrowRight v-else />
            </el-icon>
          </div>
          <transition name="grouped-dropdown-expand">
            <div v-show="selectedGroupKey === g.groupKey" class="grouped-dropdown__body">
              <div
                v-for="pluginKey in g.plugins"
                :key="pluginKey"
                class="grouped-dropdown__item"
                @click.stop="onSelect(pluginKey)"
              >
                {{ PLUGIN_NAMES[pluginKey] }}
              </div>
            </div>
          </transition>
          <div v-if="i < grouped.length - 1" class="grouped-dropdown__divider" />
        </template>
      </div>
    </template>
  </el-dropdown>
</template>

<script setup>
import { ref } from 'vue'
import { ArrowRight, ArrowDown } from '@element-plus/icons-vue'
import { PLUGIN_NAMES } from '@/utils/plugin'

defineProps({
  grouped: { type: Array, default: () => [] }
})

const emit = defineEmits(['command'])

const dropdownRef = ref(null)
const selectedGroupKey = ref('')

function toggleGroup(key) {
  selectedGroupKey.value = selectedGroupKey.value === key ? '' : key
}

function onSelect(pluginKey) {
  dropdownRef.value?.blur?.()
  emit('command', pluginKey)
}
</script>

<style scoped>
.grouped-dropdown {
  min-width: 150px;
  max-width: 280px;
  background: var(--el-bg-color-overlay);
  box-shadow: var(--el-box-shadow-light);
  border-radius: var(--el-border-radius-base);
}

.grouped-dropdown__group {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  cursor: pointer;
  font-size: 14px;
  color: var(--el-text-color-regular);
}
.grouped-dropdown__group:hover {
  background: var(--el-fill-color-light);
}
.grouped-dropdown__group.is-expanded {
  color: var(--el-color-primary);
  background: var(--el-fill-color);
}

.grouped-dropdown__title { flex: 1; }
.grouped-dropdown__chevron {
  font-size: 12px;
  margin-left: 8px;
  color: var(--el-text-color-secondary);
}
.grouped-dropdown__body {
  padding: 0 12px 8px;
  max-height: 200px;
  overflow-y: auto;
  overflow-x: hidden;
}
.grouped-dropdown__body::-webkit-scrollbar { width: 6px; }
.grouped-dropdown__body::-webkit-scrollbar-thumb {
  background: var(--el-border-color-darker);
  border-radius: 3px;
}
.grouped-dropdown__body::-webkit-scrollbar-thumb:hover {
  background: var(--el-text-color-placeholder);
}

.grouped-dropdown__item {
  padding: 6px 12px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  border-radius: var(--el-border-radius-small);
}
.grouped-dropdown__item:hover {
  background: var(--el-fill-color-light);
}

.grouped-dropdown__divider {
  height: 1px;
  margin: 0 12px;
  background: var(--el-border-color-lighter);
}

.grouped-dropdown-expand-enter-active,
.grouped-dropdown-expand-leave-active {
  transition: max-height 0.28s ease-out, opacity 0.22s ease;
  overflow: hidden;
}
.grouped-dropdown-expand-enter-from,
.grouped-dropdown-expand-leave-to {
  max-height: 0;
  opacity: 0;
}
.grouped-dropdown-expand-enter-to,
.grouped-dropdown-expand-leave-from {
  max-height: 200px;
  opacity: 1;
}
</style>

