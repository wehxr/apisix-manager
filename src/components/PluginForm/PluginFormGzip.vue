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
          此插件用于启用 HTTP 响应压缩功能。可以显著减少响应体的大小，提高传输效率，节省带宽。
          支持配置压缩级别、最小响应大小、压缩类型等参数，可以针对不同的内容类型进行选择性压缩。
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="localEnabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="localEnabled">
      <el-form-item label="压缩级别" required>
        <el-input-number
          :model-value="compLevel"
          @update:model-value="handleCompLevelChange"
          :min="1"
          :max="9"
          style="width: 100%"
        />
        <div class="form-tip">动态设置 gzip_comp_level 指令，压缩级别 1-9，数字越大压缩率越高但消耗 CPU 越多，默认 9</div>
      </el-form-item>
      <el-form-item label="最小响应大小（字节）" required>
        <el-input-number
          :model-value="minLength"
          @update:model-value="handleMinLengthChange"
          :min="1"
          style="width: 100%"
        />
        <div class="form-tip">动态设置 gzip_min_length 指令，只有响应体大小超过此值才进行压缩，单位：字节，默认 1024 (1k)</div>
      </el-form-item>
      <el-form-item label="压缩类型" required>
        <el-input
          :model-value="typesInput"
          @update:model-value="handleTypesInput"
          @blur="handleBlur"
          placeholder="多个类型用逗号分隔，如: text/html, text/css, application/json，或输入 * 表示所有类型"
        />
        <div class="form-tip">需要压缩的 MIME 类型，多个类型用逗号分隔，输入 * 表示匹配任何 MIME 类型，默认包含 text/*, text/plain, text/css, application/javascript 等</div>
      </el-form-item>
      <el-form-item label="HTTP 版本" required>
        <el-radio-group :model-value="httpVersion" @update:model-value="handleHttpVersionChange">
          <el-radio :label="1.0">HTTP/1.0</el-radio>
          <el-radio :label="1.1">HTTP/1.1</el-radio>
        </el-radio-group>
        <div class="form-tip">动态设置 gzip_http_version 指令，默认 1.0</div>
      </el-form-item>
      <el-form-item label="缓冲区数量" required>
        <el-input-number
          :model-value="buffers.number"
          @update:model-value="handleBuffersNumberChange"
          :min="1"
          style="width: 100%"
        />
        <div class="form-tip">动态设置 gzip_buffers 指令的 number 参数，默认 4</div>
      </el-form-item>
      <el-form-item label="缓冲区大小（字节）" required>
        <el-input-number
          :model-value="buffers.size"
          @update:model-value="handleBuffersSizeChange"
          :min="1"
          style="width: 100%"
        />
        <div class="form-tip">动态设置 gzip_buffers 指令的 size 参数，单位：字节，默认 16384 (16k)</div>
      </el-form-item>
      <el-form-item label="Vary 头">
        <el-switch
          :model-value="vary"
          @update:model-value="handleVaryChange"
        />
        <div class="form-tip">动态设置 gzip_vary 指令，当设置为 true 时，在响应头中添加 Vary: Accept-Encoding</div>
      </el-form-item>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { isPluginEnabled, setPluginEnabled } from '@/utils/plugin'
import { usePluginConfig } from '@/composables/usePluginConfig'

const props = defineProps({
  modelValue: {
    type: Object,
    default: () => ({
      plugin_config_id: null
    })
  }
})

const emit = defineEmits(['update:modelValue'])

// 使用 composable 加载和管理 Plugin Config
const { plugins, updatePlugins } = usePluginConfig(props, emit)

// 从 plugins 中提取 gzip 配置
const gzipPlugin = computed(() => plugins.value['gzip'] || {})

// 计算 enabled 状态
const enabled = computed(() => isPluginEnabled(gzipPlugin.value))

// 计算各个字段
const types = computed(() => {
  if (!enabled.value) return []
  return gzipPlugin.value.types || ['text/*', 'text/plain', 'text/css', 'application/javascript', 'application/x-javascript', 'text/xml', 'application/xml', 'application/xml+rss']
})

const minLength = computed(() => {
  return gzipPlugin.value.min_length !== undefined ? gzipPlugin.value.min_length : 1024
})

const httpVersion = computed(() => {
  return gzipPlugin.value.http_version !== undefined ? gzipPlugin.value.http_version : 1.1
})

const compLevel = computed(() => {
  return gzipPlugin.value.comp_level !== undefined ? gzipPlugin.value.comp_level : 9
})

const buffers = computed(() => {
  return {
    number: gzipPlugin.value.buffers?.number !== undefined ? gzipPlugin.value.buffers.number : 4,
    size: gzipPlugin.value.buffers?.size !== undefined ? gzipPlugin.value.buffers.size : 16384
  }
})

const vary = computed(() => {
  return gzipPlugin.value.vary !== undefined ? gzipPlugin.value.vary : true
})

// 内部状态
const localEnabled = ref(enabled.value)

const typesInput = ref(
  types.value === '*'
    ? '*'
    : Array.isArray(types.value)
      ? types.value.join(', ')
      : ''
)

// 监听 props 变化，更新内部状态
watch([enabled, types], ([newEnabled, newTypes]) => {
  localEnabled.value = newEnabled
  typesInput.value = newTypes === '*'
    ? '*'
    : Array.isArray(newTypes)
      ? newTypes.join(', ')
      : ''
}, { immediate: true })

// 监听内部状态变化，更新到父组件
watch(localEnabled, (newEnabled) => {
  const currentPlugins = { ...plugins.value }
  
  if (newEnabled) {
    currentPlugins['gzip'] = {
      types: types.value.length > 0 ? types.value : ['text/*', 'text/plain', 'text/css', 'application/javascript', 'application/x-javascript', 'text/xml', 'application/xml', 'application/xml+rss'],
      min_length: minLength.value,
      http_version: httpVersion.value,
      comp_level: compLevel.value,
      buffers: {
        number: buffers.value.number,
        size: buffers.value.size
      },
      vary: vary.value
    }
    setPluginEnabled(currentPlugins['gzip'], true)
  } else {
    currentPlugins['gzip'] = currentPlugins['gzip'] || {}
    setPluginEnabled(currentPlugins['gzip'], false)
  }
  
  updatePlugins(currentPlugins)
})

const handleEnableChange = (value) => {
  localEnabled.value = value
}

const handleCompLevelChange = (value) => {
  const currentPlugins = { ...plugins.value }
  
  currentPlugins['gzip'] = {
    ...gzipPlugin.value,
    comp_level: value
  }
  setPluginEnabled(currentPlugins['gzip'], enabled.value)
  
  updatePlugins(currentPlugins)
}

const handleTypesInput = (value) => {
  typesInput.value = value
}

const handleMinLengthChange = (value) => {
  const currentPlugins = { ...plugins.value }
  
  currentPlugins['gzip'] = {
    ...gzipPlugin.value,
    min_length: value
  }
  setPluginEnabled(currentPlugins['gzip'], enabled.value)
  
  updatePlugins(currentPlugins)
}

const handleHttpVersionChange = (value) => {
  const currentPlugins = { ...plugins.value }
  
  currentPlugins['gzip'] = {
    ...gzipPlugin.value,
    http_version: value
  }
  setPluginEnabled(currentPlugins['gzip'], enabled.value)
  
  updatePlugins(currentPlugins)
}

const handleBuffersNumberChange = (value) => {
  const currentPlugins = { ...plugins.value }
  
  currentPlugins['gzip'] = {
    ...gzipPlugin.value,
    buffers: {
      ...buffers.value,
      number: value
    }
  }
  setPluginEnabled(currentPlugins['gzip'], enabled.value)
  
  updatePlugins(currentPlugins)
}

const handleBuffersSizeChange = (value) => {
  const currentPlugins = { ...plugins.value }
  
  currentPlugins['gzip'] = {
    ...gzipPlugin.value,
    buffers: {
      ...buffers.value,
      size: value
    }
  }
  setPluginEnabled(currentPlugins['gzip'], enabled.value)
  
  updatePlugins(currentPlugins)
}

const handleVaryChange = (value) => {
  const currentPlugins = { ...plugins.value }
  
  currentPlugins['gzip'] = {
    ...gzipPlugin.value,
    vary: value
  }
  setPluginEnabled(currentPlugins['gzip'], enabled.value)
  
  updatePlugins(currentPlugins)
}

const handleBlur = () => {
  const currentPlugins = { ...plugins.value }
  
  if (typesInput.value && typesInput.value.trim()) {
    const trimmed = typesInput.value.trim()
    // 支持特殊值 "*" 表示匹配任何 MIME 类型
    if (trimmed === '*') {
      currentPlugins['gzip'] = {
        ...gzipPlugin.value,
        types: '*'
      }
    } else {
      const typesArray = trimmed.split(',').map(s => s.trim()).filter(s => s)
      currentPlugins['gzip'] = {
        ...gzipPlugin.value,
        types: typesArray
      }
    }
  } else {
    currentPlugins['gzip'] = {
      ...gzipPlugin.value,
      types: []
    }
  }
  setPluginEnabled(currentPlugins['gzip'], enabled.value)
  
  updatePlugins(currentPlugins)
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