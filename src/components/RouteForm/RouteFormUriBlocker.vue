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
          此插件用于拦截和阻止匹配指定模式的请求 URI。可以配置多个正则表达式规则来阻止恶意请求或不需要的 URI。
          适用于防止 SQL 注入、路径遍历等攻击，或阻止访问特定的资源路径。
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="localEnabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="localEnabled">
      <el-form-item label="阻止规则" required>
        <el-input
          :model-value="blockRulesInput"
          @update:model-value="handleBlockRulesInput"
          @blur="handleBlur"
          type="textarea"
          :rows="4"
          placeholder="每行一个正则表达式，如:&#10;root.exe&#10;root.m+&#10;\.\./"
        />
        <div class="form-tip">每行一个正则表达式模式，匹配的 URI 将被阻止</div>
      </el-form-item>
      <el-form-item label="拒绝状态码">
        <el-input-number
          :model-value="rejectedCode"
          @update:model-value="handleRejectedCodeChange"
          :min="200"
          :max="599"
          style="width: 100%"
        />
        <div class="form-tip">当请求被阻止时返回的 HTTP 状态码，默认 403</div>
      </el-form-item>
      <el-form-item label="拒绝消息" required>
        <el-input
          :model-value="rejectedMsg"
          @update:model-value="handleRejectedMsgChange"
          placeholder="请求被阻止时返回的消息"
        />
        <div class="form-tip">可选，当请求被阻止时返回的自定义消息</div>
      </el-form-item>
      <el-form-item label="忽略大小写">
        <el-switch :model-value="caseInsensitive" @update:model-value="handleCaseInsensitiveChange" />
        <div class="form-tip">是否在匹配时忽略大小写</div>
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

// 从 plugins 中提取 uri-blocker 配置
const uriBlockerPlugin = computed(() => props.modelValue.plugins?.['uri-blocker'] || {})

// 计算 enabled 状态
const enabled = computed(() => isPluginEnabled(uriBlockerPlugin.value))

// 计算各个字段
const blockRules = computed(() => {
  if (!enabled.value) return []
  return uriBlockerPlugin.value.block_rules || []
})

const rejectedCode = computed(() => {
  return uriBlockerPlugin.value.rejected_code || 403
})

const rejectedMsg = computed(() => {
  return uriBlockerPlugin.value.rejected_msg || '访问被拒绝，您没有权限访问此路由'
})

const caseInsensitive = computed(() => {
  return uriBlockerPlugin.value.case_insensitive || false
})

// 内部状态
const localEnabled = ref(enabled.value)
const blockRulesInput = ref(
  blockRules.value.length > 0
    ? blockRules.value.join('\n')
    : ''
)

// 监听 props 变化，更新内部状态
watch([enabled, blockRules], ([newEnabled, newBlockRules]) => {
  localEnabled.value = newEnabled
  blockRulesInput.value = newBlockRules.length > 0
    ? newBlockRules.join('\n')
    : ''
}, { immediate: true })

// 监听内部状态变化，更新到父组件
watch(localEnabled, (newEnabled) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  if (newEnabled) {
    currentConfig.plugins['uri-blocker'] = {
      block_rules: blockRules.value,
      rejected_code: rejectedCode.value,
      rejected_msg: rejectedMsg.value,
      case_insensitive: caseInsensitive.value
    }
    setPluginEnabled(currentConfig.plugins['uri-blocker'], true)
  } else {
    currentConfig.plugins['uri-blocker'] = currentConfig.plugins['uri-blocker'] || {}
    setPluginEnabled(currentConfig.plugins['uri-blocker'], false)
  }
  
  emit('update:modelValue', currentConfig)
})

const handleEnableChange = (value) => {
  localEnabled.value = value
}

const handleBlockRulesInput = (value) => {
  blockRulesInput.value = value
}

const handleRejectedCodeChange = (value) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  currentConfig.plugins['uri-blocker'] = {
    ...uriBlockerPlugin.value,
    rejected_code: value
  }
  setPluginEnabled(currentConfig.plugins['uri-blocker'], enabled.value)
  
  emit('update:modelValue', currentConfig)
}

const handleRejectedMsgChange = (value) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  currentConfig.plugins['uri-blocker'] = {
    ...uriBlockerPlugin.value,
    rejected_msg: value
  }
  setPluginEnabled(currentConfig.plugins['uri-blocker'], enabled.value)
  
  emit('update:modelValue', currentConfig)
}

const handleCaseInsensitiveChange = (value) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  currentConfig.plugins['uri-blocker'] = {
    ...uriBlockerPlugin.value,
    case_insensitive: value
  }
  setPluginEnabled(currentConfig.plugins['uri-blocker'], enabled.value)
  
  emit('update:modelValue', currentConfig)
}

const handleBlur = () => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  if (blockRulesInput.value && blockRulesInput.value.trim()) {
    const rules = blockRulesInput.value.split('\n').map(s => s.trim()).filter(s => s)
    currentConfig.plugins['uri-blocker'] = {
      ...uriBlockerPlugin.value,
      block_rules: rules
    }
  } else {
    currentConfig.plugins['uri-blocker'] = {
      ...uriBlockerPlugin.value,
      block_rules: []
    }
  }
  setPluginEnabled(currentConfig.plugins['uri-blocker'], enabled.value)
  
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