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
          此插件实现了断路器模式，用于保护上游服务。当上游服务出现故障时，断路器会打开并直接返回错误响应，
          避免继续请求已经故障的上游服务。当服务恢复后，断路器会自动关闭，恢复正常请求。
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="localEnabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="localEnabled">
      <el-form-item label="断路器响应码" required>
        <el-input-number
          :model-value="breakResponseCode"
          @update:model-value="handleBreakCodeChange"
          :min="200"
          :max="599"
          style="width: 100%"
        />
        <div class="form-tip">当断路器打开时返回的 HTTP 状态码</div>
      </el-form-item>
      <el-form-item label="断路器响应体">
        <el-input
          :model-value="breakResponseBody"
          @update:model-value="handleBreakBodyChange"
          type="textarea"
          :rows="3"
          placeholder="断路器打开时返回的响应体"
        />
        <div class="form-tip">可选，当断路器打开时返回的自定义响应体</div>
      </el-form-item>
      <el-form-item label="断路器响应头">
        <div
          v-for="(h, idx) in breakResponseHeadersList"
          :key="idx"
          class="header-row"
        >
          <el-input
            :model-value="h.key"
            @update:model-value="(v) => updateHeader(idx, 'key', v)"
            placeholder="Header 名称"
            style="flex: 1; margin-right: 8px;"
          />
          <el-input
            :model-value="h.value"
            @update:model-value="(v) => updateHeader(idx, 'value', v)"
            placeholder="值，可含 $var 如 $remote_addr"
            style="flex: 1; margin-right: 8px;"
          />
          <el-button type="danger" link @click="removeHeader(idx)">删除</el-button>
        </div>
        <el-button type="primary" link @click="addHeader">+ 添加响应头</el-button>
        <div class="form-tip">可选，熔断时返回的 HTTP 响应头；仅当配置了「断路器响应体」时生效，value 可含 Nginx 变量如 $remote_addr</div>
      </el-form-item>
      <el-form-item label="不健康状态码">
        <el-input
          :model-value="unhealthyStatusesInput"
          @update:model-value="handleUnhealthyStatusesInput"
          @blur="handleBlur"
          placeholder="多个状态码用逗号分隔，如: 500, 502, 503"
        />
        <div class="form-tip">触发不健康状态检测的 HTTP 状态码，多个状态码用逗号分隔</div>
      </el-form-item>
      <el-form-item label="失败阈值">
        <el-input-number
          :model-value="unhealthy.failures"
          @update:model-value="handleUnhealthyFailuresChange"
          :min="1"
          :max="1000"
          style="width: 100%"
        />
        <div class="form-tip">连续失败次数，达到此值后断路器打开</div>
      </el-form-item>
      <el-form-item label="健康状态码">
        <el-input
          :model-value="healthyStatusesInput"
          @update:model-value="handleHealthyStatusesInput"
          @blur="handleBlur"
          placeholder="多个状态码用逗号分隔，如: 200, 201, 202"
        />
        <div class="form-tip">表示服务恢复的 HTTP 状态码，多个状态码用逗号分隔</div>
      </el-form-item>
      <el-form-item label="恢复成功次数">
        <el-input-number
          :model-value="healthy.successes"
          @update:model-value="handleHealthySuccessesChange"
          :min="1"
          :max="1000"
          style="width: 100%"
        />
        <div class="form-tip">连续成功次数，达到此值后断路器关闭</div>
      </el-form-item>
      <el-form-item label="熔断最大持续时间（秒）">
        <el-input-number
          :model-value="maxBreakerSec"
          @update:model-value="handleMaxBreakerSecChange"
          :min="3"
          :max="86400"
          style="width: 100%"
        />
        <div class="form-tip">熔断时长的上限（秒），熔断时间按 2、4、8、16… 递增直至此值，默认 300</div>
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

// 从 plugins 中提取 api-breaker 配置
const apiBreakerPlugin = computed(() => props.modelValue.plugins?.['api-breaker'] || {})

// 计算 enabled 状态
const enabled = computed(() => isPluginEnabled(apiBreakerPlugin.value))

// 计算各个字段
const breakResponseCode = computed(() => {
  if (!enabled.value) return 0
  return apiBreakerPlugin.value.break_response_code || 503
})

const breakResponseBody = computed(() => {
  return apiBreakerPlugin.value.break_response_body || '服务暂时不可用，系统正在进行保护性降级'
})

const unhealthy = computed(() => {
  return apiBreakerPlugin.value.unhealthy || {
    http_statuses: [500, 502, 503, 504],
    failures: 3
  }
})

const healthy = computed(() => {
  return apiBreakerPlugin.value.healthy || {
    http_statuses: [200, 201, 202, 204, 301, 302, 304],
    successes: 3
  }
})

const maxBreakerSec = computed(() => {
  const v = apiBreakerPlugin.value.max_breaker_sec
  return v !== undefined && v >= 3 ? v : 300
})

const breakResponseHeaders = computed(() => {
  const arr = apiBreakerPlugin.value.break_response_headers
  if (!Array.isArray(arr) || arr.length === 0) return []
  return arr.map((item) => ({
    key: item?.key ?? '',
    value: item?.value ?? ''
  }))
})

// 内部状态
const localEnabled = ref(enabled.value)
const breakResponseHeadersList = ref([])

const unhealthyStatusesInput = ref(
  Array.isArray(unhealthy.value.http_statuses)
    ? unhealthy.value.http_statuses.join(', ')
    : '500, 502, 503, 504'
)

const healthyStatusesInput = ref(
  Array.isArray(healthy.value.http_statuses)
    ? healthy.value.http_statuses.join(', ')
    : '200, 201, 202, 204, 301, 302, 304'
)

// 监听 props 变化，更新内部状态
watch([enabled, unhealthy, healthy, breakResponseHeaders], ([newEnabled, newUnhealthy, newHealthy, newHeaders]) => {
  localEnabled.value = newEnabled
  if (Array.isArray(newUnhealthy?.http_statuses)) {
    unhealthyStatusesInput.value = newUnhealthy.http_statuses.join(', ')
  }
  if (Array.isArray(newHealthy?.http_statuses)) {
    healthyStatusesInput.value = newHealthy.http_statuses.join(', ')
  }
  if (Array.isArray(newHeaders)) {
    breakResponseHeadersList.value = newHeaders.length ? [...newHeaders] : []
  }
}, { immediate: true })

// 监听内部状态变化，更新到父组件
watch(localEnabled, (newEnabled) => {
  const currentConfig = {
    plugins: { ...props.modelValue.plugins }
  }
  
  if (newEnabled) {
    currentConfig.plugins['api-breaker'] = buildPluginConfig()
    setPluginEnabled(currentConfig.plugins['api-breaker'], true)
  } else {
    currentConfig.plugins['api-breaker'] = currentConfig.plugins['api-breaker'] || {}
    setPluginEnabled(currentConfig.plugins['api-breaker'], false)
  }
  
  emit('update:modelValue', currentConfig)
})

function buildPluginConfig(overrides = {}) {
  const base = {
    break_response_code: breakResponseCode.value,
    break_response_body: breakResponseBody.value,
    unhealthy: unhealthy.value,
    healthy: healthy.value,
    max_breaker_sec: maxBreakerSec.value
  }
  const headers = breakResponseHeadersList.value
    .filter((h) => (h.key ?? '').trim())
    .map((h) => ({ key: (h.key ?? '').trim(), value: (h.value ?? '').trim() }))
  if (headers.length > 0) base.break_response_headers = headers
  return { ...base, ...overrides }
}

function emitPluginConfig(overrides = {}) {
  const currentConfig = { plugins: { ...props.modelValue.plugins } }
  currentConfig.plugins['api-breaker'] = buildPluginConfig(overrides)
  setPluginEnabled(currentConfig.plugins['api-breaker'], enabled.value)
  emit('update:modelValue', currentConfig)
}

const handleEnableChange = (value) => {
  localEnabled.value = value
}

const handleBreakCodeChange = (value) => {
  emitPluginConfig({ break_response_code: value })
}

const handleBreakBodyChange = (value) => {
  emitPluginConfig({ break_response_body: value })
}

const addHeader = () => {
  breakResponseHeadersList.value.push({ key: '', value: '' })
  // 不 emit，等用户填写 key 后由 updateHeader 再同步
}

const removeHeader = (idx) => {
  breakResponseHeadersList.value.splice(idx, 1)
  emitPluginConfig()
}

const updateHeader = (idx, field, value) => {
  const list = breakResponseHeadersList.value
  if (list[idx]) {
    list[idx] = { ...list[idx], [field]: value }
    emitPluginConfig()
  }
}

const handleMaxBreakerSecChange = (value) => {
  emitPluginConfig({ max_breaker_sec: value })
}

const handleUnhealthyStatusesInput = (value) => {
  unhealthyStatusesInput.value = value
}

const handleHealthyStatusesInput = (value) => {
  healthyStatusesInput.value = value
}

const handleUnhealthyFailuresChange = (value) => {
  emitPluginConfig({
    unhealthy: { ...unhealthy.value, failures: value }
  })
}

const handleHealthySuccessesChange = (value) => {
  emitPluginConfig({
    healthy: { ...healthy.value, successes: value }
  })
}

const handleBlur = () => {
  const overrides = {}
  if (unhealthyStatusesInput.value && unhealthyStatusesInput.value.trim()) {
    const statuses = unhealthyStatusesInput.value
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((s) => !Number.isNaN(s))
    if (statuses.length > 0) {
      overrides.unhealthy = { ...unhealthy.value, http_statuses: statuses }
    }
  }
  if (healthyStatusesInput.value && healthyStatusesInput.value.trim()) {
    const statuses = healthyStatusesInput.value
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((s) => !Number.isNaN(s))
    if (statuses.length > 0) {
      overrides.healthy = { ...healthy.value, http_statuses: statuses }
    }
  }
  if (Object.keys(overrides).length > 0) {
    emitPluginConfig(overrides)
  }
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

.header-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}
</style>