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
          此插件用于配置跨域访问策略。启用后，可以控制哪些源、方法和请求头被允许进行跨域请求。
          这对于前端应用需要访问不同域名的 API 时非常有用。
        </div>
      </template>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="enabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="enabled">
      <el-form-item label="允许的源">
        <el-input
          :model-value="originsInput"
          @update:model-value="handleOriginsInput"
          @blur="handleBlur"
          placeholder="多个源用逗号分隔，如: https://example.com, https://*.example.com"
        />
        <div class="form-tip">留空表示允许所有源（使用 *），多个源用逗号分隔</div>
      </el-form-item>
      <el-form-item label="允许的方法">
        <el-checkbox-group :model-value="methodsValue" @update:model-value="handleMethodsChange">
          <el-checkbox label="GET">GET</el-checkbox>
          <el-checkbox label="POST">POST</el-checkbox>
          <el-checkbox label="PUT">PUT</el-checkbox>
          <el-checkbox label="DELETE">DELETE</el-checkbox>
          <el-checkbox label="OPTIONS">OPTIONS</el-checkbox>
          <el-checkbox label="PATCH">PATCH</el-checkbox>
          <el-checkbox label="HEAD">HEAD</el-checkbox>
          <el-checkbox label="CONNECT">CONNECT</el-checkbox>
          <el-checkbox label="TRACE">TRACE</el-checkbox>
        </el-checkbox-group>
        <div class="form-tip">默认值：GET, POST, PUT, DELETE, OPTIONS, HEAD，至少选择一个 HTTP 方法</div>
      </el-form-item>
      <el-form-item label="允许的请求头">
        <el-input
          :model-value="allowHeadersInput"
          @update:model-value="handleAllowHeadersInput"
          @blur="handleBlur"
          placeholder="多个请求头用逗号分隔，如: Content-Type, Authorization"
        />
        <div class="form-tip">默认值：Content-Type, Authorization, X-Requested-With, X-CSRF-Token，留空则使用默认值，多个请求头用逗号分隔</div>
      </el-form-item>
      <el-form-item label="暴露的响应头">
        <el-input
          :model-value="exposeHeadersInput"
          @update:model-value="handleExposeHeadersInput"
          @blur="handleBlur"
          placeholder="多个响应头用逗号分隔，如: Content-Length, X-Custom-Header"
        />
        <div class="form-tip">可选，多个响应头用逗号分隔，留空则不设置</div>
      </el-form-item>
      <el-form-item label="缓存时间">
        <el-input-number
          :model-value="maxAgeValue"
          @update:model-value="handleMaxAgeChange"
          @change="handleBlur"
          :min="-1"
          :max="31536000"
          style="width: 100%"
        />
        <div class="form-tip">单位：秒，浏览器缓存 CORS 结果的最大时间，-1 表示不缓存，默认 1728000 秒（20天）</div>
      </el-form-item>
      <el-form-item label="允许凭据">
        <el-switch :model-value="allowCredentialValue" @update:model-value="handleAllowCredentialChange" @change="handleBlur" />
        <div class="form-tip">是否允许跨域请求携带凭据（如 Cookie），开启后不能在其他属性中使用 *</div>
      </el-form-item>
      <el-form-item label="允许的源（正则表达式）">
        <div class="regex-list-box">
          <div v-if="allowOriginsByRegexList.length" class="regex-items">
            <div
              v-for="(regex, idx) in allowOriginsByRegexList"
              :key="idx"
              class="regex-item"
            >
              <span class="regex-index">{{ idx + 1 }}</span>
              <el-input
                :model-value="regex"
                @update:model-value="(v) => updateRegex(idx, v)"
                @blur="handleBlur"
                placeholder="如: .*\.test\.com$"
                class="regex-input"
                clearable
              />
              <el-button
                type="danger"
                link
                :icon="Delete"
                class="regex-remove"
                @click="removeRegex(idx)"
              />
            </div>
          </div>
          <div v-else class="regex-empty">
            暂无正则，点击下方按钮添加
          </div>
          <el-button type="primary" link :icon="Plus" class="regex-add-btn" @click="addRegex">
            添加正则表达式
          </el-button>
        </div>
        <div class="form-tip">使用正则匹配允许跨域的 Origin，设置后将忽略「允许的源」</div>
      </el-form-item>
    </template>
  </div>
</template>

<script setup>
import { ref, watch, computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { isPluginEnabled, setPluginEnabled } from '@/utils/plugin'
import { usePluginConfig } from '@/composables/usePluginConfig'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  resourceType: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
const { config, updateConfig } = usePluginConfig(props, emit)

const enabled = computed(() => isPluginEnabled(config.value))

// 计算各个字段
const origins = computed(() => {
  if (!enabled.value) return ''
  if (config.value.allow_origins && config.value.allow_origins !== '*') {
    return Array.isArray(config.value.allow_origins)
      ? config.value.allow_origins.join(', ')
      : config.value.allow_origins
  }
  return ''
})

const methods = computed(() => {
  if (!enabled.value) return ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD']
  if (config.value.allow_methods) {
    if (typeof config.value.allow_methods === 'string') {
      if (config.value.allow_methods === '*') return ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD']
      return config.value.allow_methods.split(',').map(s => s.trim()).filter(s => s)
    }
    if (Array.isArray(config.value.allow_methods)) return config.value.allow_methods
  }
  return ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD']
})

const allowHeaders = computed(() => {
  if (!enabled.value) return 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token'
  if (config.value.allow_headers) {
    if (config.value.allow_headers === '*') return 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token'
    return Array.isArray(config.value.allow_headers)
      ? config.value.allow_headers.join(', ')
      : config.value.allow_headers
  }
  return 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token'
})

const exposeHeaders = computed(() => {
  if (!enabled.value) return ''
  if (config.value.expose_headers) {
    return Array.isArray(config.value.expose_headers)
      ? config.value.expose_headers.join(', ')
      : config.value.expose_headers
  }
  return ''
})

const maxAge = computed(() => config.value.max_age !== undefined ? config.value.max_age : 1728000)
const allowCredential = computed(() => config.value.allow_credential !== undefined ? config.value.allow_credential : false)
const allowOriginsByRegex = computed(() => {
  if (!enabled.value) return []
  return config.value.allow_origins_by_regex || []
})

// 内部状态
const originsInput = ref(origins.value)
const methodsValue = ref(methods.value)
const allowHeadersInput = ref(allowHeaders.value)
const exposeHeadersInput = ref(exposeHeaders.value)
const maxAgeValue = ref(maxAge.value)
const allowCredentialValue = ref(allowCredential.value)
const allowOriginsByRegexList = ref([...allowOriginsByRegex.value])

// 监听 props 变化，更新内部状态
watch([enabled, origins, methods, allowHeaders, exposeHeaders, maxAge, allowCredential, allowOriginsByRegex],
  ([newEnabled, newOrigins, newMethods, newAllowHeaders, newExposeHeaders, newMaxAge, newAllowCredential, newAllowOriginsByRegex]) => {
    localEnable.value = newEnabled
    originsInput.value = newOrigins
    methodsValue.value = newMethods
    allowHeadersInput.value = newAllowHeaders
    exposeHeadersInput.value = newExposeHeaders
    maxAgeValue.value = newMaxAge
    allowCredentialValue.value = newAllowCredential
    allowOriginsByRegexList.value = [...newAllowOriginsByRegex]
  }, { immediate: true })

function buildCorsConfig() {
  const cfg = {}
  if (originsInput.value?.trim()) cfg.allow_origins = originsInput.value.trim()
  else if (!allowCredentialValue.value) cfg.allow_origins = '*'
  cfg.allow_methods = methodsValue.value?.length ? methodsValue.value.join(',') : 'GET, POST, PUT, DELETE, OPTIONS, HEAD'
  cfg.allow_headers = allowHeadersInput.value?.trim() || 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token'
  if (exposeHeadersInput.value?.trim()) cfg.expose_headers = exposeHeadersInput.value.trim()
  cfg.max_age = maxAgeValue.value !== undefined ? maxAgeValue.value : 1728000
  cfg.allow_credential = allowCredentialValue.value
  if (allowOriginsByRegexList.value?.length) cfg.allow_origins_by_regex = allowOriginsByRegexList.value.filter((r) => r?.trim())
  return cfg
}

function handleEnableChange(value) {
  const cfg = value ? buildCorsConfig() : { ...config.value }
  setPluginEnabled(cfg, value)
  updateConfig(cfg)
}

const handleOriginsInput = (value) => {
  originsInput.value = value
}

const handleMethodsChange = (value) => {
  methodsValue.value = value
  handleBlur()
}

const handleAllowHeadersInput = (value) => {
  allowHeadersInput.value = value
}

const handleExposeHeadersInput = (value) => {
  exposeHeadersInput.value = value
}

const handleMaxAgeChange = (value) => {
  maxAgeValue.value = value
}

const handleAllowCredentialChange = (value) => {
  allowCredentialValue.value = value
}

const addRegex = () => {
  allowOriginsByRegexList.value.push('')
}

const updateRegex = (idx, value) => {
  allowOriginsByRegexList.value[idx] = value
}

const removeRegex = (idx) => {
  allowOriginsByRegexList.value.splice(idx, 1)
  handleBlur()
}

const handleBlur = () => {
  if (!localEnable.value) return
  const cfg = buildCorsConfig()
  setPluginEnabled(cfg, true)
  updateConfig(cfg)
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

.regex-list-box {
  width: 100%;
  padding: 14px 16px;
  background: var(--el-fill-color-light);
  border-radius: 8px;
  border: 1px solid var(--el-border-color-light);
}

.regex-items {
  margin-bottom: 4px;
}

.regex-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px dashed var(--el-border-color-lighter);
}

.regex-item:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.regex-item:first-child {
  padding-top: 0;
}

.regex-index {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  font-size: 12px;
  font-weight: 500;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 6px;
}

.regex-input {
  flex: 1;
  min-width: 0;
}

.regex-input :deep(.el-input__wrapper) {
  border-radius: 6px;
}

.regex-remove {
  flex-shrink: 0;
  padding: 4px;
}

.regex-empty {
  padding: 16px 0;
  font-size: 13px;
  color: var(--el-text-color-placeholder);
  text-align: center;
}

.regex-add-btn {
  margin-top: 12px;
  padding-left: 0;
  font-size: 13px;
}
</style>