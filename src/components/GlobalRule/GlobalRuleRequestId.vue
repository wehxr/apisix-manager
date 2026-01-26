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
          此插件为每个通过 APISIX 代理的请求添加一个唯一 ID，可用于跟踪 API 请求。
          如果请求在 header_name 对应的 header 中带有 ID，则插件将使用 header 值作为唯一 ID，而不会用自动生成的 ID 进行覆盖。
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="localEnabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="localEnabled">
      <el-form-item label="Header 名称">
        <el-input
          :model-value="headerName"
          @update:model-value="handleHeaderNameChange"
          placeholder="X-Request-Id"
        />
        <div class="form-tip">携带请求唯一 ID 的标头的名称，默认：X-Request-Id</div>
      </el-form-item>
      <el-form-item label="包含在响应中">
        <el-switch
          :model-value="includeInResponse"
          @update:model-value="handleIncludeInResponseChange"
        />
        <div class="form-tip">如果为 true，则将生成的请求 ID 包含在响应标头中，默认：true</div>
      </el-form-item>
      <el-form-item label="生成算法">
        <el-select
          :model-value="algorithm"
          @update:model-value="handleAlgorithmChange"
          style="width: 100%"
        >
          <el-option label="UUID" value="uuid" />
          <el-option label="NanoID" value="nanoid" />
          <el-option label="Range ID" value="range_id" />
          <el-option label="KSUID" value="ksuid" />
        </el-select>
        <div class="form-tip">用于生成唯一 ID 的算法，默认：uuid</div>
      </el-form-item>
      <template v-if="algorithm === 'range_id'">
        <el-form-item label="字符集">
          <el-input
            :model-value="rangeIdCharSet"
            @update:model-value="handleRangeIdCharSetChange"
            placeholder="abcdefghijklmnopqrstuvwxyzABCDEFGHIGKLMNOPQRSTUVWXYZ0123456789"
          />
          <div class="form-tip">用于 range_id 算法的字符集，最小长度 6，默认：abcdefghijklmnopqrstuvwxyzABCDEFGHIGKLMNOPQRSTUVWXYZ0123456789</div>
        </el-form-item>
        <el-form-item label="ID 长度">
          <el-input-number
            :model-value="rangeIdLength"
            @update:model-value="handleRangeIdLengthChange"
            :min="6"
            style="width: 100%"
          />
          <div class="form-tip">用于 range_id 算法的生成的 ID 的长度，最小 6，默认：16</div>
        </el-form-item>
      </template>
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

// 从 plugins 中提取 request-id 配置
const requestIdPlugin = computed(() => props.modelValue.plugins?.['request-id'] || {})

// 计算 enabled 状态
const enabled = computed(() => isPluginEnabled(requestIdPlugin.value))

// 计算各个配置项
const headerName = computed(() => {
  if (!enabled.value) return 'X-Request-Id'
  return requestIdPlugin.value.header_name ?? 'X-Request-Id'
})

const includeInResponse = computed(() => {
  if (!enabled.value) return true
  return requestIdPlugin.value.include_in_response ?? true
})

const algorithm = computed(() => {
  if (!enabled.value) return 'uuid'
  return requestIdPlugin.value.algorithm ?? 'uuid'
})

const rangeIdCharSet = computed(() => {
  if (!enabled.value || algorithm.value !== 'range_id') return 'abcdefghijklmnopqrstuvwxyzABCDEFGHIGKLMNOPQRSTUVWXYZ0123456789'
  return requestIdPlugin.value.range_id?.char_set ?? 'abcdefghijklmnopqrstuvwxyzABCDEFGHIGKLMNOPQRSTUVWXYZ0123456789'
})

const rangeIdLength = computed(() => {
  if (!enabled.value || algorithm.value !== 'range_id') return 16
  return requestIdPlugin.value.range_id?.length ?? 16
})

// 内部状态
const localEnabled = ref(enabled.value)

// 监听 props 变化，更新内部状态
watch(enabled, (newEnabled) => {
  localEnabled.value = newEnabled
}, { immediate: true })

// 监听内部状态变化，更新到父组件
watch(localEnabled, (newEnabled) => {
  const currentPlugins = { ...(props.modelValue.plugins || {}) }
  
  if (newEnabled) {
    currentPlugins['request-id'] = {
      header_name: headerName.value,
      include_in_response: includeInResponse.value,
      algorithm: algorithm.value
    }
    
    if (algorithm.value === 'range_id') {
      currentPlugins['request-id'].range_id = {
        char_set: rangeIdCharSet.value,
        length: rangeIdLength.value
      }
    }
    
    setPluginEnabled(currentPlugins['request-id'], true)
  } else {
    currentPlugins['request-id'] = currentPlugins['request-id'] || {}
    setPluginEnabled(currentPlugins['request-id'], false)
  }
  
  emit('update:modelValue', {
    ...props.modelValue,
    plugins: currentPlugins
  })
})

const handleEnableChange = (value) => {
  localEnabled.value = value
}

const handleHeaderNameChange = (value) => {
  const currentPlugins = { ...(props.modelValue.plugins || {}) }
  
  currentPlugins['request-id'] = {
    ...requestIdPlugin.value,
    header_name: value || 'X-Request-Id'
  }
  setPluginEnabled(currentPlugins['request-id'], enabled.value)
  
  emit('update:modelValue', {
    ...props.modelValue,
    plugins: currentPlugins
  })
}

const handleIncludeInResponseChange = (value) => {
  const currentPlugins = { ...(props.modelValue.plugins || {}) }
  
  currentPlugins['request-id'] = {
    ...requestIdPlugin.value,
    include_in_response: value
  }
  setPluginEnabled(currentPlugins['request-id'], enabled.value)
  
  emit('update:modelValue', {
    ...props.modelValue,
    plugins: currentPlugins
  })
}

const handleAlgorithmChange = (value) => {
  const currentPlugins = { ...(props.modelValue.plugins || {}) }
  
  const newConfig = {
    ...requestIdPlugin.value,
    algorithm: value
  }
  
  // 如果切换到 range_id，添加 range_id 配置
  if (value === 'range_id') {
    newConfig.range_id = {
      char_set: rangeIdCharSet.value,
      length: rangeIdLength.value
    }
  } else {
    // 如果切换到其他算法，删除 range_id 配置
    delete newConfig.range_id
  }
  
  currentPlugins['request-id'] = newConfig
  setPluginEnabled(currentPlugins['request-id'], enabled.value)
  
  emit('update:modelValue', {
    ...props.modelValue,
    plugins: currentPlugins
  })
}

const handleRangeIdCharSetChange = (value) => {
  const currentPlugins = { ...(props.modelValue.plugins || {}) }
  
  currentPlugins['request-id'] = {
    ...requestIdPlugin.value,
    range_id: {
      ...(requestIdPlugin.value.range_id || {}),
      char_set: value || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIGKLMNOPQRSTUVWXYZ0123456789'
    }
  }
  setPluginEnabled(currentPlugins['request-id'], enabled.value)
  
  emit('update:modelValue', {
    ...props.modelValue,
    plugins: currentPlugins
  })
}

const handleRangeIdLengthChange = (value) => {
  const currentPlugins = { ...(props.modelValue.plugins || {}) }
  
  currentPlugins['request-id'] = {
    ...requestIdPlugin.value,
    range_id: {
      ...(requestIdPlugin.value.range_id || {}),
      length: value || 16
    }
  }
  setPluginEnabled(currentPlugins['request-id'], enabled.value)
  
  emit('update:modelValue', {
    ...props.modelValue,
    plugins: currentPlugins
  })
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
