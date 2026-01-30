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
          @update:model-value="(v) => originsInput.value = v"
          @blur="commit"
          placeholder="多个源用逗号分隔，如: https://example.com, https://*.example.com"
        />
        <div class="form-tip">默认 * 表示允许所有源，多个源用逗号分隔</div>
      </el-form-item>
      <el-form-item label="允许的方法">
        <el-checkbox-group :model-value="methodsValue" @update:model-value="(v) => { methodsValue.value = v; commit() }">
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
          @update:model-value="(v) => allowHeadersInput.value = v"
          @blur="commit"
          placeholder="多个请求头用逗号分隔，如: Content-Type, Authorization"
        />
        <div class="form-tip">默认值：Content-Type, Authorization, X-Requested-With, X-CSRF-Token，留空则使用默认值，多个请求头用逗号分隔</div>
      </el-form-item>
      <el-form-item label="暴露的响应头">
        <el-input
          :model-value="exposeHeadersInput"
          @update:model-value="(v) => exposeHeadersInput.value = v"
          @blur="commit"
          placeholder="多个响应头用逗号分隔，如: Content-Length, X-Custom-Header"
        />
        <div class="form-tip">可选，多个响应头用逗号分隔，留空则不设置</div>
      </el-form-item>
      <el-form-item label="缓存时间">
        <el-input-number
          :model-value="maxAgeValue"
          @update:model-value="(v) => maxAgeValue.value = v"
          @change="commit"
          :min="-1"
          :max="31536000"
          style="width: 100%"
        />
        <div class="form-tip">单位：秒，浏览器缓存 CORS 结果的最大时间，-1 表示不缓存，默认 1728000 秒（20天）</div>
      </el-form-item>
      <el-form-item label="允许凭据">
        <el-switch :model-value="allowCredentialValue" @update:model-value="handleAllowCredentialChange" />
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
                @update:model-value="(v) => allowOriginsByRegexList.value[idx] = v"
                @blur="commit"
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
          <el-button type="primary" link :icon="Plus" class="regex-add-btn" @click="allowOriginsByRegexList.value.push('')">
            添加正则表达式
          </el-button>
        </div>
        <div class="form-tip">使用正则匹配允许跨域的 Origin，设置后将忽略「允许的源」</div>
      </el-form-item>
    </template>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { isPluginEnabled, setPluginEnabled } from '@/utils/plugin'
import { usePluginConfig } from '@/composables/usePluginConfig'

const DEFAULT_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD']
const DEFAULT_HEADERS = 'Content-Type, Authorization, X-Requested-With, X-CSRF-Token'
const DEFAULT_MAX_AGE = 1728000

const toStr = (v) => (Array.isArray(v) ? v.join(', ') : v || '')

function getInitialFromConfig(config) {
  const c = config || {}
  const raw = c.allow_origins
  const origins = (raw && raw !== '*') ? toStr(raw) : '*'
  const rawHeaders = c.allow_headers
  const allowHeaders = (rawHeaders && rawHeaders !== '*') ? toStr(rawHeaders) : DEFAULT_HEADERS
  let methods = DEFAULT_METHODS
  const m = c.allow_methods
  if (m) {
    if (typeof m === 'string') methods = m === '*' ? DEFAULT_METHODS : m.split(',').map((s) => s.trim()).filter(Boolean)
    else if (Array.isArray(m)) methods = m
  }
  return {
    origins,
    methods,
    allowHeaders,
    exposeHeaders: toStr(c.expose_headers),
    maxAge: c.max_age !== undefined ? c.max_age : DEFAULT_MAX_AGE,
    allowCredential: !!c.allow_credential,
    allowOriginsByRegex: [...(c.allow_origins_by_regex || [])]
  }
}

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  resourceType: { type: String, default: '' }
})
const emit = defineEmits(['update:modelValue'])
const { config, updateConfig } = usePluginConfig(props, emit)
const enabled = computed(() => isPluginEnabled(config.value))

const init = getInitialFromConfig(config.value)
const originsInput = ref(init.origins)
const methodsValue = ref(init.methods)
const allowHeadersInput = ref(init.allowHeaders)
const exposeHeadersInput = ref(init.exposeHeaders)
const maxAgeValue = ref(init.maxAge)
const allowCredentialValue = ref(init.allowCredential)
const allowOriginsByRegexList = ref(init.allowOriginsByRegex)

function buildCorsConfig() {
  const o = originsInput.value?.trim()
  const cfg = {
    allow_methods: methodsValue.value?.length ? methodsValue.value.join(',') : DEFAULT_METHODS.join(', '),
    allow_headers: allowHeadersInput.value?.trim() || DEFAULT_HEADERS,
    max_age: maxAgeValue.value ?? DEFAULT_MAX_AGE,
    allow_credential: allowCredentialValue.value
  }
  if (o) cfg.allow_origins = o
  else if (!allowCredentialValue.value) cfg.allow_origins = '*'
  const exp = exposeHeadersInput.value?.trim()
  if (exp) cfg.expose_headers = exp
  const regex = allowOriginsByRegexList.value.filter((r) => r?.trim())
  if (regex.length) cfg.allow_origins_by_regex = regex
  return cfg
}

function commit() {
  if (!enabled.value) return
  const cfg = buildCorsConfig()
  setPluginEnabled(cfg, true)
  updateConfig(cfg)
}

function handleEnableChange(value) {
  const cfg = value ? buildCorsConfig() : { ...config.value }
  setPluginEnabled(cfg, value)
  updateConfig(cfg)
}

function handleAllowCredentialChange(v) {
  allowCredentialValue.value = v
  commit()
}

function removeRegex(idx) {
  allowOriginsByRegexList.value.splice(idx, 1)
  commit()
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

.regex-item:first-child { padding-top: 0; }
.regex-item:last-child { border-bottom: none; padding-bottom: 0; }

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