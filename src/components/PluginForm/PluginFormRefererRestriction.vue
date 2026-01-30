<template>
  <div>
    <el-alert
      title="插件说明"
      type="info"
      :closable="false"
      style="margin-bottom: 20px;"
    >
      按 Referer 域名做白名单或黑名单控制，支持 <code>*</code> 通配（如 <code>*.xx.com</code>）。<strong>白名单与黑名单只能二选一。</strong>
    </el-alert>
    <el-form-item label="开启插件">
      <el-switch :model-value="enabled" @update:model-value="handleEnableChange" />
    </el-form-item>
    <template v-if="enabled">
      <el-form-item label="限制类型">
        <el-radio-group :model-value="listType" @update:model-value="handleListTypeChange">
          <el-radio label="whitelist">白名单</el-radio>
          <el-radio label="blacklist">黑名单</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="listType === 'whitelist' ? '白名单域名' : '黑名单域名'">
        <el-input
          :model-value="domainListInput"
          @update:model-value="handleDomainListInput"
          type="textarea"
          :rows="3"
          :placeholder="'每行一个域名，如 xx.com、*.xx.com'"
        />
        <div class="form-tip">每行一个，支持 * 通配</div>
      </el-form-item>
      <el-form-item label="拒绝时的提示">
        <el-input
          :model-value="message"
          @update:model-value="(v) => apply({ message: (v && v.trim()) || DEFAULT_MESSAGE })"
          placeholder="默认：Your referer host is not allowed"
        />
      </el-form-item>
      <el-form-item label="无 Referer 时放行">
        <el-switch :model-value="bypassMissing" @update:model-value="(v) => apply({ bypass_missing: v })" />
        <div class="form-tip">无 Referer 或格式有误时跳过检查</div>
      </el-form-item>
    </template>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { isPluginEnabled, setPluginEnabled } from '@/utils/plugin'
import { usePluginConfig } from '@/composables/usePluginConfig'

const DEFAULT_MESSAGE = 'Your referer host is not allowed'

const props = defineProps({
  modelValue: { type: Object, default: () => ({}) },
  resourceType: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
const { config, updateConfig } = usePluginConfig(props, emit)

const enabled = computed(() => isPluginEnabled(config.value))
const whitelist = computed(() => config.value.whitelist || [])
const blacklist = computed(() => config.value.blacklist || [])

const listType = computed(() => {
  if (Array.isArray(config.value.whitelist) && config.value.whitelist.length > 0) return 'whitelist'
  if (Array.isArray(config.value.blacklist) && config.value.blacklist.length > 0) return 'blacklist'
  if (Array.isArray(config.value.blacklist)) return 'blacklist'
  return 'whitelist'
})

const domainListInput = computed(() => {
  const list = listType.value === 'whitelist' ? whitelist.value : blacklist.value
  return Array.isArray(list) ? list.join('\n') : ''
})

const message = computed(() => config.value.message ?? DEFAULT_MESSAGE)
const bypassMissing = computed(() => config.value.bypass_missing ?? false)

function apply(partial) {
  const cfg = { ...config.value, ...partial }
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

function arrFromLines(lines) {
  return (lines || '').split('\n').map(s => s.trim()).filter(Boolean)
}

function buildList(type, lines) {
  const cfg = { ...config.value }
  if (type === 'whitelist') {
    cfg.whitelist = arrFromLines(lines)
    delete cfg.blacklist
  } else {
    cfg.blacklist = arrFromLines(lines)
    delete cfg.whitelist
  }
  return cfg
}

function handleEnableChange(value) {
  const cfg = value
    ? { ...buildList(listType.value, domainListInput.value), message: message.value || DEFAULT_MESSAGE, bypass_missing: bypassMissing.value }
    : { ...config.value }
  setPluginEnabled(cfg, value)
  updateConfig(cfg)
}

function handleListTypeChange(value) {
  const cfg = buildList(value, domainListInput.value)
  cfg.message = message.value || DEFAULT_MESSAGE
  cfg.bypass_missing = bypassMissing.value
  setPluginEnabled(cfg, enabled.value)
  updateConfig(cfg)
}

function handleDomainListInput(value) {
  const cfg = buildList(listType.value, value)
  cfg.message = message.value || DEFAULT_MESSAGE
  cfg.bypass_missing = bypassMissing.value
  setPluginEnabled(cfg, enabled.value)
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
