<template>
  <div class="labels-input">
    <div class="labels-list">
      <div
        v-for="(item, index) in labelsList"
        :key="index"
        class="label-item"
      >
        <el-input
          v-model="item.key"
          placeholder="键"
          size="small"
          class="label-key"
          @input="handleChange"
        />
        <span class="label-separator">:</span>
        <el-input
          v-model="item.value"
          placeholder="值"
          size="small"
          class="label-value"
          @input="handleChange"
        />
        <el-button
          type="danger"
          :icon="Delete"
          size="small"
          circle
          class="label-delete"
          @click="removeLabel(index)"
        />
      </div>
    </div>
    <el-button
      type="primary"
      :icon="Plus"
      size="small"
      text
      @click="addLabel"
      class="add-label-btn"
    >
      添加标签
    </el-button>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({})
  }
})

const emit = defineEmits(['update:modelValue'])

const labelsList = ref([])

// 将对象转换为列表格式
const parseLabels = (labels) => {
  if (!labels || typeof labels !== 'object' || Object.keys(labels).length === 0) {
    return []
  }
  return Object.entries(labels).map(([key, value]) => ({
    key: key || '',
    value: value || ''
  }))
}

// 将列表格式转换为对象
const formatLabels = (list) => {
  const labels = {}
  list.forEach(item => {
    if (item.key && item.key.trim()) {
      labels[item.key.trim()] = item.value || ''
    }
  })
  return Object.keys(labels).length > 0 ? labels : undefined
}

// 初始化标签列表
const initLabels = () => {
  labelsList.value = parseLabels(props.modelValue)
  if (labelsList.value.length === 0) {
    labelsList.value = [{ key: '', value: '' }]
  }
}

// 添加标签
const addLabel = () => {
  labelsList.value.push({ key: '', value: '' })
}

// 删除标签
const removeLabel = (index) => {
  labelsList.value.splice(index, 1)
  if (labelsList.value.length === 0) {
    labelsList.value = [{ key: '', value: '' }]
  }
  handleChange()
}

// 处理变化
const handleChange = () => {
  const labels = formatLabels(labelsList.value)
  emit('update:modelValue', labels)
}

// 监听外部值变化
watch(() => props.modelValue, (newVal) => {
  const currentLabels = formatLabels(labelsList.value)
  const newLabels = newVal || {}
  
  // 只有当值真正改变时才更新
  if (JSON.stringify(currentLabels) !== JSON.stringify(newLabels)) {
    initLabels()
  }
}, { deep: true })

onMounted(() => {
  initLabels()
})
</script>

<style scoped>
.labels-input {
  width: 100%;
}

.labels-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 8px;
}

.label-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.label-key {
  flex: 1;
  min-width: 0;
}

.label-separator {
  color: #909399;
  font-weight: 500;
  flex-shrink: 0;
}

.label-value {
  flex: 1;
  min-width: 0;
}

.label-delete {
  flex-shrink: 0;
}

.add-label-btn {
  width: 100%;
  justify-content: center;
  border: 1px dashed #dcdfe6;
  color: #606266;
}

.add-label-btn:hover {
  border-color: #409eff;
  color: #409eff;
}
</style>