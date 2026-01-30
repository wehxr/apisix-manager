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
      <el-switch :model-value="enabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="enabled">
      <el-form-item label="断路器响应码" required>
        <el-input-number
          :model-value="breakResponseCode"
          @update:model-value="(v) => emitField('break_response_code', v)"
          :min="200"
          :max="599"
          style="width: 100%"
        />
        <div class="form-tip">当断路器打开时返回的 HTTP 状态码, 端口范围: 200-599</div>
      </el-form-item>
      <el-form-item label="断路器响应体" required>
        <el-input
          :model-value="breakResponseBody"
          @update:model-value="(v) => emitField('break_response_body', v)"
          type="textarea"
          :rows="3"
          placeholder="断路器打开时返回的响应体"
        />
        <div class="form-tip">可选，当断路器打开时返回的自定义响应体</div>
      </el-form-item>
      <el-form-item label="断路器响应头">
        <div class="headers-block">
          <div
            v-for="(h, idx) in breakResponseHeadersList"
            :key="idx"
            class="header-row"
          >
            <el-input
              :model-value="h.key"
              @update:model-value="(v) => updateHeader(idx, 'key', v)"
              placeholder="Header 名称"
              class="header-key"
            />
            <el-input
              :model-value="h.value"
              @update:model-value="(v) => updateHeader(idx, 'value', v)"
              placeholder="值，可含 $var 如 $remote_addr"
              class="header-value"
            />
            <el-button type="danger" link class="header-delete" @click="removeHeader(idx)">删除</el-button>
          </div>
          <el-button type="primary" link class="add-header-btn" @click="addHeader">+ 添加响应头</el-button>
        </div>
        <div class="form-tip">可选，熔断时返回的 HTTP 响应头；仅当配置了「断路器响应体」时生效，value 可含 Nginx 变量如 $remote_addr</div>
      </el-form-item>
      <el-form-item label="不健康状态码" required>
        <el-input
          :model-value="unhealthyStatusesInput"
          @update:model-value="setUnhealthyStatusesInput"
          @blur="applyStatusesBlur"
          placeholder="多个状态码用逗号分隔，如: 500, 502, 503"
        />
        <div class="form-tip">触发不健康状态检测的 HTTP 状态码，多个状态码用逗号分隔; 端口范围: 500-599</div>
      </el-form-item>
      <el-form-item label="失败阈值" required>
        <el-input-number
          :model-value="unhealthy.failures"
          @update:model-value="(v) => emitField('unhealthy', { ...unhealthy, failures: v })"
          :min="1"
          :max="1000"
          style="width: 100%"
        />
        <div class="form-tip">连续失败次数，达到此值后断路器打开</div>
      </el-form-item>
      <el-form-item label="健康状态码" required>
        <el-input
          :model-value="healthyStatusesInput"
          @update:model-value="setHealthyStatusesInput"
          @blur="applyStatusesBlur"
          placeholder="多个状态码用逗号分隔，如: 200, 201, 202"
        />
        <div class="form-tip">表示服务恢复的 HTTP 状态码，多个状态码用逗号分隔; 端口范围: 200-499</div>
      </el-form-item>
      <el-form-item label="恢复成功次数" required>
        <el-input-number
          :model-value="healthy.successes"
          @update:model-value="(v) => emitField('healthy', { ...healthy, successes: v })"
          :min="1"
          :max="1000"
          style="width: 100%"
        />
        <div class="form-tip">连续成功次数，达到此值后断路器关闭</div>
      </el-form-item>
      <el-form-item label="熔断最大持续时间（秒）" required>
        <el-input-number
          :model-value="maxBreakerSec"
          @update:model-value="(v) => emitField('max_breaker_sec', v)"
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
import { ref, computed, watch } from 'vue'
import { isPluginEnabled, setPluginEnabled } from '@/utils/plugin'
import { usePluginConfig } from '@/composables/usePluginConfig'

const DEFAULT_BREAK_RESPONSE_CODE = 503
const DEFAULT_BREAK_RESPONSE_BODY = '服务暂时不可用，系统正在进行保护性降级'
const DEFAULT_UNHEALTHY_STATUSES = [500, 502, 503, 504]
const DEFAULT_HEALTHY_STATUSES = [200, 201, 202, 204, 301, 302, 304]

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  resourceType: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
const { config, updateConfig } = usePluginConfig(props, emit)

const enabled = computed(() => isPluginEnabled(config.value))

// 从 config 派生的只读展示值（带默认值）
const breakResponseCode = computed(() =>
  config.value.break_response_code ?? DEFAULT_BREAK_RESPONSE_CODE
)
const breakResponseBody = computed(() =>
  config.value.break_response_body ?? DEFAULT_BREAK_RESPONSE_BODY
)
const unhealthy = computed(() => ({
  http_statuses: config.value.unhealthy?.http_statuses ?? DEFAULT_UNHEALTHY_STATUSES,
  failures: config.value.unhealthy?.failures ?? 3
}))
const healthy = computed(() => ({
  http_statuses: config.value.healthy?.http_statuses ?? DEFAULT_HEALTHY_STATUSES,
  successes: config.value.healthy?.successes ?? 3
}))
const maxBreakerSec = computed(() => {
  const v = config.value.max_breaker_sec
  return v !== undefined && v >= 3 ? v : 300
})

// 可编辑的本地状态（仅在输入/列表需要暂存时使用）
const breakResponseHeadersList = ref([])
const unhealthyStatusesInput = ref('')
const healthyStatusesInput = ref('')

// 仅当父级 config 变化时同步本地输入/列表（如打开弹窗、切换插件后重新拉取数据）
watch(
  () => props.modelValue,
  (val) => {
    const c = val && typeof val === 'object' ? val : {}
    unhealthyStatusesInput.value = (c.unhealthy?.http_statuses ?? DEFAULT_UNHEALTHY_STATUSES).join(', ')
    healthyStatusesInput.value = (c.healthy?.http_statuses ?? DEFAULT_HEALTHY_STATUSES).join(', ')
    const arr = c.break_response_headers
    breakResponseHeadersList.value = Array.isArray(arr) && arr.length > 0
      ? arr.map((item) => ({ key: item?.key ?? '', value: item?.value ?? '' }))
      : []
  },
  { deep: true, immediate: true }
)

function parseStatusesString(str) {
  if (!str || typeof str !== 'string') return []
  return str
    .split(',')
    .map((s) => parseInt(s.trim(), 10))
    .filter((n) => !Number.isNaN(n))
}

function buildFullConfig(overrides = {}) {
  const base = {
    // 始终显式下发 break_response_code，避免网关使用默认 200
    break_response_code: config.value.break_response_code ?? DEFAULT_BREAK_RESPONSE_CODE,
    break_response_body: config.value.break_response_body ?? DEFAULT_BREAK_RESPONSE_BODY,
    unhealthy: { ...unhealthy.value },
    healthy: { ...healthy.value },
    max_breaker_sec: maxBreakerSec.value
  }
  const headers = breakResponseHeadersList.value
    .filter((h) => (h?.key ?? '').trim())
    .map((h) => ({ key: (h.key ?? '').trim(), value: (h.value ?? '').trim() }))
  if (headers.length > 0) base.break_response_headers = headers
  return { ...base, ...overrides }
}

function emitUpdate(fullConfig) {
  setPluginEnabled(fullConfig, enabled.value)
  updateConfig(fullConfig)
}

function emitField(key, value) {
  emitUpdate(buildFullConfig({ [key]: value }))
}

function handleEnableChange(value) {
  const next = value ? buildFullConfig() : { ...config.value }
  setPluginEnabled(next, value)
  updateConfig(next)
}

function addHeader() {
  breakResponseHeadersList.value.push({ key: '', value: '' })
}

function removeHeader(idx) {
  breakResponseHeadersList.value.splice(idx, 1)
  emitUpdate(buildFullConfig())
}

function updateHeader(idx, field, value) {
  const list = breakResponseHeadersList.value
  if (list[idx]) {
    list[idx] = { ...list[idx], [field]: value }
    emitUpdate(buildFullConfig())
  }
}

function setUnhealthyStatusesInput(v) {
  unhealthyStatusesInput.value = v
}
function setHealthyStatusesInput(v) {
  healthyStatusesInput.value = v
}
function applyStatusesBlur() {
  const overrides = {}
  const rawUnhealthy = parseStatusesString(unhealthyStatusesInput.value)
  if (rawUnhealthy.length > 0) {
    overrides.unhealthy = { ...unhealthy.value, http_statuses: rawUnhealthy }
  }
  const rawHealthy = parseStatusesString(healthyStatusesInput.value)
  if (rawHealthy.length > 0) {
    overrides.healthy = { ...healthy.value, http_statuses: rawHealthy }
  }
  if (Object.keys(overrides).length > 0) {
    emitUpdate(buildFullConfig(overrides))
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

.headers-block {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-key,
.header-value {
  flex: 1;
  min-width: 0;
}

.header-delete {
  flex-shrink: 0;
  padding-left: 4px;
}

.add-header-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  padding: 8px 12px;
  text-align: center;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  color: #606266;
}

.add-header-btn:hover {
  border-color: #409eff;
  color: #409eff;
}
</style>
