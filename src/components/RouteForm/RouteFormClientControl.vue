<template>
  <div>
    <el-alert
      title="插件说明"
      type="info"
      :closable="false"
      style="margin-bottom: 20px;"
    >
      <template #default>
        <div style="font-size: 13px; line-height: 1.6;">
          此插件用于控制客户端请求行为，主要功能是限制客户端请求体的大小。
          可以防止过大的请求体导致服务器资源耗尽，保护上游服务免受恶意请求的影响。
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="localEnabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="localEnabled">
      <el-form-item label="最大请求体大小（字节）" required>
        <el-input-number
          :model-value="maxBodySize"
          @update:model-value="handleMaxBodySizeChange"
          :min="0"
          :max="1073741824"
          style="width: 100%"
        />
        <div class="form-tip">客户端请求体的最大大小，0 表示不限制，单位：字节（1MB = 1048576 字节）</div>
      </el-form-item>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { isPluginEnabled, setPluginEnabled } from '../../utils/plugin'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      plugins: {}
    })
  }
})

const emit = defineEmits(['update:modelValue'])

// 从 plugins 中提取 client-control 配置
const clientControlPlugin = computed(() => props.modelValue.plugins?.['client-control'] || {})

// 计算 enabled 状态
const enabled = computed(() => isPluginEnabled(clientControlPlugin.value))

// 计算 max_body_size（0 表示不限制，需用 ?? 区分 0 与未设置）
const maxBodySize = computed(() => {
  if (!enabled.value) return 0
  return clientControlPlugin.value.max_body_size ?? 1048576
})

// 内部状态
const localEnabled = ref(enabled.value)

// 监听 props 变化，更新内部状态
watch(enabled, (newEnabled) => {
  localEnabled.value = newEnabled
}, { immediate: true })

// 监听内部状态变化，更新到父组件
watch(localEnabled, (newEnabled) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  if (newEnabled) {
    currentConfig.plugins['client-control'] = {
      max_body_size: maxBodySize.value ?? 1048576
    }
    setPluginEnabled(currentConfig.plugins['client-control'], true)
  } else {
    currentConfig.plugins['client-control'] = currentConfig.plugins['client-control'] || {}
    currentConfig.plugins['client-control'].max_body_size = maxBodySize.value ?? 1048576
    setPluginEnabled(currentConfig.plugins['client-control'], false)
  }
  
  emit('update:modelValue', currentConfig)
})

const handleEnableChange = (value) => {
  localEnabled.value = value
}

const handleMaxBodySizeChange = (value) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  currentConfig.plugins['client-control'] = {
    ...clientControlPlugin.value,
    max_body_size: value
  }
  setPluginEnabled(currentConfig.plugins['client-control'], enabled.value)
  
  emit('update:modelValue', currentConfig)
}
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
  display: block; 
  width: 100%;
}
</style>