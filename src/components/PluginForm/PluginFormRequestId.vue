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
      <el-switch :model-value="enabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="enabled">
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
import { computed } from 'vue'
import { isPluginEnabled, setPluginEnabled } from '@/utils/plugin'
import { usePluginConfig } from '@/composables/usePluginConfig'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  resourceType: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
const { config, updateConfig } = usePluginConfig(props, emit)

const enabled = computed(() => isPluginEnabled(config.value))
const headerName = computed(() => config.value.header_name ?? 'X-Request-Id')
const includeInResponse = computed(() => config.value.include_in_response ?? true)
const algorithm = computed(() => config.value.algorithm ?? 'uuid')
const rangeIdCharSet = computed(() => config.value.range_id?.char_set ?? 'abcdefghijklmnopqrstuvwxyzABCDEFGHIGKLMNOPQRSTUVWXYZ0123456789')
const rangeIdLength = computed(() => config.value.range_id?.length ?? 16)

function buildConfig(overrides = {}) {
  const cfg = {
    header_name: headerName.value,
    include_in_response: includeInResponse.value,
    algorithm: algorithm.value,
    ...overrides
  }
  if (cfg.algorithm === 'range_id') {
    cfg.range_id = {
      char_set: rangeIdCharSet.value,
      length: rangeIdLength.value
    }
  }
  return cfg
}

function handleEnableChange(value) {
  const cfg = value ? { ...config.value, ...buildConfig() } : { ...config.value }
  setPluginEnabled(cfg, value)
  updateConfig(cfg)
}

function apply(partial) {
  const cfg = { ...config.value, ...partial }
  if (partial.algorithm && partial.algorithm !== 'range_id') {
    delete cfg.range_id
  } else if (cfg.algorithm === 'range_id') {
    const prev = cfg.range_id || {}
    cfg.range_id = {
      char_set: prev.char_set ?? rangeIdCharSet.value,
      length: prev.length ?? rangeIdLength.value,
      ...(partial.range_id || {})
    }
  }
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

const handleHeaderNameChange = (v) => apply({ header_name: v || 'X-Request-Id' })
const handleIncludeInResponseChange = (v) => apply({ include_in_response: v })
const handleAlgorithmChange = (v) => apply({ algorithm: v })
const handleRangeIdCharSetChange = (v) => apply({
  range_id: { ...(config.value.range_id || {}), char_set: v || 'abcdefghijklmnopqrstuvwxyzABCDEFGHIGKLMNOPQRSTUVWXYZ0123456789' }
})
const handleRangeIdLengthChange = (v) => apply({
  range_id: { ...(config.value.range_id || {}), length: v ?? 16 }
})
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
