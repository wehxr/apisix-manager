<template>
  <div>
    <el-alert
      title="插件说明"
      type="info"
      :closable="false"
      style="margin-bottom: 20px;"
    >
      用于演示/调试，在响应中插入或覆盖内容。<strong>仅作示例，勿用于生产。</strong>
      <br />before_body / body / after_body 至少填一个；可选填响应头 (headers)。
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="enabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="enabled">
      <el-form-item label="before_body">
        <el-input
          :model-value="beforeBody"
          @update:model-value="(v) => apply({ before_body: v || undefined })"
          type="textarea"
          :rows="2"
          placeholder="在 body 前插入的内容"
        />
        <div class="form-tip">未填 body 时，会加在上游响应 body 之前</div>
      </el-form-item>
      <el-form-item label="body">
        <el-input
          :model-value="body"
          @update:model-value="(v) => apply({ body: v || undefined })"
          type="textarea"
          :rows="3"
          placeholder="覆盖上游返回的响应体"
        />
      </el-form-item>
      <el-form-item label="after_body">
        <el-input
          :model-value="afterBody"
          @update:model-value="(v) => apply({ after_body: v || undefined })"
          type="textarea"
          :rows="2"
          placeholder="在 body 后追加的内容"
        />
        <div class="form-tip">未填 body 时，会加在上游响应 body 之后</div>
      </el-form-item>
      <el-form-item label="响应头 (headers)">
        <el-input
          :model-value="headersInput"
          @update:model-value="(v) => (headersInput = v)"
          @blur="applyHeaders"
          type="textarea"
          :rows="2"
          placeholder="可选，每行一个：Header名: 值"
        />
        <div class="form-tip">例如：X-Custom: hello</div>
      </el-form-item>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { isPluginEnabled, setPluginEnabled } from '@/utils/plugin'
import { usePluginConfig } from '@/composables/usePluginConfig'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  resourceType: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
const { config, updateConfig } = usePluginConfig(props, emit)

const enabled = computed(() => isPluginEnabled(config.value))
const beforeBody = computed(() => config.value.before_body ?? '')
const body = computed(() => config.value.body ?? '')
const afterBody = computed(() => config.value.after_body ?? '')

const headersInput = ref('')
watch(() => config.value.headers, (h) => {
  if (!h || typeof h !== 'object') {
    headersInput.value = ''
    return
  }
  headersInput.value = Object.entries(h).map(([k, v]) => `${k}: ${v ?? ''}`).join('\n')
}, { immediate: true })

function parseHeaders(text) {
  const out = {}
  if (!text || typeof text !== 'string') return out
  text.split('\n').forEach(line => {
    const idx = line.indexOf(':')
    if (idx > 0) {
      const k = line.slice(0, idx).trim()
      if (k) out[k] = line.slice(idx + 1).trim()
    }
  })
  return out
}

function apply(partial) {
  const cfg = { ...config.value, ...partial }
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

function applyHeaders() {
  const headers = parseHeaders(headersInput.value)
  const cfg = { ...config.value, headers: Object.keys(headers).length ? headers : undefined }
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

function handleEnableChange(value) {
  const cfg = value
    ? {
        before_body: beforeBody.value || undefined,
        body: body.value || undefined,
        after_body: afterBody.value || undefined,
        headers: Object.keys(parseHeaders(headersInput.value)).length ? parseHeaders(headersInput.value) : undefined
      }
    : { ...config.value }
  setPluginEnabled(cfg, value)
  updateConfig(cfg)
}
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}
</style>
