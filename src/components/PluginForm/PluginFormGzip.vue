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
      <el-switch :model-value="enabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="enabled">
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
          @blur="handleTypesBlur"
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
        <el-switch :model-value="vary" @update:model-value="handleVaryChange" />
        <div class="form-tip">动态设置 gzip_vary 指令，当设置为 true 时，在响应头中添加 Vary: Accept-Encoding</div>
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

const DEFAULT_TYPES = ['text/*', 'text/plain', 'text/css', 'application/javascript', 'application/x-javascript', 'text/xml', 'application/xml', 'application/xml+rss']
const enabled = computed(() => isPluginEnabled(config.value))
const types = computed(() => {
  const t = config.value.types
  return t === '*' ? '*' : (Array.isArray(t) && t.length > 0 ? t : DEFAULT_TYPES)
})
const minLength = computed(() => config.value.min_length !== undefined ? config.value.min_length : 1024)
const httpVersion = computed(() => config.value.http_version !== undefined ? config.value.http_version : 1.1)
const compLevel = computed(() => config.value.comp_level !== undefined ? config.value.comp_level : 9)
const buffers = computed(() => ({
  number: config.value.buffers?.number !== undefined ? config.value.buffers.number : 4,
  size: config.value.buffers?.size !== undefined ? config.value.buffers.size : 16384
}))
const vary = computed(() => config.value.vary !== undefined ? config.value.vary : true)

const typesInput = ref('')
function typesInputSync() {
  const t = types.value
  typesInput.value = t === '*' ? '*' : (Array.isArray(t) ? t.join(', ') : '')
}
typesInputSync()
watch(types, typesInputSync)

function apply(partial) {
  const cfg = { ...config.value, ...partial }
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

function handleEnableChange(value) {
  const cfg = value
    ? {
        types: types.value === '*' ? '*' : (types.value.length ? types.value : DEFAULT_TYPES),
        min_length: minLength.value,
        http_version: httpVersion.value,
        comp_level: compLevel.value,
        buffers: { number: buffers.value.number, size: buffers.value.size },
        vary: vary.value
      }
    : { ...config.value }
  setPluginEnabled(cfg, value)
  updateConfig(cfg)
}

function handleTypesInput(value) {
  typesInput.value = value
}
function handleTypesBlur() {
  const trimmed = (typesInput.value || '').trim()
  const newTypes = trimmed === '*' ? '*' : trimmed ? trimmed.split(',').map((s) => s.trim()).filter(Boolean) : []
  apply({ types: newTypes.length ? newTypes : DEFAULT_TYPES })
  typesInputSync()
}

const handleCompLevelChange = (v) => apply({ comp_level: v })
const handleMinLengthChange = (v) => apply({ min_length: v })
const handleHttpVersionChange = (v) => apply({ http_version: v })
const handleBuffersNumberChange = (v) => apply({ buffers: { ...buffers.value, number: v } })
const handleBuffersSizeChange = (v) => apply({ buffers: { ...buffers.value, size: v } })
const handleVaryChange = (v) => apply({ vary: v })
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
